"""
Agent Integration Router - ⭐ PROMPT 7
الاتصال الذكي للوكيل مع جميع الخدمات
Connect AI Agent with all business services and automated workflows
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..tenant import CurrentTenant, get_tenant_context
from ..service_utils import (
    log_activity,
    OperationAction,
    AccessDeniedError,
    ResourceNotFoundError,
    ValidationError,
    PaginatedResponse,
    paginate,
    Role,
    can_perform_action,
    TimestampedResponse,
)
from ..ai_agent import (
    AIAgent,
    AgentRequest,
    AgentResponse,
    AgentContext,
    ReasoningTrace,
    TaskState,
    ReasoningStep,
)
from ..query_filters import scope_query_by_company

router = APIRouter(prefix="/agent", tags=["agent-integration"])


# Models for agent-assisted operations
class ProjectAnalysisRequest(TimestampedResponse):
    project_id: str
    query: str
    context: Optional[Dict[str, Any]] = None
    include_recommendations: bool = True


class TaskBreakdownRequest(TimestampedResponse):
    task_id: str
    query: str
    suggest_subtasks: bool = True
    suggest_automation: bool = True


class AutomationSuggestionRequest(TimestampedResponse):
    entity_type: str  # "project", "task", "channel", "workflow"
    entity_id: str
    query: str


class AgentInsightResponse(TimestampedResponse):
    insight_id: str
    entity_type: str
    entity_id: str
    analysis: str
    recommendations: List[Dict[str, Any]]
    confidence_score: float
    reasoning_steps: List[Dict[str, Any]]
    suggested_actions: List[Dict[str, Any]]


# =====================================================================
# ENDPOINT 1: Project Intelligent Analysis
# تحليل المشروع الذكي
# =====================================================================
@router.post("/analyze-project", response_model=AgentInsightResponse)
async def analyze_project_with_ai(
    request: ProjectAnalysisRequest,
    background_tasks: BackgroundTasks,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Analyze a project using AI Agent:
    - Understand project scope and goals
    - Identify risks and opportunities
    - Suggest optimization strategies
    - Recommend resource allocation
    
    تحليل المشروع باستخدام وكيل ذكي
    """
    # Verify project access
    project = db.query("projects").filter(
        project.id == request.project_id,
        project.company_id == tenant.company_id
    ).first()

    if not project:
        raise ResourceNotFoundError(f"Project {request.project_id} not found")

    # Build AI Agent request
    agent_request = AgentRequest(
        query=request.query or f"Analyze project {project.name} and provide insights",
        context={
            **(request.context or {}),
            "project_id": request.project_id,
            "project_name": project.name,
            "company_id": tenant.company_id,
            "user_id": tenant.user.id,
            "entity_type": "project",
        },
        tools=["analyze", "break_down", "plan"],
        max_iterations=5,
    )

    # Create agent context
    agent_context = AgentContext(
        user_id=tenant.user.id,
        company_id=tenant.company_id,
        request=agent_request,
        reasoning_trace=[],
        errors=[],
    )

    # Run AI Agent
    agent = AIAgent()
    result = await agent.run(agent_context)

    # Log the analysis
    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.CREATE,
        "ProjectAnalysis",
        request.project_id,
        {
            "query": request.query,
            "status": result.get("status"),
            "confidence": result.get("solution", {}).get("confidence", 0),
        },
    )

    # Extract insights and recommendations
    solution = result.get("solution", {})
    reasoning_steps = result.get("reasoning_steps", [])

    # Format suggestions for display
    suggested_actions = []
    if request.include_recommendations and "recommendations" in solution:
        for rec in solution.get("recommendations", []):
            suggested_actions.append({
                "action": rec.get("action", ""),
                "priority": rec.get("priority", "medium"),
                "impact": rec.get("impact", ""),
            })

    import uuid
    insight_id = str(uuid.uuid4())

    # Store analysis in background
    background_tasks.add_task(
        _store_agent_analysis,
        db,
        tenant.company_id,
        insight_id,
        "project",
        request.project_id,
        result,
    )

    return AgentInsightResponse(
        insight_id=insight_id,
        entity_type="project",
        entity_id=request.project_id,
        analysis=solution.get("analysis", ""),
        recommendations=solution.get("recommendations", []),
        confidence_score=solution.get("confidence", 0),
        reasoning_steps=[
            {
                "step": step.get("step", ""),
                "input": step.get("input", {}),
                "output": step.get("output", {}),
                "reasoning": step.get("reasoning", ""),
                "confidence": step.get("confidence", 0),
            }
            for step in reasoning_steps
        ],
        suggested_actions=suggested_actions,
    )


