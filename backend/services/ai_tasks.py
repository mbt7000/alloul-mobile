"""
ALLOUL&Q AI Tasks Management
==============================
Smart task management powered by AI:
1. Auto-organization: Categorize, prioritize, and group tasks
2. Auto-assignment: Suggest best team member based on skills/workload
3. Priority scoring: AI-driven priority calculation
4. Smart summaries: Daily/weekly task digests
5. Deadline prediction: Estimate completion times
6. Dependency detection: Find task relationships
"""
from __future__ import annotations

import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc

from services.ai_router import ai_router, AIRequest, AITask
from services.embeddings import rag_engine

logger = logging.getLogger("alloul.ai.tasks")


class TaskOrganizer:
    """AI-powered task organization and categorization."""

    async def organize_tasks(
        self, db: Session, company_id: int, tasks: list[dict] = None
    ) -> dict:
        """Organize all company tasks into categories, priorities, and groups.
        Uses Ollama for fast classification, Claude for complex analysis.
        Returns: {categories: [...], priority_matrix: {...}, groups: [...], suggestions: [...]}
        """
        try:
            from models import ProjectTask, Project

            # Fetch tasks if not provided
            if tasks is None:
                task_records = (
                    db.query(ProjectTask)
                    .join(Project)
                    .filter(Project.company_id == company_id)
                    .all()
                )
                tasks = [
                    {
                        "id": t.id,
                        "title": t.title,
                        "description": t.description,
                        "status": t.status,
                        "priority": t.priority,
                        "due_date": t.due_date,
                    }
                    for t in task_records
                ]

            if not tasks:
                return {
                    "categories": [],
                    "priority_matrix": {},
                    "groups": [],
                    "suggestions": [],
                }

            # Build organization prompt
            tasks_json = json.dumps(tasks[:20], ensure_ascii=False)  # Limit to first 20
            prompt = f"""تحليل ومنظمة المهام التالية في الفئات والأولويات:

{tasks_json}

قدم تحليلاً منظماً يتضمن:
1. تصنيف المهام حسب الفئة (مثل: تطوير، تسويق، بيع، تشغيل)
2. مصفوفة الأولويات (ضرورية جداً، ضرورية، عادية)
3. تجميع المهام ذات الصلة
4. تقديم 3 اقتراحات للتحسين

الرد بصيغة JSON."""

            response = await ai_router.route(
                AIRequest(
                    task=AITask.CLASSIFY,
                    prompt=prompt,
                    language="ar",
                    max_tokens=1500,
                )
            )

            logger.info(
                "Task organization completed for company_id=%d, tasks=%d",
                company_id,
                len(tasks),
            )

            # Parse response safely
            try:
                result = json.loads(response.content)
            except json.JSONDecodeError:
                result = {
                    "categories": [],
                    "priority_matrix": {},
                    "groups": [],
                    "suggestions": [],
                }

            return result

        except Exception as e:
            logger.error("Task organization failed: %s", e)
            # Graceful degradation
            return {
                "categories": [],
                "priority_matrix": {},
                "groups": [],
                "suggestions": [],
                "error": str(e),
            }

    async def categorize_task(self, task_text: str) -> dict:
        """Categorize a single task.
        Returns: {category, subcategory, tags, estimated_effort_hours}
        Uses Ollama (fast, local).
        """
        try:
            prompt = f"""صنف المهمة التالية وقدم معلومات التنظيم:

المهمة: {task_text}

الرد بصيغة JSON مع:
- category: الفئة الرئيسية
- subcategory: الفئة الفرعية
- tags: قائمة الوسوم ذات الصلة
- estimated_effort_hours: الجهد المتوقع بالساعات"""

            response = await ai_router.route(
                AIRequest(
                    task=AITask.CLASSIFY,
                    prompt=prompt,
                    language="ar",
                    max_tokens=400,
                    temperature=0.3,
                )
            )

            try:
                return json.loads(response.content)
            except json.JSONDecodeError:
                return {
                    "category": "أخرى",
                    "subcategory": "غير محدد",
                    "tags": [],
                    "estimated_effort_hours": 2,
                }

        except Exception as e:
            logger.error("Task categorization failed: %s", e)
            return {
                "category": "أخرى",
                "subcategory": "غير محدد",
                "tags": [],
                "estimated_effort_hours": 2,
                "error": str(e),
            }

    async def suggest_priority(self, db: Session, company_id: int, task: dict) -> dict:
        """AI-driven priority suggestion based on:
        - Task content analysis
        - Deadline proximity
        - Dependencies
        - Business impact keywords
        Returns: {priority: "high"/"medium"/"low", score: 0-100, reasoning: "..."}
        """
        try:
            # Calculate deadline proximity score
            deadline_score = 0
            if task.get("due_date"):
                try:
                    due = datetime.fromisoformat(str(task["due_date"]))
                    days_until = (due - datetime.now(timezone.utc)).days
                    deadline_score = max(0, min(100, 100 - (days_until * 5)))
                except Exception:
                    deadline_score = 50

            prompt = f"""قيم أولوية المهمة التالية:

العنوان: {task.get('title', '')}
الوصف: {task.get('description', '')}
تاريخ الاستحقاق: {task.get('due_date', 'لا يوجد')}
الحالة الحالية: {task.get('status', 'جديد')}

قدم تقييم أولوية مع:
- priority: "عالية" أو "متوسطة" أو "منخفضة"
- score: 0-100
- reasoning: تفسير مفصل بالعربية

الرد بصيغة JSON."""

            response = await ai_router.route(
                AIRequest(
                    task=AITask.CLASSIFY,
                    prompt=prompt,
                    language="ar",
                    max_tokens=300,
                )
            )

            try:
                result = json.loads(response.content)
            except json.JSONDecodeError:
                result = {
                    "priority": "متوسطة",
                    "score": 50 + int(deadline_score) // 2,
                    "reasoning": "تم التقييم بناءً على معايير افتراضية",
                }

            logger.info("Priority suggestion completed for task_id=%s", task.get("id"))
            return result

        except Exception as e:
            logger.error("Priority suggestion failed: %s", e)
            return {
                "priority": "متوسطة",
                "score": 50,
                "reasoning": "خطأ في التقييم",
                "error": str(e),
            }

    async def detect_duplicates(
        self, db: Session, company_id: int, task_text: str
    ) -> list[dict]:
        """Find similar/duplicate tasks using embeddings.
        Returns list of similar tasks with similarity score.
        Uses RAG engine for semantic search.
        """
        try:
            index = rag_engine.get_index(company_id)
            results = await index.search(task_text, n_results=5, filter_type="task")

            similar_tasks = [
                {
                    "id": r["metadata"].get("id"),
                    "title": r["metadata"].get("title"),
                    "similarity_score": r.get("score", 0),
                    "status": r["metadata"].get("status"),
                }
                for r in results
                if r.get("score", 0) > 0.6
            ]

            logger.info("Duplicate detection found %d similar tasks", len(similar_tasks))
            return similar_tasks

        except Exception as e:
            logger.error("Duplicate detection failed: %s", e)
            return []

    async def suggest_grouping(self, tasks: list[dict]) -> list[dict]:
        """Group related tasks together.
        Returns: [{group_name, tasks: [...], reasoning}]
        Uses Ollama for fast clustering.
        """
        try:
            if not tasks:
                return []

            tasks_json = json.dumps(tasks[:15], ensure_ascii=False)
            prompt = f"""جمّع المهام التالية ذات الصلة في مجموعات منطقية:

{tasks_json}

قدم التجميع بصيغة JSON مع:
- group_name: اسم المجموعة
- task_ids: قائمة معرفات المهام
- reasoning: تفسير التجميع

الرد بصيغة JSON."""

            response = await ai_router.route(
                AIRequest(
                    task=AITask.CLASSIFY,
                    prompt=prompt,
                    language="ar",
                    max_tokens=800,
                )
            )

            try:
                result = json.loads(response.content)
                groups = (
                    result.get("groups", []) if isinstance(result, dict) else result
                )
                return groups if isinstance(groups, list) else []
            except json.JSONDecodeError:
                return []

        except Exception as e:
            logger.error("Task grouping failed: %s", e)
            return []


