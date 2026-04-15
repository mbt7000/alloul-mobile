"""
ALLOUL&Q Document Generation AI
=================================
Generate professional business documents:
1. Reports (weekly, monthly, quarterly)
2. Meeting minutes
3. Project briefs
4. Business proposals
5. Employee performance reviews
6. Company announcements
7. Knowledge base articles
"""
from __future__ import annotations
import logging
from typing import Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session

logger = logging.getLogger("alloul.ai.documents")


DOCUMENT_TEMPLATES = {
    "weekly_report": {
        "ar_title": "التقرير الأسبوعي",
        "ar_prompt": """
اكتب تقرير أسبوعي احترافي يتضمن:
1. ملخص الإنجازات الأسبوعية
2. المشاريع والمبادرات الجارية
3. التحديات والعقبات
4. الأنشطة المخطط لها للأسبوع القادم
5. المؤشرات الرئيسية للأداء
6. التوصيات والملاحظات
اجعل التقرير موجزاً وشاملاً مع التركيز على النتائج.
""",
        "structure": [
            "الملخص التنفيذي",
            "الإنجازات الرئيسية",
            "الحالة الحالية للمشاريع",
            "التحديات والحلول",
            "الخطط القادمة",
            "المؤشرات"
        ]
    },
    "monthly_report": {
        "ar_title": "التقرير الشهري",
        "ar_prompt": """
اكتب تقرير شهري شامل يتضمن:
1. ملخص تنفيذي
2. الإنجازات الرئيسية للشهر
3. تحليل الأداء والمؤشرات
4. حالة المشاريع والمبادرات
5. التحديات والدروس المستفادة
6. التوصيات والاتجاهات المستقبلية
اجعل التقرير احترافياً وقابلاً للعمل.
""",
        "structure": [
            "الملخص التنفيذي",
            "المؤشرات الرئيسية",
            "الإنجازات والنتائج",
            "تحليل الأداء",
            "حالة المشاريع",
            "التوصيات"
        ]
    },
    "quarterly_report": {
        "ar_title": "التقرير الربع سنوي",
        "ar_prompt": """
اكتب تقرير ربع سنوي استراتيجي يتضمن:
1. ملخص تنفيذي شامل
2. الأداء المالي والعمليات
3. تحليل المشاريع الاستراتيجية
4. المؤشرات الرئيسية والنتائج
5. تقييم المخاطر والفرص
6. الرؤية والتوجهات المستقبلية
اجعل التقرير موجهاً للإدارة العليا.
""",
        "structure": [
            "الملخص التنفيذي",
            "النتائج الرئيسية",
            "تحليل الأداء",
            "الحالة الاستراتيجية",
            "المخاطر والفرص",
            "التوجهات المستقبلية"
        ]
    },
    "meeting_minutes": {
        "ar_title": "محضر الاجتماع",
        "ar_prompt": """
اكتب محضر اجتماع احترافي يتضمن:
1. معلومات الاجتماع (التاريخ، الحضور، الأجندة)
2. ملخص المناقشات الرئيسية
3. القرارات المتخذة
4. الإجراءات والمسؤوليات
5. الجدول الزمني والمواعيد النهائية
6. الاجتماع التالي
اجعل المحضر واضحاً وسهل المتابعة.
""",
        "structure": [
            "معلومات الاجتماع",
            "الحضور والغياب",
            "نقاط الأجندة",
            "الجدل والقرارات",
            "الإجراءات المتفق عليها",
            "موعد الاجتماع التالي"
        ]
    },
    "project_brief": {
        "ar_title": "ملخص المشروع",
        "ar_prompt": """
اكتب ملخص مشروع احترافي يتضمن:
1. نظرة عامة على المشروع والأهداف
2. النطاق والمخرجات
3. الجدول الزمني والمراحل
4. الموارد والميزانية
5. المخاطر والافتراضات
6. معايير النجاح
اجعل الملخص واضحاً وقابلاً للتنفيذ.
""",
        "structure": [
            "نظرة عامة",
            "الأهداف والنطاق",
            "المرحلة الزمنية",
            "الفريق والموارد",
            "الميزانية",
            "معايير النجاح"
        ]
    },
    "business_proposal": {
        "ar_title": "العرض التجاري",
        "ar_prompt": """
اكتب عرض تجاري احترافي يتضمن:
1. غلاف وملخص تنفيذي
2. مقدمة وخلفية
3. المشكلة والفرصة
4. الحل المقترح والفوائد
5. الجدول الزمني والتسليمات
6. الأسعار والشروط
7. استدعاء للعمل
اجعل العرض مقنعاً واحترافياً.
""",
        "structure": [
            "الملخص التنفيذي",
            "المقدمة",
            "تحليل المشكلة",
            "الحل المقترح",
            "الفوائد المتوقعة",
            "الخطة الزمنية",
            "الأسعار",
            "الشروط والأحكام"
        ]
    },
    "announcement": {
        "ar_title": "الإعلان",
        "ar_prompt": """
اكتب إعلان احترافي واضح يتضمن:
1. عنوان جذاب وملخص سريع
2. التفاصيل الأساسية
3. التأثير على المنظمة أو الموظفين
4. التعليمات والخطوات التالية
5. جهات الاتصال للاستفسارات
اجعل الإعلان واضحاً وسهل الفهم.
""",
        "structure": [
            "العنوان والملخص",
            "التفاصيل الرئيسية",
            "التأثير والأهمية",
            "التعليمات",
            "جهات الاتصال"
        ]
    },
    "knowledge_article": {
        "ar_title": "مقالة قاعدة المعرفة",
        "ar_prompt": """
اكتب مقالة احترافية لقاعدة المعرفة تتضمن:
1. عنوان واضح ومحدد
2. ملخص سريع
3. المتطلبات والافتراضات
4. شرح مفصل خطوة بخطوة
5. أمثلة وحالات الاستخدام
6. استكشاف الأخطاء والحلول
7. موارد إضافية
اجعل المقالة سهلة الفهم والمتابعة.
""",
        "structure": [
            "العنوان والملخص",
            "المتطلبات",
            "المحتوى الرئيسي",
            "الأمثلة",
            "استكشاف الأخطاء",
            "الموارد الإضافية"
        ]
    },
    "performance_review": {
        "ar_title": "تقرير التقييم الوظيفي",
        "ar_prompt": """
اكتب تقرير تقييم وظيفي احترافي يتضمن:
1. معلومات الموظف والمسمى الوظيفي
2. ملخص الأداء العام
3. الإنجازات والقوة
4. المجالات الواجب تحسينها
5. الأهداف والتطوير
6. التوصيات والتقييم النهائي
اجعل التقرير بناء وموضوعياً.
""",
        "structure": [
            "معلومات الموظف",
            "فترة التقييم",
            "الملخص العام",
            "الإنجازات",
            "المجالات التطويرية",
            "الأهداف المستقبلية",
            "التقييم النهائي"
        ]
    }
}

