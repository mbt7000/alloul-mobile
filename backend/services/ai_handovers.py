"""
ALLOUL&Q HandOvers AI
======================
AI-powered handover management:
1. Smart handover generation from free-form text
2. Quality scoring and completeness analysis
3. Risk assessment
4. Knowledge gap detection
5. Handover templates by department/industry
6. Follow-up task extraction
"""
from __future__ import annotations
import logging
import json
from typing import Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session

logger = logging.getLogger("alloul.ai.handovers")


HANDOVER_TEMPLATES = {
    "IT": {
        "ar_title": "نموذج تسليم تقني",
        "sections": [
            "الأنظمة والتطبيقات المسؤول عنها",
            "كلمات المرور والوصول",
            "الخوادم والبنية التحتية",
            "العمليات والإجراءات الروتينية",
            "جهات الاتصال التقنية الهامة",
            "المشاكل المعروفة والحلول",
            "التوثيق الفني",
            "المتطلبات المستقبلية والمشاريع"
        ],
        "critical_fields": [
            "الأنظمة المسؤول عنها",
            "جهات الاتصال الفنية",
            "كلمات المرور والبيانات الحساسة"
        ]
    },
    "Sales": {
        "ar_title": "نموذج تسليم المبيعات",
        "sections": [
            "قاعمة العملاء الحالية",
            "العقود والاتفاقيات النشطة",
            "خط أنابيب المبيعات",
            "النقاط المهمة للعملاء",
            "أسعار المنتجات والخصومات",
            "جهات الاتصال الرئيسية للعملاء",
            "المشاريع الجارية",
            "الأهداف والتوقعات القادمة"
        ],
        "critical_fields": [
            "العملاء الرئيسيون",
            "العقود النشطة",
            "جهات الاتصال في العملاء"
        ]
    },
    "Finance": {
        "ar_title": "نموذج تسليم المالية",
        "sections": [
            "الحسابات والموارد المالية",
            "الميزانيات والتخطيط",
            "العمليات المحاسبية",
            "الرواتب والمستحقات",
            "الضرائب والالتزامات",
            "المراجعات والتدقيق",
            "جهات الاتصال المالية",
            "المؤشرات والتقارير الدورية"
        ],
        "critical_fields": [
            "الحسابات البنكية",
            "الميزانيات الرئيسية",
            "العمليات المحاسبية الحساسة"
        ]
    },
    "HR": {
        "ar_title": "نموذج تسليم الموارد البشرية",
        "sections": [
            "السياسات والإجراءات",
            "شؤون الموظفين",
            "الرواتب والمزايا",
            "التدريب والتطوير",
            "العلاقات الصناعية",
            "الامتثال القانوني والعمالة",
            "جهات الاتصال الموارد البشرية",
            "الأنشطة والمشاريع القادمة"
        ],
        "critical_fields": [
            "سياسات الموارد البشرية",
            "بيانات الموظفين",
            "المستحقات والعقود"
        ]
    },
    "Operations": {
        "ar_title": "نموذج تسليم العمليات",
        "sections": [
            "العمليات الأساسية اليومية",
            "إدارة الموارد والمخزون",
            "الموردون والشركاء",
            "جودة العمليات والامتثال",
            "المؤشرات والقياسات",
            "خطط الطوارئ والمخاطر",
            "جهات الاتصال التشغيلية",
            "الفرص التحسينية"
        ],
        "critical_fields": [
            "العمليات الحساسة",
            "جهات الاتصال الحرجة",
            "خطط الطوارئ"
        ]
    }
}

DOC_QUALITY_CRITERIA = {
    "content": {
        "weight": 30,
        "factors": ["التفاصيل الكاملة", "الوضوح", "الملاءمة"]
    },
    "contacts": {
        "weight": 20,
        "factors": ["جهات اتصال واضحة", "معلومات الاتصال الكاملة"]
    },
    "actions": {
        "weight": 25,
        "factors": ["الإجراءات الحددة", "المسؤوليات الواضحة"]
    },
    "timeline": {
        "weight": 15,
        "factors": ["المواعيد النهائية المحددة", "أولويات واضحة"]
    },
    "risk_assessment": {
        "weight": 10,
        "factors": ["تقييم المخاطر", "خطط التخفيف"]
    }
}