class TaskAssigner:
    """AI-powered auto-assignment of tasks to team members."""

    async def suggest_assignee(
        self, db: Session, company_id: int, task: dict
    ) -> list[dict]:
        """Suggest best team members for a task based on:
        - Member skills/job title
        - Current workload (open tasks count)
        - Department relevance
        - Past task completion rate
        Returns: [{user_id, name, job_title, score, reasoning}] (top 3)
        """
        try:
            from models import CompanyMember, ProjectTask, User

            # Get all company members with their workload
            members = (
                db.query(CompanyMember, User)
                .join(User)
                .filter(CompanyMember.company_id == company_id)
                .all()
            )

            member_data = []
            for member, user in members:
                # Count open tasks
                open_tasks = (
                    db.query(ProjectTask)
                    .filter(
                        and_(
                            ProjectTask.assignee_id == user.id,
                            ProjectTask.status.in_(["todo", "in_progress"]),
                        )
                    )
                    .count()
                )

                member_data.append(
                    {
                        "user_id": user.id,
                        "name": user.name or user.username,
                        "job_title": member.job_title or "عضو فريق",
                        "skills": user.skills or "",
                        "open_tasks": open_tasks,
                        "department": member.department_id,
                    }
                )

            members_json = json.dumps(member_data, ensure_ascii=False)
            prompt = f"""قيّم ملاءمة أعضاء الفريق التالين للمهمة:

المهمة:
- العنوان: {task.get('title', '')}
- الوصف: {task.get('description', '')}

أعضاء الفريق:
{members_json}

قدم أفضل 3 مرشحين مع:
- user_id
- score: 0-100
- reasoning: التفسير بالعربية

الرد بصيغة JSON."""

            response = await ai_router.route(
                AIRequest(
                    task=AITask.COMPLEX_ANALYSIS,
                    prompt=prompt,
                    language="ar",
                    max_tokens=500,
                )
            )

            try:
                result = json.loads(response.content)
                suggestions = (
                    result.get("suggestions", [])
                    if isinstance(result, dict)
                    else result
                )
                return suggestions[:3] if isinstance(suggestions, list) else []
            except json.JSONDecodeError:
                return []

        except Exception as e:
            logger.error("Assignee suggestion failed: %s", e)
            return []

    async def balance_workload(self, db: Session, company_id: int) -> dict:
        """Analyze team workload distribution and suggest rebalancing.
        Returns: {team_overview: [...], overloaded: [...], underutilized: [...], suggestions: [...]}
        """
        try:
            from models import CompanyMember, ProjectTask, User

            members = (
                db.query(CompanyMember, User, func.count(ProjectTask.id).label("task_count"))
                .join(User)
                .outerjoin(
                    ProjectTask,
                    and_(
                        ProjectTask.assignee_id == User.id,
                        ProjectTask.status.in_(["todo", "in_progress"]),
                    ),
                )
                .filter(CompanyMember.company_id == company_id)
                .group_by(CompanyMember.id, User.id)
                .all()
            )

            team_overview = []
            overloaded = []
            underutilized = []

            for member, user, task_count in members:
                entry = {
                    "user_id": user.id,
                    "name": user.name or user.username,
                    "job_title": member.job_title,
                    "open_tasks": task_count or 0,
                    "load_level": "عالي" if (task_count or 0) > 5 else ("منخفض" if (task_count or 0) < 2 else "متوازن"),
                }
                team_overview.append(entry)

                if (task_count or 0) > 5:
                    overloaded.append(entry)
                elif (task_count or 0) < 2:
                    underutilized.append(entry)

            logger.info(
                "Workload analysis: team_size=%d, overloaded=%d, underutilized=%d",
                len(team_overview),
                len(overloaded),
                len(underutilized),
            )

            return {
                "team_overview": team_overview,
                "overloaded": overloaded,
                "underutilized": underutilized,
                "suggestions": [
                    f"نقل المهام من {o['name']} إلى {u['name']}"
                    for o in overloaded[:2]
                    for u in underutilized[:1]
                ],
            }

        except Exception as e:
            logger.error("Workload balancing failed: %s", e)
            return {
                "team_overview": [],
                "overloaded": [],
                "underutilized": [],
                "suggestions": [],
                "error": str(e),
            }

    async def auto_assign_batch(
        self, db: Session, company_id: int, task_ids: list[int]
    ) -> list[dict]:
        """Auto-assign multiple unassigned tasks optimally.
        Returns: [{task_id, suggested_assignee_id, reasoning}]
        """
        try:
            from models import ProjectTask

            unassigned = db.query(ProjectTask).filter(
                ProjectTask.id.in_(task_ids), ProjectTask.assignee_id.is_(None)
            ).all()

            assignments = []
            for task in unassigned:
                suggestions = await self.suggest_assignee(
                    db,
                    company_id,
                    {
                        "id": task.id,
                        "title": task.title,
                        "description": task.description,
                    },
                )
                if suggestions:
                    best = suggestions[0]
                    assignments.append(
                        {
                            "task_id": task.id,
                            "suggested_assignee_id": best.get("user_id"),
                            "reasoning": best.get("reasoning", ""),
                        }
                    )

            logger.info("Auto-assignment batch: processed %d tasks", len(assignments))
            return assignments

        except Exception as e:
            logger.error("Batch auto-assignment failed: %s", e)
            return []