DOC_STYLES = {
    "professional": {
        "ar_name": "احترافي",
        "guidelines": "استخدم لغة رسمية واحترافية، هيكل منظم، تركيز على النتائج"
    },
    "casual": {
        "ar_name": "ودي",
        "guidelines": "استخدم لغة بسيطة وودية، نبرة دافئة، سهل الفهم"
    },
    "formal": {
        "ar_name": "رسمي",
        "guidelines": "استخدم لغة رسمية جداً، صيغة تقليدية، احترافي عالي"
    },
    "technical": {
        "ar_name": "تقني",
        "guidelines": "استخدم المصطلحات التقنية، شرح مفصل، دقة عالية"
    },
    "creative": {
        "ar_name": "إبداعي",
        "guidelines": "استخدم لغة جذابة وإبداعية، قصص وأمثلة، أسلوب حي"
    }
}

LANGUAGE_CONFIG = {
    "ar": {
        "name": "العربية",
        "code": "ar",
        "default": True
    },
    "en": {
        "name": "English",
        "code": "en",
        "default": False
    }
}


class DocumentGenerator:
    """Generate professional business documents with AI."""

    def __init__(self):
        self.templates = DOCUMENT_TEMPLATES
        self.styles = DOC_STYLES
        self.languages = LANGUAGE_CONFIG
        logger.info("DocumentGenerator initialized")

    async def generate(
        self, doc_type: str, context: dict, language: str = "ar"
    ) -> dict:
        """
        Generate document of specified type.

        Args:
            doc_type: Document type (weekly_report, proposal, etc.)
            context: Context dict with document information
            language: Language code (ar/en)

        Returns:
            Generated document
        """
        if doc_type not in self.templates:
            return {
                "success": False,
                "error": f"نوع المستند {doc_type} غير مدعوم"
            }

        template = self.templates[doc_type]

        if doc_type == "weekly_report":
            return await self.generate_report(
                None, context.get("company_id"), "weekly", None, context
            )
        elif doc_type == "monthly_report":
            return await self.generate_report(
                None, context.get("company_id"), "monthly", None, context
            )
        elif doc_type == "quarterly_report":
            return await self.generate_report(
                None, context.get("company_id"), "quarterly", None, context
            )
        elif doc_type == "meeting_minutes":
            return await self.generate_meeting_minutes(context)
        elif doc_type == "project_brief":
            return await self.generate_project_brief(None, context.get("project_id"))
        elif doc_type == "business_proposal":
            return await self.generate_proposal(context)
        elif doc_type == "announcement":
            return await self.generate_announcement(context)
        elif doc_type == "knowledge_article":
            return await self.generate_knowledge_article(
                context.get("topic"), context
            )
        else:
            return {
                "success": False,
                "error": "نوع غير معروف"
            }

    async def generate_report(
        self, db: Optional[Session], company_id: int, report_type: str,
        period: Optional[str], context: dict
    ) -> dict:
        """
        Generate business report.

        Args:
            db: Database session
            company_id: Company ID
            report_type: weekly/monthly/quarterly
            period: Period identifier
            context: Report context

        Returns:
            Generated report
        """
        from .ai_router import AIRouter

        if report_type not in self.templates:
            return {
                "success": False,
                "error": f"نوع التقرير {report_type} غير مدعوم"
            }

        template = self.templates[f"{report_type}_report"]
        router = AIRouter()

        report_prompt = f"""{template['ar_prompt']}

معلومات السياق:
- الفترة: {period or 'الحالية'}
- قسم الشركة: {context.get('department', 'عام')}
- الملخص: {context.get('summary', '')}
- المؤشرات: {context.get('metrics', '')}
- التحديات: {context.get('challenges', '')}
- الخطط المستقبلية: {context.get('plans', '')}

اجعل التقرير احترافياً ومفيداً للإدارة.
"""

        result = await router.generate(report_prompt)

        return {
            "success": True,
            "doc_type": "report",
            "report_type": report_type,
            "ar_title": template["ar_title"],
            "content": result,
            "structure": template["structure"],
            "company_id": company_id,
            "generated_at": datetime.utcnow().isoformat(),
            "language": "ar"
        }

    async def generate_meeting_minutes(self, meeting_data: dict) -> dict:
        """
        Generate meeting minutes from notes/transcript.

        Args:
            meeting_data: Meeting information dict

        Returns:
            Generated meeting minutes
        """
        from .ai_router import AIRouter

        router = AIRouter()
        template = self.templates["meeting_minutes"]

        minutes_prompt = f"""{template['ar_prompt']}

معلومات الاجتماع:
- التاريخ: {meeting_data.get('date', 'غير محدد')}
- الموضوع: {meeting_data.get('topic', '')}
- الحضور: {meeting_data.get('attendees', '')}
- الملاحظات: {meeting_data.get('notes', '')}
- النقاط الرئيسية: {meeting_data.get('key_points', '')}

اكتب محضر احترافي منظم.
"""

        result = await router.generate(minutes_prompt)

        return {
            "success": True,
            "doc_type": "meeting_minutes",
            "ar_title": template["ar_title"],
            "content": result,
            "structure": template["structure"],
            "meeting_date": meeting_data.get("date"),
            "meeting_topic": meeting_data.get("topic"),
            "generated_at": datetime.utcnow().isoformat(),
            "language": "ar"
        }

    async def generate_project_brief(self, db: Optional[Session], project_id: int) -> dict:
        """
        Generate project brief.

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            Generated project brief
        """
        from .ai_router import AIRouter

        router = AIRouter()
        template = self.templates["project_brief"]

        brief_prompt = f"""{template['ar_prompt']}

معرف المشروع: {project_id}

اكتب ملخص مشروع احترافي.
"""

        result = await router.generate(brief_prompt)

        return {
            "success": True,
            "doc_type": "project_brief",
            "ar_title": template["ar_title"],
            "content": result,
            "structure": template["structure"],
            "project_id": project_id,
            "generated_at": datetime.utcnow().isoformat(),
            "language": "ar"
        }

    async def generate_proposal(self, context: dict) -> dict:
        """
        Generate business proposal.

        Args:
            context: Proposal context dict

        Returns:
            Generated proposal
        """
        from .ai_router import AIRouter

        router = AIRouter()
        template = self.templates["business_proposal"]

        proposal_prompt = f"""{template['ar_prompt']}

معلومات العرض:
- العميل: {context.get('client', '')}
- المشكلة: {context.get('problem', '')}
- الحل المقترح: {context.get('solution', '')}
- الميزانية: {context.get('budget', 'حسب التفاوض')}
- الجدول الزمني: {context.get('timeline', '')}
- الشروط: {context.get('terms', '')}

اكتب عرضاً مقنعاً واحترافياً.
"""

        result = await router.generate(proposal_prompt)

        return {
            "success": True,
            "doc_type": "business_proposal",
            "ar_title": template["ar_title"],
            "content": result,
            "structure": template["structure"],
            "client": context.get("client"),
            "generated_at": datetime.utcnow().isoformat(),
            "language": "ar"
        }

    async def generate_announcement(self, context: dict) -> dict:
        """
        Generate company announcement.

        Args:
            context: Announcement context dict

        Returns:
            Generated announcement
        """
        from .ai_router import AIRouter

        router = AIRouter()
        template = self.templates["announcement"]

        announcement_prompt = f"""{template['ar_prompt']}

معلومات الإعلان:
- الموضوع: {context.get('subject', '')}
- التفاصيل: {context.get('details', '')}
- الجمهور المستهدف: {context.get('audience', '')}
- تاريخ التطبيق: {context.get('effective_date', '')}
- جهات الاتصال: {context.get('contacts', '')}

اكتب إعلاناً واضحاً احترافياً.
"""

        result = await router.generate(announcement_prompt)

        return {
            "success": True,
            "doc_type": "announcement",
            "ar_title": template["ar_title"],
            "content": result,
            "structure": template["structure"],
            "subject": context.get("subject"),
            "generated_at": datetime.utcnow().isoformat(),
            "language": "ar"
        }

    async def generate_knowledge_article(
        self, topic: str, context: dict = None
    ) -> dict:
        """
        Generate knowledge base article.

        Args:
            topic: Article topic
            context: Optional context dict

        Returns:
            Generated knowledge article
        """
        from .ai_router import AIRouter

        router = AIRouter()
        template = self.templates["knowledge_article"]

        article_context = context or {}

        article_prompt = f"""{template['ar_prompt']}

الموضوع: {topic}
التفاصيل: {article_context.get('details', '')}
الهدف: {article_context.get('purpose', '')}
الجمهور: {article_context.get('audience', '')}

اكتب مقالة شاملة وسهلة الفهم.
"""

        result = await router.generate(article_prompt)

        return {
            "success": True,
            "doc_type": "knowledge_article",
            "ar_title": template["ar_title"],
            "content": result,
            "structure": template["structure"],
            "topic": topic,
            "generated_at": datetime.utcnow().isoformat(),
            "language": "ar"
        }

    async def translate_document(
        self, content: str, from_lang: str, to_lang: str
    ) -> str:
        """
        Translate document content.

        Args:
            content: Content to translate
            from_lang: Source language (ar/en)
            to_lang: Target language (ar/en)

        Returns:
            Translated content
        """
        if from_lang == to_lang:
            return content

        from .ai_router import AIRouter

        router = AIRouter()

        if from_lang == "ar" and to_lang == "en":
            translate_prompt = f"""
ترجم النص التالي من العربية إلى الإنجليزية بشكل احترافي:

{content}
"""
        else:  # en to ar
            translate_prompt = f"""
Translate the following text from English to Arabic professionally:

{content}
"""

        result = await router.generate(translate_prompt)
        return result

    async def improve_writing(self, text: str, style: str = "professional") -> dict:
        """
        Improve text quality and style.

        Args:
            text: Text to improve
            style: Writing style (professional/casual/formal/technical/creative)

        Returns:
            Improved text with feedback
        """
        if style not in self.styles:
            style = "professional"

        style_info = self.styles[style]

        from .ai_router import AIRouter

        router = AIRouter()

        improve_prompt = f"""
حسّن النص التالي باستخدام أسلوب {style_info['ar_name']}:

التعليمات: {style_info['guidelines']}

النص الأصلي:
{text}

أرجع الإجابة بصيغة JSON:
{{
  "improved_text": "النص المحسّن",
  "improvements": ["التحسينات"],
  "feedback": "تعليقاتك"
}}
"""

        result = await router.generate(improve_prompt)

        try:
            import json as json_module
            improvements = json_module.loads(result)
            return {
                "success": True,
                "original_text": text,
                "improved_text": improvements.get("improved_text", ""),
                "style": style,
                "ar_style": style_info["ar_name"],
                "improvements": improvements.get("improvements", []),
                "feedback": improvements.get("feedback", ""),
                "improved_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.warning(f"Writing improvement failed: {e}")
            return {
                "success": False,
                "error": "فشل تحسين النص",
                "original_text": text
            }


# Singleton instance
doc_generator = DocumentGenerator()