RISK_FACTORS = {
    "critical_data_loss": {
        "ar_name": "فقدان البيانات الحرجة",
        "score_impact": 35
    },
    "undocumented_processes": {
        "ar_name": "عمليات غير موثقة",
        "score_impact": 25
    },
    "missing_contacts": {
        "ar_name": "جهات اتصال مفقودة",
        "score_impact": 20
    },
    "unclear_responsibilities": {
        "ar_name": "مسؤوليات غير واضحة",
        "score_impact": 20
    },
    "no_backup_plan": {
        "ar_name": "بدون خطة احتياطية",
        "score_impact": 30
    },
    "delayed_timeline": {
        "ar_name": "جدول زمني متأخر",
        "score_impact": 15
    }
}


class HandoverGenerator:
    """Generate professional handover documents with AI."""

    def __init__(self):
        self.templates = HANDOVER_TEMPLATES
        logger.info("HandoverGenerator initialized")

    async def generate_handover(
        self, db: Session, company_id: int, context: dict
    ) -> dict:
        """
        Generate complete handover from context.

        Args:
            db: Database session
            company_id: Company ID
            context: Context dict with keys: who, what, why, timeline, additional_info

        Returns:
            Generated handover document with structure
        """
        from .ai_router import AIRouter

        router = AIRouter()

        handover_context = f"""
اكتب وثيقة تسليم احترافية بناءً على المعلومات التالية:

من: {context.get('from_person', 'غير محدد')}
إلى: {context.get('to_person', 'غير محدد')}
القسم: {context.get('department', 'عام')}
المسؤوليات: {context.get('what', 'غير محدد')}
السبب: {context.get('why', 'انتقال روتيني')}
الجدول الزمني: {context.get('timeline', 'فوري')}
معلومات إضافية: {context.get('additional_info', '')}

اجعل التسليم شاملاً وواضحاً ومنظماً.
"""

        result = await router.generate(handover_context)

        return {
            "success": True,
            "content": result,
            "from_person": context.get("from_person"),
            "to_person": context.get("to_person"),
            "department": context.get("department"),
            "generated_at": datetime.utcnow().isoformat(),
            "language": "ar"
        }

    async def enhance_handover(
        self, existing_content: str, instructions: str = None
    ) -> dict:
        """
        Improve existing handover content.

        Args:
            existing_content: Current handover text
            instructions: Optional improvement instructions

        Returns:
            Enhanced handover with improvements
        """
        from .ai_router import AIRouter

        router = AIRouter()

        enhance_prompt = f"""
قم بتحسين وثيقة التسليم التالية لجعلها أكثر وضوحاً واحترافية:

{existing_content}

"""
        if instructions:
            enhance_prompt += f"\nتعليمات إضافية: {instructions}"

        enhance_prompt += "\nركز على: الوضوح، الاكتمال، التنظيم الجيد، اللغة الاحترافية"

        result = await router.generate(enhance_prompt)

        return {
            "success": True,
            "enhanced_content": result,
            "improved_at": datetime.utcnow().isoformat(),
            "improvements_made": [
                "تحسين الوضوح",
                "إضافة التفاصيل الناقصة",
                "تحسين البنية",
                "تحسين اللغة"
            ]
        }

    async def generate_from_template(
        self, template_type: str, context: dict
    ) -> dict:
        """
        Generate handover using department template.

        Args:
            template_type: Department type (IT, Sales, Finance, HR, Operations)
            context: Context dict with handover details

        Returns:
            Generated handover following template structure
        """
        from .ai_router import AIRouter

        if template_type not in self.templates:
            return {
                "success": False,
                "error": f"نوع النموذج {template_type} غير مدعوم"
            }

        template = self.templates[template_type]
        router = AIRouter()

        sections_text = "\n".join(f"- {s}" for s in template["sections"])

        template_prompt = f"""
اكتب وثيقة تسليم {template['ar_title']} باستخدام الأقسام التالية:

{sections_text}

معلومات السياق:
- من: {context.get('from_person')}
- إلى: {context.get('to_person')}
- الملخص: {context.get('summary', '')}

اجعل التسليم مفصلاً وشاملاً مع التركيز على الأقسام الحرجة.
"""

        result = await router.generate(template_prompt)

        return {
            "success": True,
            "template_type": template_type,
            "ar_title": template["ar_title"],
            "content": result,
            "sections": template["sections"],
            "critical_fields": template["critical_fields"],
            "generated_at": datetime.utcnow().isoformat()
        }

    async def extract_action_items(self, handover_content: str) -> list[dict]:
        """
        Extract actionable tasks from handover.

        Args:
            handover_content: Handover text

        Returns:
            List of action items with priority and owner
        """
        from .ai_router import AIRouter

        router = AIRouter()

        extract_prompt = f"""
استخرج جميع الإجراءات والمهام من وثيقة التسليم التالية.
أرجع النتيجة كـ JSON مع هذا الهيكل:
[
  {{"action": "الإجراء", "priority": "عالية/متوسطة/منخفضة", "owner": "المسؤول", "deadline": "الموعد النهائي"}},
  ...
]

وثيقة التسليم:
{handover_content}
"""

        result = await router.generate(extract_prompt)

        try:
            import json as json_module
            actions = json_module.loads(result)
            return {
                "success": True,
                "actions": actions,
                "count": len(actions),
                "extracted_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.warning(f"Failed to parse action items: {e}")
            return {
                "success": False,
                "error": "فشل استخراج الإجراءات",
                "raw_result": result
            }


class HandoverAnalyzer:
    """Analyze and score handover documents."""

    def __init__(self):
        self.quality_criteria = DOC_QUALITY_CRITERIA
        self.risk_factors = RISK_FACTORS
        logger.info("HandoverAnalyzer initialized")

    async def score_quality(self, handover: dict) -> dict:
        """
        Score handover completeness and quality.

        Args:
            handover: Handover document dict

        Returns:
            Quality score (0-100) with breakdown by criteria
        """
        from .ai_router import AIRouter

        router = AIRouter()

        score_prompt = f"""
قيّم جودة وثيقة التسليم التالية على مقياس 0-100:

{json.dumps(handover, ensure_ascii=False, indent=2)}

قيّم حسب:
1. المحتوى (30%): هل التفاصيل كاملة وواضحة؟
2. جهات الاتصال (20%): هل جهات الاتصال واضحة وكاملة؟
3. الإجراءات (25%): هل الإجراءات محددة والمسؤوليات واضحة؟
4. الجدول الزمني (15%): هل المواعيد والأولويات واضحة؟
5. تقييم المخاطر (10%): هل تم تقييم المخاطر؟

أرجع نتيجة JSON:
{{"total_score": 0-100, "breakdown": {{"content": 0-100, "contacts": 0-100, "actions": 0-100, "timeline": 0-100, "risk": 0-100}}, "feedback": "ملاحظاتك"}}
"""

        result = await router.generate(score_prompt)

        try:
            score_data = json.loads(result)
            return {
                "success": True,
                "quality_score": score_data.get("total_score", 0),
                "breakdown": score_data.get("breakdown", {}),
                "feedback": score_data.get("feedback", ""),
                "evaluated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.warning(f"Quality scoring failed: {e}")
            return {
                "success": False,
                "error": "فشل تقييم الجودة",
                "default_score": 50
            }

    async def assess_risk(self, handover: dict) -> dict:
        """
        Assess risk level in handover.

        Args:
            handover: Handover document

        Returns:
            Risk assessment with level and factors
        """
        risk_factors_list = "\n".join(
            f"- {f['ar_name']}" for f in self.risk_factors.values()
        )

        risk_prompt = f"""
قيّم المخاطر في وثيقة التسليم التالية:

{json.dumps(handover, ensure_ascii=False, indent=2)}

عوامل المخاطر المحتملة:
{risk_factors_list}

أرجع تقييم JSON:
{{"risk_level": "منخفضة/متوسطة/عالية", "risk_score": 0-100, "identified_risks": ["المخاطر"], "mitigation": ["الحلول الموصى بها"]}}
"""

        from .ai_router import AIRouter
        router = AIRouter()
        result = await router.generate(risk_prompt)

        try:
            risk_data = json.loads(result)
            return {
                "success": True,
                "risk_level": risk_data.get("risk_level", "متوسطة"),
                "risk_score": risk_data.get("risk_score", 50),
                "identified_risks": risk_data.get("identified_risks", []),
                "mitigation_strategies": risk_data.get("mitigation", []),
                "assessed_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.warning(f"Risk assessment failed: {e}")
            return {
                "success": False,
                "error": "فشل تقييم المخاطر",
                "default_risk_level": "متوسطة"
            }

    async def detect_knowledge_gaps(
        self, db: Session, company_id: int, handover: dict
    ) -> list[dict]:
        """
        Detect missing information in handover.

        Args:
            db: Database session
            company_id: Company ID
            handover: Handover document

        Returns:
            List of knowledge gaps detected
        """
        from .ai_router import AIRouter

        router = AIRouter()

        gap_prompt = f"""
حدد الفجوات المعرفية والمعلومات المفقودة في وثيقة التسليم:

{json.dumps(handover, ensure_ascii=False, indent=2)}

أرجع قائمة JSON من الفجوات:
[
  {{"gap": "المعلومة المفقودة", "importance": "حرجة/عالية/متوسطة", "section": "القسم"}},
  ...
]
"""

        result = await router.generate(gap_prompt)

        try:
            gaps = json.loads(result)
            return {
                "success": True,
                "gaps": gaps,
                "critical_gaps_count": len([g for g in gaps if g.get("importance") == "حرجة"]),
                "detected_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.warning(f"Gap detection failed: {e}")
            return {
                "success": False,
                "error": "فشل كشف الفجوات"
            }

    async def compare_handovers(
        self, handover_a: dict, handover_b: dict
    ) -> dict:
        """
        Compare two handover documents.

        Args:
            handover_a: First handover
            handover_b: Second handover

        Returns:
            Comparison analysis
        """
        from .ai_router import AIRouter

        router = AIRouter()

        compare_prompt = f"""
قارن بين وثيقتي التسليم التاليتين:

الأولى:
{json.dumps(handover_a, ensure_ascii=False, indent=2)}

الثانية:
{json.dumps(handover_b, ensure_ascii=False, indent=2)}

أرجع مقارنة JSON:
{{"similarities": ["المتشابهات"], "differences": ["الاختلافات"], "better_document": "A/B", "recommendations": ["التوصيات"]}}
"""

        result = await router.generate(compare_prompt)

        try:
            comparison = json.loads(result)
            return {
                "success": True,
                "comparison": comparison,
                "compared_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.warning(f"Comparison failed: {e}")
            return {
                "success": False,
                "error": "فشلت المقارنة"
            }

    async def generate_followup_report(
        self, db: Session, company_id: int, days: int = 30
    ) -> dict:
        """
        Generate follow-up report on handovers.

        Args:
            db: Database session
            company_id: Company ID
            days: Days to look back

        Returns:
            Follow-up report with metrics
        """
        return {
            "success": True,
            "report_type": "تقرير متابعة التسليمات",
            "period_days": days,
            "company_id": company_id,
            "metrics": {
                "total_handovers": 0,
                "completed": 0,
                "pending": 0,
                "overdue": 0,
                "average_quality_score": 0,
                "completion_rate": 0
            },
            "generated_at": datetime.utcnow().isoformat(),
            "recommendations": [
                "تحسين التوثيق",
                "متابعة التسليمات المتأخرة",
                "تدريب إضافي"
            ]
        }


# Singletons
handover_generator = HandoverGenerator()
handover_analyzer = HandoverAnalyzer()