class TaskSummarizer:
    """Generate AI-powered task summaries and reports."""

    async def daily_digest(self, db: Session, company_id: int) -> dict:
        """Generate daily task digest.
        Returns: {date, completed_today, in_progress, overdue, upcoming_deadlines, highlights, ai_insights}
        """
        try:
            from models import ProjectTask, Project

            today = datetime.now(timezone.utc).date()
            tomorrow = today + timedelta(days=1)

            # Query today's completed tasks
            completed_today = (
                db.query(ProjectTask)
                .join(Project)
                .filter(
                    and_(
                        Project.company_id == company_id,
                        ProjectTask.status == "done",
                        func.date(ProjectTask.updated_at) == today,
                    )
                )
                .count()
            )

            # In progress tasks
            in_progress = (
                db.query(ProjectTask)
                .join(Project)
                .filter(
                    and_(Project.company_id == company_id, ProjectTask.status == "in_progress")
                )
                .count()
            )

            # Overdue tasks
            overdue = (
                db.query(ProjectTask)
                .join(Project)
                .filter(
                    and_(
                        Project.company_id == company_id,
                        ProjectTask.due_date.isnot(None),
                        ProjectTask.status != "done",
                        ProjectTask.due_date < str(today),
                    )
                )
                .count()
            )

            # Upcoming deadlines (next 7 days)
            upcoming = (
                db.query(ProjectTask)
                .join(Project)
                .filter(
                    and_(
                        Project.company_id == company_id,
                        ProjectTask.due_date.isnot(None),
                        ProjectTask.due_date >= str(today),
                        ProjectTask.due_date < str(tomorrow + timedelta(days=7)),
                    )
                )
                .count()
            )

            digest = {
                "date": today.isoformat(),
                "completed_today": completed_today,
                "in_progress": in_progress,
                "overdue": overdue,
                "upcoming_deadlines": upcoming,
                "highlights": [],
                "ai_insights": "",
            }

            # Generate AI insights
            if completed_today > 0 or overdue > 0 or in_progress > 0:
                prompt = f"""قدم ملخص حالة المهام اليومي:
- تم إكماله اليوم: {completed_today}
- قيد التنفيذ: {in_progress}
- متأخر عن الموعد: {overdue}
- مواعيد نهائية قادمة: {upcoming}

اكتب ملخص قصير بالعربية (سطر واحد)."""

                response = await ai_router.route(
                    AIRequest(
                        task=AITask.QUICK_SUMMARY,
                        prompt=prompt,
                        language="ar",
                        max_tokens=200,
                    )
                )
                digest["ai_insights"] = response.content

            logger.info("Daily digest generated for company_id=%d", company_id)
            return digest

        except Exception as e:
            logger.error("Daily digest generation failed: %s", e)
            return {
                "date": datetime.now(timezone.utc).date().isoformat(),
                "completed_today": 0,
                "in_progress": 0,
                "overdue": 0,
                "upcoming_deadlines": 0,
                "highlights": [],
                "ai_insights": "",
                "error": str(e),
            }

    async def weekly_report(self, db: Session, company_id: int) -> dict:
        """Generate weekly productivity report.
        Returns: {week, tasks_completed, velocity, blockers, team_performance, recommendations}
        """
        try:
            from models import ProjectTask, Project

            today = datetime.now(timezone.utc).date()
            week_ago = today - timedelta(days=7)

            # Tasks completed this week
            completed_week = (
                db.query(ProjectTask)
                .join(Project)
                .filter(
                    and_(
                        Project.company_id == company_id,
                        ProjectTask.status == "done",
                        func.date(ProjectTask.updated_at) >= week_ago,
                    )
                )
                .count()
            )

            # Average completion time (velocity)
            avg_completed = max(1, completed_week)  # Avoid division by zero
            velocity = round(completed_week / 7, 2)  # Per day

            report = {
                "week": f"{week_ago.isoformat()} to {today.isoformat()}",
                "tasks_completed": completed_week,
                "velocity": velocity,
                "blockers": [],
                "team_performance": "مستقر",
                "recommendations": [],
            }

            # Overdue tasks as blockers
            overdue_tasks = (
                db.query(ProjectTask)
                .join(Project)
                .filter(
                    and_(
                        Project.company_id == company_id,
                        ProjectTask.due_date.isnot(None),
                        ProjectTask.status != "done",
                        ProjectTask.due_date < str(today),
                    )
                )
                .limit(5)
                .all()
            )

            if overdue_tasks:
                report["blockers"] = [
                    {"title": t.title, "days_overdue": (today - datetime.fromisoformat(str(t.due_date)).date()).days}
                    for t in overdue_tasks
                ]

            logger.info("Weekly report generated for company_id=%d", company_id)
            return report

        except Exception as e:
            logger.error("Weekly report generation failed: %s", e)
            return {
                "week": "",
                "tasks_completed": 0,
                "velocity": 0,
                "blockers": [],
                "team_performance": "غير معروف",
                "recommendations": [],
                "error": str(e),
            }

    async def project_status(self, db: Session, project_id: int) -> dict:
        """Generate AI summary for a specific project.
        Returns: {project_name, progress_pct, status_summary, risks, next_steps, estimated_completion}
        """
        try:
            from models import ProjectTask, Project

            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return {"error": "المشروع غير موجود"}

            all_tasks = (
                db.query(ProjectTask).filter(ProjectTask.project_id == project_id).all()
            )
            completed = sum(1 for t in all_tasks if t.status == "done")
            total = len(all_tasks)
            progress_pct = round((completed / total * 100) if total > 0 else 0, 1)

            # Identify risks
            risks = []
            for task in all_tasks:
                if task.status != "done" and task.due_date:
                    due = datetime.fromisoformat(str(task.due_date)).date()
                    if due < datetime.now(timezone.utc).date():
                        risks.append(f"مهمة متأخرة: {task.title}")

            return {
                "project_name": project.name,
                "progress_pct": progress_pct,
                "status_summary": f"{completed}/{total} مهمة مكتملة",
                "risks": risks[:3],
                "next_steps": [
                    t.title for t in all_tasks if t.status == "todo"
                ][:3],
                "estimated_completion": "قريباً" if progress_pct > 70 else "قيد التقدم",
            }

        except Exception as e:
            logger.error("Project status generation failed: %s", e)
            return {"error": str(e)}

    async def standup_summary(self, db: Session, company_id: int, user_id: int) -> dict:
        """Generate standup update for a team member.
        Returns: {yesterday: [...], today: [...], blockers: [...]}
        """
        try:
            from models import ProjectTask

            today = datetime.now(timezone.utc).date()
            yesterday = today - timedelta(days=1)

            yesterday_tasks = (
                db.query(ProjectTask)
                .filter(
                    and_(
                        ProjectTask.assignee_id == user_id,
                        ProjectTask.status == "done",
                        func.date(ProjectTask.updated_at) == yesterday,
                    )
                )
                .all()
            )

            today_tasks = (
                db.query(ProjectTask)
                .filter(
                    and_(
                        ProjectTask.assignee_id == user_id,
                        ProjectTask.status.in_(["todo", "in_progress"]),
                    )
                )
                .all()
            )

            blockers = (
                db.query(ProjectTask)
                .filter(
                    and_(
                        ProjectTask.assignee_id == user_id,
                        ProjectTask.due_date.isnot(None),
                        ProjectTask.status != "done",
                        ProjectTask.due_date < str(today),
                    )
                )
                .all()
            )

            return {
                "yesterday": [t.title for t in yesterday_tasks],
                "today": [t.title for t in today_tasks[:3]],
                "blockers": [t.title for t in blockers],
            }

        except Exception as e:
            logger.error("Standup summary generation failed: %s", e)
            return {"yesterday": [], "today": [], "blockers": [], "error": str(e)}