# =====================================================================
# ENDPOINT 2: Intelligent Task Breakdown
# تقسيم المهام الذكي
# =====================================================================
@router.post("/breakdown-task", response_model=AgentInsightResponse)
async def breakdown_task_with_ai(
    request: TaskBreakdownRequest,
    background_tasks: BackgroundTasks,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Use AI Agent to intelligently break down a task:
    - Suggest optimal subtasks
    - Identify dependencies
    - Estimate effort
    - Recommend automation opportunities
    
    استخدم الوكيل الذكي لتقسيم المهام بذكاء
    """
    # Verify task access
    task = db.query("tasks").filter(
        task.id == request.task_id,
        task.company_id == tenant.company_id
    ).first()

    if not task:
        raise ResourceNotFoundError(f"Task {request.task_id} not found")

    # Build AI Agent request
    agent_request = AgentRequest(
        query=request.query or f"Break down task {task.title} into optimal subtasks",
        context={
            "task_id": request.task_id,
            "task_title": task.title,
            "task_description": task.description,
            "company_id": tenant.company_id,
            "user_id": tenant.user.id,
            "entity_type": "task",
            "suggest_subtasks": request.suggest_subtasks,
            "suggest_automation": request.suggest_automation,
        },
        tools=["break_down", "plan", "execute"],
        max_iterations=5,
    )

    # Run AI Agent
    agent = AIAgent()
    agent_context = AgentContext(
        user_id=tenant.user.id,
        company_id=tenant.company_id,
        request=agent_request,
        reasoning_trace=[],
        errors=[],
    )

    result = await agent.run(agent_context)

    # Log the breakdown
    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.CREATE,
        "TaskBreakdown",
        request.task_id,
        {
            "query": request.query,
            "suggested_subtasks": len(result.get("task_results", {}).get("subtasks", [])),
        },
    )

    solution = result.get("solution", {})
    reasoning_steps = result.get("reasoning_steps", [])

    # Extract subtasks from solution
    subtasks = solution.get("subtasks", [])
    suggested_actions = [
        {
            "action": f"Create subtask: {st.get('title', '')}",
            "priority": st.get("priority", "medium"),
            "effort": st.get("effort_estimate", ""),
            "assignee_suggestion": st.get("suggested_assignee", ""),
        }
        for st in subtasks
    ]

    import uuid
    insight_id = str(uuid.uuid4())

    background_tasks.add_task(
        _store_agent_analysis,
        db,
        tenant.company_id,
        insight_id,
        "task",
        request.task_id,
        result,
    )

    return AgentInsightResponse(
        insight_id=insight_id,
        entity_type="task",
        entity_id=request.task_id,
        analysis=solution.get("analysis", ""),
        recommendations=solution.get("recommendations", []),
        confidence_score=solution.get("confidence", 0),
        reasoning_steps=[
            {
                "step": step.get("step", ""),
                "input": step.get("input", {}),
                "output": step.get("output", {}),
                "reasoning": step.get("reasoning", ""),
                "confidence": step.get("confidence", 0),
            }
            for step in reasoning_steps
        ],
        suggested_actions=suggested_actions,
    )


# =====================================================================
# ENDPOINT 3: Automation Opportunity Detection
# الكشف عن فرص الأتمتة
# =====================================================================
@router.post("/suggest-automation", response_model=AgentInsightResponse)
async def suggest_automation_with_ai(
    request: AutomationSuggestionRequest,
    background_tasks: BackgroundTasks,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Detect automation opportunities using AI Agent:
    - Identify repetitive patterns
    - Suggest workflow automation
    - Recommend integration points
    - Calculate ROI of automation
    
    الكشف عن فرص الأتمتة باستخدام الوكيل الذكي
    """
    # Verify entity access and get entity data
    if request.entity_type == "project":
        entity = db.query("projects").filter(
            projects.id == request.entity_id,
            projects.company_id == tenant.company_id
        ).first()
    elif request.entity_type == "task":
        entity = db.query("tasks").filter(
            tasks.id == request.entity_id,
            tasks.company_id == tenant.company_id
        ).first()
    elif request.entity_type == "channel":
        entity = db.query("channels").filter(
            channels.id == request.entity_id,
            channels.company_id == tenant.company_id
        ).first()
    else:
        raise ValidationError(f"Unknown entity type: {request.entity_type}")

    if not entity:
        raise ResourceNotFoundError(f"{request.entity_type} {request.entity_id} not found")

    # Build AI Agent request
    agent_request = AgentRequest(
        query=request.query or f"Suggest automation opportunities for {request.entity_type}",
        context={
            "entity_type": request.entity_type,
            "entity_id": request.entity_id,
            "entity_name": entity.name if hasattr(entity, "name") else entity.title,
            "company_id": tenant.company_id,
            "user_id": tenant.user.id,
        },
        tools=["analyze", "plan", "break_down"],
        max_iterations=5,
    )

    # Run AI Agent
    agent = AIAgent()
    agent_context = AgentContext(
        user_id=tenant.user.id,
        company_id=tenant.company_id,
        request=agent_request,
        reasoning_trace=[],
        errors=[],
    )

    result = await agent.run(agent_context)

    # Log the suggestion
    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.CREATE,
        "AutomationSuggestion",
        request.entity_id,
        {
            "entity_type": request.entity_type,
            "query": request.query,
        },
    )

    solution = result.get("solution", {})
    reasoning_steps = result.get("reasoning_steps", [])

    # Extract automation opportunities
    opportunities = solution.get("automation_opportunities", [])
    suggested_actions = [
        {
            "action": f"Implement: {opp.get('title', '')}",
            "description": opp.get("description", ""),
            "effort": opp.get("implementation_effort", ""),
            "roi_estimate": opp.get("roi_estimate", ""),
            "timeline": opp.get("timeline", ""),
        }
        for opp in opportunities
    ]

    import uuid
    insight_id = str(uuid.uuid4())

    background_tasks.add_task(
        _store_agent_analysis,
        db,
        tenant.company_id,
        insight_id,
        request.entity_type,
        request.entity_id,
        result,
    )

    return AgentInsightResponse(
        insight_id=insight_id,
        entity_type=request.entity_type,
        entity_id=request.entity_id,
        analysis=solution.get("analysis", ""),
        recommendations=solution.get("recommendations", []),
        confidence_score=solution.get("confidence", 0),
        reasoning_steps=[
            {
                "step": step.get("step", ""),
                "input": step.get("input", {}),
                "output": step.get("output", {}),
                "reasoning": step.get("reasoning", ""),
                "confidence": step.get("confidence", 0),
            }
            for step in reasoning_steps
        ],
        suggested_actions=suggested_actions,
    )