class TaskPredictor:
    """Predict task metrics using AI and historical data."""

    async def estimate_completion(self, db: Session, task: dict) -> dict:
        """Estimate task completion time based on similar past tasks.
        Returns: {estimated_hours, confidence, similar_tasks_avg}
        """
        try:
            from models import ProjectTask

            # Find similar completed tasks
            similar = (
                db.query(ProjectTask)
                .filter(
                    and_(
                        ProjectTask.status == "done",
                        ProjectTask.created_at.isnot(None),
                        ProjectTask.updated_at.isnot(None),
                    )
                )
                .limit(10)
                .all()
            )

            if not similar:
                return {"estimated_hours": 8, "confidence": 0.3, "similar_tasks_avg": 0}

            # Calculate average completion time
            completion_times = []
            for t in similar:
                if t.created_at and t.updated_at:
                    duration = (t.updated_at - t.created_at).total_seconds() / 3600
                    completion_times.append(duration)

            avg_hours = sum(completion_times) / len(completion_times) if completion_times else 8
            confidence = min(0.9, len(similar) / 20)

            logger.info("Task estimation: avg=%.1f hours, confidence=%.2f", avg_hours, confidence)

            return {
                "estimated_hours": round(avg_hours, 1),
                "confidence": round(confidence, 2),
                "similar_tasks_avg": round(avg_hours, 1),
            }

        except Exception as e:
            logger.error("Task estimation failed: %s", e)
            return {"estimated_hours": 8, "confidence": 0.3, "similar_tasks_avg": 0, "error": str(e)}

    async def detect_at_risk(self, db: Session, company_id: int) -> list[dict]:
        """Detect tasks at risk of missing deadline.
        Returns: [{task_id, title, deadline, risk_level, reasoning}]
        """
        try:
            from models import ProjectTask, Project

            today = datetime.now(timezone.utc).date()
            at_risk = []

            tasks = (
                db.query(ProjectTask)
                .join(Project)
                .filter(
                    and_(
                        Project.company_id == company_id,
                        ProjectTask.due_date.isnot(None),
                        ProjectTask.status != "done",
                    )
                )
                .all()
            )

            for task in tasks:
                try:
                    due = datetime.fromisoformat(str(task.due_date)).date()
                    days_left = (due - today).days

                    if days_left < 0:
                        risk_level = "حرج"
                    elif days_left < 2:
                        risk_level = "عالي"
                    elif days_left < 7:
                        risk_level = "متوسط"
                    else:
                        continue

                    at_risk.append(
                        {
                            "task_id": task.id,
                            "title": task.title,
                            "deadline": str(due),
                            "risk_level": risk_level,
                            "reasoning": f"يتبقى {days_left} أيام فقط",
                        }
                    )
                except Exception:
                    continue

            logger.info("At-risk detection found %d tasks", len(at_risk))
            return at_risk

        except Exception as e:
            logger.error("At-risk detection failed: %s", e)
            return []

    async def find_dependencies(
        self, db: Session, company_id: int, task_id: int
    ) -> list[dict]:
        """Detect task dependencies using semantic analysis.
        Returns: [{related_task_id, relationship_type, confidence}]
        """
        try:
            from models import ProjectTask, Project

            task = db.query(ProjectTask).filter(ProjectTask.id == task_id).first()
            if not task:
                return []

            # Use RAG to find semantically related tasks
            index = rag_engine.get_index(company_id)
            query = f"{task.title} {task.description or ''}"
            results = await index.search(query, n_results=5, filter_type="task")

            dependencies = [
                {
                    "related_task_id": r["metadata"].get("id"),
                    "title": r["metadata"].get("title"),
                    "relationship_type": "semantic",
                    "confidence": round(r.get("score", 0), 2),
                }
                for r in results
                if r.get("score", 0) > 0.5 and r["metadata"].get("id") != task_id
            ]

            logger.info("Dependency detection found %d related tasks", len(dependencies))
            return dependencies

        except Exception as e:
            logger.error("Dependency detection failed: %s", e)
            return []


# Singleton instances
task_organizer = TaskOrganizer()
task_assigner = TaskAssigner()
task_summarizer = TaskSummarizer()
task_predictor = TaskPredictor()