# =====================================================================
# ENDPOINT 4: Intelligent Problem Solving
# حل المشاكل الذكي
# =====================================================================
@router.post("/solve-problem", response_model=AgentInsightResponse)
async def solve_problem_with_ai(
    request: AgentRequest,
    background_tasks: BackgroundTasks,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Use AI Agent for intelligent problem solving:
    - Understand the problem
    - Break it down into components
    - Plan a solution
    - Execute and validate
    
    استخدام الوكيل الذكي لحل المشاكل بذكاء
    """
    # Add company context
    request.context = {
        **(request.context or {}),
        "company_id": tenant.company_id,
        "user_id": tenant.user.id,
    }

    # Run AI Agent
    agent = AIAgent()
    agent_context = AgentContext(
        user_id=tenant.user.id,
        company_id=tenant.company_id,
        request=request,
        reasoning_trace=[],
        errors=[],
    )

    result = await agent.run(agent_context)

    # Log the problem solving
    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.CREATE,
        "ProblemSolution",
        tenant.user.id,
        {
            "query": request.query,
            "status": result.get("status"),
        },
    )

    solution = result.get("solution", {})
    reasoning_steps = result.get("reasoning_steps", [])

    import uuid
    insight_id = str(uuid.uuid4())

    background_tasks.add_task(
        _store_agent_analysis,
        db,
        tenant.company_id,
        insight_id,
        "problem",
        tenant.user.id,
        result,
    )

    return AgentInsightResponse(
        insight_id=insight_id,
        entity_type="problem",
        entity_id=tenant.user.id,
        analysis=solution.get("solution_narrative", ""),
        recommendations=solution.get("recommendations", []),
        confidence_score=solution.get("confidence", 0),
        reasoning_steps=[
            {
                "step": step.get("step", ""),
                "input": step.get("input", {}),
                "output": step.get("output", {}),
                "reasoning": step.get("reasoning", ""),
                "confidence": step.get("confidence", 0),
            }
            for step in reasoning_steps
        ],
        suggested_actions=solution.get("action_items", []),
    )


# =====================================================================
# ENDPOINT 5: Agent Capabilities Discovery
# اكتشاف قدرات الوكيل
# =====================================================================
@router.get("/capabilities")
async def get_agent_capabilities(
    tenant: CurrentTenant = Depends(get_tenant_context),
):
    """
    Get available AI Agent capabilities and tools
    الحصول على قدرات ودوات الوكيل الذكي المتاحة
    """
    return {
        "agent_version": "1.0.0",
        "reasoning_steps": [
            {
                "name": "UNDERSTAND",
                "description": "Understand the problem, extract intent and key entities",
            },
            {
                "name": "BREAK_DOWN",
                "description": "Break complex problems into manageable subtasks",
            },
            {
                "name": "PLAN",
                "description": "Create execution plan with task dependencies",
            },
            {
                "name": "EXECUTE",
                "description": "Execute planned tasks using available tools",
            },
            {
                "name": "VALIDATE",
                "description": "Validate solution against requirements",
            },
            {
                "name": "OPTIMIZE",
                "description": "Optimize solution for efficiency and effectiveness",
            },
        ],
        "available_tools": [
            {
                "name": "analyze",
                "description": "Analyze entities (projects, tasks, workflows) for insights",
            },
            {
                "name": "break_down",
                "description": "Break complex tasks into subtasks with dependencies",
            },
            {
                "name": "plan",
                "description": "Create execution plans with optimization",
            },
            {
                "name": "execute",
                "description": "Execute tasks with error handling and retries",
            },
            {
                "name": "validate",
                "description": "Validate solutions against requirements",
            },
            {
                "name": "optimize",
                "description": "Optimize solutions for performance and efficiency",
            },
        ],
        "supported_operations": [
            {
                "operation": "analyze-project",
                "description": "Intelligent project analysis and insights",
            },
            {
                "operation": "breakdown-task",
                "description": "Intelligent task decomposition",
            },
            {
                "operation": "suggest-automation",
                "description": "Automation opportunity detection",
            },
            {
                "operation": "solve-problem",
                "description": "General intelligent problem solving",
            },
        ],
        "limitations": [
            "Max iterations: 5 per request",
            "Confidence threshold: 0.6+",
            "Timeout: 30 seconds",
        ],
    }


# =====================================================================
# Background Task: Store Agent Analysis
# =====================================================================
async def _store_agent_analysis(
    db: Session,
    company_id: str,
    insight_id: str,
    entity_type: str,
    entity_id: str,
    agent_result: Dict[str, Any],
):
    """
    Store agent analysis results for future reference
    تخزين نتائج تحليل الوكيل للمراجعة المستقبلية
    """
    try:
        # In production, this would save to a database table
        # For now, just log it
        log_msg = {
            "type": "AgentAnalysisStored",
            "insight_id": insight_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "timestamp": datetime.utcnow().isoformat(),
            "status": agent_result.get("status"),
        }
        # Store log_msg to database or cache
        pass
    except Exception as e:
        # Log storage errors but don't fail the main request
        pass
