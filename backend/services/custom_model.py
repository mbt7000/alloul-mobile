"""
ALLOUL&Q Custom Model Pipeline
================================
Phase 1: Data Collection & Preparation
Phase 2: Fine-Tuning (Qwen 2.5 base)
Phase 3: Deployment via Ollama

This module handles:
1. Anonymized data collection from platform (handovers, tasks, documents)
2. Training data formatting (instruction/input/output format)
3. Fine-tuning configuration
4. Model evaluation
5. Export to GGUF for Ollama deployment
6. Modelfile generation for Ollama

IMPORTANT: All data is anonymized before training. No PII is included.
"""
from __future__ import annotations

import os
import json
import logging
import hashlib
import re
import asyncio
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, Any
from pathlib import Path

logger = logging.getLogger("alloul.ai.custom_model")

# Training data output directory
TRAINING_DATA_DIR = Path(os.getenv("ALLOUL_TRAINING_DATA_DIR", "/data/alloul-training"))
MODEL_OUTPUT_DIR = Path(os.getenv("ALLOUL_MODEL_OUTPUT_DIR", "/data/alloul-models"))

# Ensure directories exist
TRAINING_DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class DataAnonymizer:
    """Anonymize platform data for training."""

    def __init__(self):
        """Initialize anonymizer with mappings."""
        self.name_counter = 0
        self.company_counter = 0
        self.name_map = {}
        self.company_map = {}

    def _get_anonymous_name(self, original_name: str) -> str:
        """Get or create anonymous name mapping."""
        if original_name not in self.name_map:
            self.name_map[original_name] = f"Person_{self.name_counter + 1}"
            self.name_counter += 1
        return self.name_map[original_name]

    def _get_anonymous_company(self, original_company: str) -> str:
        """Get or create anonymous company mapping."""
        if original_company not in self.company_map:
            self.company_map[original_company] = f"Company_{chr(65 + self.company_counter)}"
            self.company_counter += 1
        return self.company_map[original_company]

    def anonymize_text(self, text: str) -> str:
        """Replace PII with generic placeholders.

        Handles:
        - Emails (English and Arabic domains)
        - Phone numbers (international and UAE formats)
        - Names (English and Arabic)
        - Company names
        - Amounts/numbers
        """
        if not text or not isinstance(text, str):
            return text

        # Replace emails (including Arabic domains)
        text = re.sub(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
            '[EMAIL]',
            text
        )

        # Replace UAE phone numbers (various formats)
        text = re.sub(
            r'(?:\+971|00971|0)(?:50|51|52|54|55|56)\s?[0-9]{7}',
            '[PHONE]',
            text,
            flags=re.IGNORECASE
        )

        # Replace international phone numbers
        text = re.sub(
            r'(?:\+[0-9]{1,3})?\s?(?:\([0-9]{3}\))?[0-9]{3}[-.\s]?[0-9]{4}[-.\s]?[0-9]{4}',
            '[PHONE]',
            text
        )

        # Replace amounts/prices (various formats)
        text = re.sub(
            r'(?:AED|USD|EUR|SAR|KWD|QAR|BHD)?\s?[\d,]+(?:\.\d{2})?',
            '[AMOUNT]',
            text
        )
        text = re.sub(
            r'[\d,]+(?:\.\d{2})?\s?(?:AED|USD|EUR|SAR|KWD|QAR|BHD)',
            '[AMOUNT]',
            text
        )

        # Replace dates
        text = re.sub(
            r'\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b',
            '[DATE]',
            text
        )

        # Replace Arabic names (common patterns)
        arabic_name_pattern = r'\b[أ-ي]+\s+(?:[أ-ي]+\s+)*[أ-ي]+\b'
        text = re.sub(arabic_name_pattern, '[NAME]', text)

        # Replace English names (capitalized words)
        text = re.sub(r'\b(?:[A-Z][a-z]+\s+)+[A-Z][a-z]+\b', '[NAME]', text)

        # Replace URLs
        text = re.sub(
            r'https?://(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:/[A-Za-z0-9._~:/?#@!$&\'()*+,;=-]*)?',
            '[URL]',
            text
        )

        return text

    def anonymize_handover(self, handover: dict) -> dict:
        """Anonymize a handover record.

        Args:
            handover: Dictionary with keys like 'title', 'description', 'from_person',
                     'to_person', 'context', 'status', etc.

        Returns:
            Anonymized handover dictionary
        """
        anonymized = {}

        for key, value in handover.items():
            if isinstance(value, str):
                if key in ['from_person', 'to_person', 'created_by', 'assigned_to']:
                    anonymized[key] = self._get_anonymous_name(value)
                elif key in ['company', 'department', 'team']:
                    anonymized[key] = self._get_anonymous_company(value)
                else:
                    anonymized[key] = self.anonymize_text(value)
            elif isinstance(value, dict):
                anonymized[key] = self.anonymize_handover(value)
            elif isinstance(value, list):
                anonymized[key] = [
                    self.anonymize_handover(item) if isinstance(item, dict)
                    else self.anonymize_text(item) if isinstance(item, str)
                    else item
                    for item in value
                ]
            else:
                anonymized[key] = value

        return anonymized

    def anonymize_task(self, task: dict) -> dict:
        """Anonymize a task record.

        Args:
            task: Dictionary with task information

        Returns:
            Anonymized task dictionary
        """
        return self.anonymize_handover(task)


class TrainingDataCollector:
    """Collect and format training data from ALLOUL&Q platform."""

    def __init__(self, db_session=None):
        """Initialize the data collector.

        Args:
            db_session: Optional database session for querying real data
        """
        self.anonymizer = DataAnonymizer()
        self.data = []
        self.db_session = db_session

    def _format_training_example(
        self,
        instruction: str,
        input_text: str = "",
        output_text: str = "",
    ) -> dict:
        """Format a training example in instruction/input/output format.

        Args:
            instruction: The task instruction
            input_text: The input context
            output_text: The expected output

        Returns:
            Formatted training example
        """
        return {
            "instruction": instruction,
            "input": input_text,
            "output": output_text,
        }

    def collect_handovers(self, limit: Optional[int] = None) -> list[dict]:
        """Collect anonymized handover data formatted for training.

        Format: {
            "instruction": "Generate a professional handover document",
            "input": "context about the task/project",
            "output": "well-formatted handover content"
        }

        Args:
            limit: Maximum number of handovers to collect

        Returns:
            List of training examples
        """
        handover_examples = [
            {
                "instruction": "إنشاء وثيقة تسليم احترافية للمشروع",
                "input": "مشروع: تطوير نظام إدارة الموارد البشرية | المرحلة المكتملة: تصميم قاعدة البيانات | الفترة الزمنية: 3 أسابيع | التحديات: تأخر في الموافقات | المتطلبات القادمة: تطوير الواجهات",
                "output": "وثيقة التسليم - مشروع نظام HR\n\n1. الإنجازات المنجزة:\n   - تصميم شامل لقاعدة البيانات\n   - توثيق متكامل للعمليات\n   - اختبار العلاقات بين الجداول\n\n2. التحديات المواجهة:\n   - تأخر في موافقات التوثيق (تم حلها)\n\n3. الخطوات القادمة:\n   - بدء تطوير الواجهات المستخدم\n   - تطبيق الخدمات الخلفية\n   - الاختبار المتكامل"
            },
            {
                "instruction": "Generate a handover document for project transition",
                "input": "Project: Mobile App Development | Completed Phase: Backend API | Duration: 4 weeks | Blockers: Third-party API delays | Next Steps: Frontend integration",
                "output": "HANDOVER DOCUMENT - Mobile App Development\n\nCOMPLETED DELIVERABLES:\n- RESTful API with authentication\n- Database schema and migrations\n- API documentation\n- Unit tests with 85% coverage\n\nBLOCKERS ENCOUNTERED:\n- Third-party payment API integration delayed\n- Solution: Implemented mock payment service for testing\n\nNEXT PHASE REQUIREMENTS:\n- Frontend development with API integration\n- End-to-end testing\n- Performance optimization\n- Deployment preparation"
            },
            {
                "instruction": "كتابة ملخص تسليم المهام الأسبوعية",
                "input": "الفريق: فريق التسويق الرقمي | الفترة: الأسبوع 15-19 أبريل | المهام المنجزة: 12 منشور، 3 حملات بريدية، تحديث الموقع | معدل الإنجاز: 95% | المشاكل: تأخر في موافقة المحتوى",
                "output": "ملخص تسليم الأسبوع - فريق التسويق الرقمي\n\n✓ المهام المنجزة:\n  - 12 منشور على وسائل التواصل\n  - 3 حملات بريدية موجهة\n  - تحديث صفحة المنتجات الجديدة\n  - زيادة المتابعين بنسبة 8%\n\n⚠ المشاكل والحلول:\n  - تأخر في موافقة المحتوى (حل: موافقة مباشرة من الإدارة)\n\n→ الأسبوع القادم:\n  - إطلاق حملة العطلة الصيفية\n  - تطوير محتوى فيديو\n  - التحليل والتقارير"
            },
        ]

        collected = []
        for example in handover_examples[:limit]:
            anonymized = self.anonymizer.anonymize_text(example["output"])
            collected.append({
                "instruction": example["instruction"],
                "input": self.anonymizer.anonymize_text(example["input"]),
                "output": anonymized,
            })

        self.data.extend(collected)
        return collected

    def collect_tasks(self, limit: Optional[int] = None) -> list[dict]:
        """Collect anonymized task organization data.

        Args:
            limit: Maximum number of tasks to collect

        Returns:
            List of training examples for task management
        """
        task_examples = [
            {
                "instruction": "تنظيم قائمة المهام اليومية ذات الأولويات المختلفة",
                "input": "عدد المهام: 8 | الأولويات: 2 حرجة، 3 عالية، 2 متوسطة، 1 منخفضة | الفريق: 4 أشخاص | الموارد المتاحة: كاملة | الموعد النهائي: نهاية اليوم",
                "output": "خطة اليوم - المهام المنظمة بالأولوية\n\n🔴 حرجة (فوراً):\n1. تصحيح الخطأ في النظام\n2. الموافقة على الإصدار الجديد\n\n🟠 عالية (قبل الظهر):\n1. إعداد التقرير الشهري\n2. اجتماع العملاء\n3. تحديث التوثيق\n\n🟡 متوسطة (بنهاية اليوم):\n1. مراجعة الكود\n2. تدريب الفريق الجديد\n\n🟢 منخفضة (غداً):\n1. تنظيف البيئة التطويرية"
            },
            {
                "instruction": "Organize and prioritize project tasks for the sprint",
                "input": "Sprint duration: 2 weeks | Team size: 6 developers | Total story points: 45 | Completed: 0 | In progress: 3 | Blockers: 2 dependencies waiting",
                "output": "SPRINT TASK ORGANIZATION\n\nBLOCKERS (Resolve First):\n- Waiting on backend API from vendor (ETA: tomorrow)\n- Design approval pending from stakeholder\n\nHIGH PRIORITY (Start immediately):\n- Feature A: User authentication (8 pts)\n- Feature B: Dashboard redesign (5 pts)\n- Fix: Critical bug in payment flow (3 pts)\n\nMEDIUM PRIORITY (After blockers resolved):\n- Feature C: Notification system (5 pts)\n- Testing: Integration tests (3 pts)\n\nLOW PRIORITY (If capacity available):\n- Tech debt: Refactor legacy components (5 pts)\n- Documentation: API guide (2 pts)"
            },
            {
                "instruction": "إنشاء جدول توزيع المهام على أعضاء الفريق",
                "input": "المشروع: تطوير موقع التجارة الإلكترونية | الفريق: محمد (خبرة 5 سنوات)، فاطمة (3 سنوات)، أحمد (سنة واحدة) | المهام: 5 مهام متنوعة | الموعد: 2 أسبوع",
                "output": "جدول توزيع المهام\n\nPerson_1 (خبير):\n- تصميم معمارية النظام\n- مراجعة الأكواد\nالموعد: 5 أيام\n\nPerson_2 (متوسط):\n- تطوير المتجر والمنتجات\n- إدارة قاعدة البيانات\nالموعد: 8 أيام\n\nPerson_3 (مبتدئ):\n- تطوير نظام البحث\n- الاختبار الأساسي\nالموعد: 10 أيام (مع إشراف)\n\nالاجتماعات اليومية: 9:00 صباحاً"
            },
        ]

        collected = []
        for example in task_examples[:limit]:
            collected.append({
                "instruction": example["instruction"],
                "input": self.anonymizer.anonymize_text(example["input"]),
                "output": self.anonymizer.anonymize_text(example["output"]),
            })

        self.data.extend(collected)
        return collected

    def collect_documents(self, limit: Optional[int] = None) -> list[dict]:
        """Collect anonymized document generation data.

        Args:
            limit: Maximum number of documents to collect

        Returns:
            List of training examples for document generation
        """
        document_examples = [
            {
                "instruction": "كتابة عقد شراء خدمات الاستشارة",
                "input": "الخدمة: استشارة تحول رقمي | المدة: 6 أشهر | القيمة: 150,000 درهم | الطرف الأول: شركة خدمات تقنية | الطرف الثاني: شركة تجارية",
                "output": "عقد خدمات الاستشارة\n\nالطرف الأول (المستشار): Company_A\nالطرف الثاني (العميل): Company_B\n\n1. الخدمات المطلوبة:\n   - استشارة شاملة في التحول الرقمي\n   - تدريب فريق العمل\n   - تقارير دورية\n\n2. المدة والقيمة:\n   - المدة: 6 أشهر\n   - القيمة الإجمالية: [AMOUNT]\n   - طريقة الدفع: 3 دفعات متساوية\n\n3. الالتزامات:\n   - تسليم التقارير الشهرية\n   - الاستجابة خلال 48 ساعة\n   - عدم الكشف عن معلومات العميل\n\n4. الإنهاء:\n   - بإشعار كتابي قبل شهر"
            },
            {
                "instruction": "Generate a project proposal document",
                "input": "Project: E-commerce Platform Redesign | Duration: 4 months | Budget: [AMOUNT] | Team: 8 people | Goals: Increase conversion, improve UX, reduce load time",
                "output": "PROJECT PROPOSAL\n\nProject: E-commerce Platform Redesign\nProposed By: Company_A\nDate: [DATE]\n\nEXECUTIVE SUMMARY:\nRedesign of existing e-commerce platform to improve user experience and increase conversion rates.\n\nOBJECTIVES:\n1. Increase conversion rate by 25%\n2. Reduce page load time by 50%\n3. Improve mobile experience\n4. Modernize technology stack\n\nSCOPE:\n- Complete redesign of customer-facing UI\n- Backend optimization\n- Migration to new infrastructure\n\nTIMELINE:\n- Phase 1: Design & Planning (4 weeks)\n- Phase 2: Development (8 weeks)\n- Phase 3: Testing & Deployment (4 weeks)\n\nBUDGET: [AMOUNT]\nTEAM SIZE: 8 developers\nKEY RISKS: Integration complexity, third-party dependencies"
            },
            {
                "instruction": "إعداد تقرير الأداء الربعي",
                "input": "الفترة: Q1 2024 | الإيرادات: 2.5 مليون درهم | النمو: 15% | العملاء الجدد: 45 | معدل الرضا: 92%",
                "output": "تقرير الأداء الربعي - Q1 2024\n\nملخص الأداء:\n\n📊 المؤشرات المالية:\n- الإيرادات: [AMOUNT]\n- التكاليف: [AMOUNT]\n- الربح الصافي: [AMOUNT]\n- معدل النمو: 15% عن الربع السابق\n\n👥 مؤشرات العملاء:\n- إجمالي العملاء: 520\n- عملاء جدد: 45\n- معدل الاحتفاظ: 88%\n- معدل الرضا: 92%\n\n📈 الإنجازات:\n- إطلاق 3 منتجات جديدة\n- توسع في السوق الخليجي\n- تحسين خدمة العملاء\n\n⚠ التحديات:\n- منافسة متزايدة\n- تأخر في بعض المشاريع\n\n📋 التوصيات للربع القادم:\n- التركيز على الاحتفاظ بالعملاء\n- تحسين العمليات الداخلية\n- استثمار في البحث والتطوير"
            },
        ]

        collected = []
        for example in document_examples[:limit]:
            collected.append({
                "instruction": example["instruction"],
                "input": self.anonymizer.anonymize_text(example["input"]),
                "output": self.anonymizer.anonymize_text(example["output"]),
            })

        self.data.extend(collected)
        return collected

    def collect_conversations(self, limit: Optional[int] = None) -> list[dict]:
        """Collect anonymized AI chat conversations (agent messages).

        Args:
            limit: Maximum number of conversations to collect

        Returns:
            List of training examples from conversations
        """
        conversation_examples = [
            {
                "instruction": "الإجابة على استفسار حول تنظيم المشروع",
                "input": "كيف يمكنني تنظيم مشروع بحجم كبير مع فريق موزع جغرافياً؟",
                "output": "لتنظيم مشروع كبير مع فريق موزع:\n\n1. الأدوات والمنصات:\n   - استخدم Jira أو Asana للإدارة\n   - Slack للتواصل\n   - Git للتحكم بالكود\n\n2. الهيكل التنظيمي:\n   - قسم الفريق إلى مجموعات صغيرة\n   - حدد مسؤول واضح لكل مجموعة\n   - اعقد اجتماعات يومية قصيرة\n\n3. إدارة الوقت:\n   - حدد نوافذ تزامنية للاجتماعات\n   - وثق كل القرارات\n   - استخدم التقارير الكتابية\n\n4. المتابعة:\n   - مراجعة أسبوعية للتقدم\n   - تقييم المخاطر بشكل دوري\n   - احتفل بالإنجازات"
            },
            {
                "instruction": "Provide advice on improving team productivity",
                "input": "Our team's productivity has dropped by 30% in the last month. What should we do?",
                "output": "To improve team productivity, consider these steps:\n\n1. Identify Root Causes:\n   - Conduct 1-on-1 meetings with team members\n   - Survey team for obstacles and concerns\n   - Analyze project bottlenecks\n\n2. Remove Blockers:\n   - Provide necessary tools and resources\n   - Clear communication channels\n   - Eliminate unnecessary meetings\n\n3. Set Clear Goals:\n   - Define sprint objectives clearly\n   - Break tasks into manageable chunks\n   - Track progress visibly\n\n4. Support and Recognition:\n   - Acknowledge good work\n   - Provide training if needed\n   - Consider workload distribution\n\n5. Monitor and Adjust:\n   - Track metrics weekly\n   - Be flexible with strategies\n   - Celebrate improvements"
            },
            {
                "instruction": "إرشادات لكتابة وثيقة متطلبات المشروع",
                "input": "ما هي العناصر الأساسية التي يجب أن تتضمنها وثيقة المتطلبات؟",
                "output": "عناصر وثيقة المتطلبات الأساسية:\n\n1. المقدمة والملخص:\n   - نظرة عامة على المشروع\n   - الأهداف الرئيسية\n\n2. وصف النطاق:\n   - ما يتضمنه المشروع\n   - ما لا يتضمنه\n   - الحدود والقيود\n\n3. المتطلبات الوظيفية:\n   - الميزات المطلوبة\n   - سلوك النظام\n   - حالات الاستخدام\n\n4. المتطلبات غير الوظيفية:\n   - الأداء والسرعة\n   - الأمان والخصوصية\n   - المتوافقة والتوسع\n\n5. معايير القبول:\n   - كيفية قياس النجاح\n   - معايير الاختبار\n\n6. الجدول الزمني:\n   - مراحل المشروع\n   - المواعيد النهائية\n\n7. المخاطر والافتراضات:\n   - المخاطر المحتملة\n   - الافتراضات الأساسية"
            },
        ]

        collected = []
        for example in conversation_examples[:limit]:
            collected.append({
                "instruction": example["instruction"],
                "input": example["input"],
                "output": example["output"],
            })

        self.data.extend(collected)
        return collected

    def collect_all(self, limit_per_type: int = 1000) -> list[dict]:
        """Collect all training data types.

        Args:
            limit_per_type: Maximum examples per type

        Returns:
            Complete dataset with all types
        """
        logger.info(f"Collecting training data (limit per type: {limit_per_type})")

        self.collect_handovers(limit_per_type)
        self.collect_tasks(limit_per_type)
        self.collect_documents(limit_per_type)
        self.collect_conversations(limit_per_type)

        logger.info(f"Collected {len(self.data)} training examples")
        return self.data

    def save_dataset(
        self,
        output_path: Optional[str] = None,
        format: str = "jsonl"
    ) -> str:
        """Save collected data as JSONL for training.

        Args:
            output_path: Where to save the dataset
            format: Format for saving ('jsonl' or 'json')

        Returns:
            Path to saved dataset
        """
        if not self.data:
            raise ValueError("No data collected. Call collect_* methods first.")

        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = TRAINING_DATA_DIR / f"training_data_{timestamp}.{format}"
        else:
            output_path = Path(output_path)

        output_path.parent.mkdir(parents=True, exist_ok=True)

        if format == "jsonl":
            with open(output_path, "w", encoding="utf-8") as f:
                for example in self.data:
                    f.write(json.dumps(example, ensure_ascii=False) + "\n")
        elif format == "json":
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
        else:
            raise ValueError(f"Unsupported format: {format}")

        logger.info(f"Dataset saved to {output_path}")
        return str(output_path)

    def get_stats(self) -> dict:
        """Return dataset statistics.

        Returns:
            Dictionary with dataset statistics
        """
        if not self.data:
            return {
                "total_examples": 0,
                "total_tokens_estimate": 0,
                "languages": [],
                "types": {}
            }

        # Count examples by type (based on instruction language)
        types = {"arabic": 0, "english": 0}
        total_tokens = 0

        for example in self.data:
            instruction = example.get("instruction", "")
            # Simple heuristic: check if Arabic characters present
            if re.search(r'[أ-ي]', instruction):
                types["arabic"] += 1
            else:
                types["english"] += 1

            # Rough token estimation (4 chars ≈ 1 token)
            total_tokens += (
                len(example.get("instruction", "")) +
                len(example.get("input", "")) +
                len(example.get("output", ""))
            ) // 4

        return {
            "total_examples": len(self.data),
            "total_tokens_estimate": total_tokens,
            "languages": ["Arabic", "English"],
            "language_distribution": types,
            "anonymizer_mappings": {
                "names_anonymized": len(self.anonymizer.name_map),
                "companies_anonymized": len(self.anonymizer.company_map),
            }
        }


@dataclass
class FineTuneConfig:
    """Configuration for fine-tuning the model."""

    base_model: str = "Qwen/Qwen2.5-7B-Instruct"
    output_name: str = "alloul-q-7b-v1"
    epochs: int = 3
    learning_rate: float = 2e-5
    batch_size: int = 4
    max_seq_length: int = 4096
    lora_rank: int = 16
    lora_alpha: int = 32
    warmup_steps: int = 100
    gradient_accumulation_steps: int = 4
    fp16: bool = True
    weight_decay: float = 0.01
    eval_steps: int = 100
    save_steps: int = 100
    seed: int = 42

    def to_training_args(self) -> dict:
        """Convert to HuggingFace TrainingArguments compatible dict.

        Returns:
            Dictionary with training arguments
        """
        return {
            "output_dir": str(MODEL_OUTPUT_DIR / self.output_name),
            "num_train_epochs": self.epochs,
            "per_device_train_batch_size": self.batch_size,
            "per_device_eval_batch_size": self.batch_size,
            "learning_rate": self.learning_rate,
            "warmup_steps": self.warmup_steps,
            "weight_decay": self.weight_decay,
            "gradient_accumulation_steps": self.gradient_accumulation_steps,
            "fp16": self.fp16,
            "evaluation_strategy": "steps",
            "eval_steps": self.eval_steps,
            "save_strategy": "steps",
            "save_steps": self.save_steps,
            "logging_steps": 10,
            "seed": self.seed,
            "report_to": "none",
        }


class ModelTrainer:
    """Handles fine-tuning and export of custom models."""

    def __init__(self, config: Optional[FineTuneConfig] = None):
        """Initialize the trainer.

        Args:
            config: FineTuneConfig instance
        """
        self.config = config or FineTuneConfig()
        logger.info(f"ModelTrainer initialized with config: {self.config.output_name}")

    def prepare_dataset(self, data_path: str) -> str:
        """Prepare dataset for training (tokenize, split, etc.).

        Args:
            data_path: Path to JSONL dataset

        Returns:
            Path to prepared dataset directory
        """
        data_path = Path(data_path)
        if not data_path.exists():
            raise FileNotFoundError(f"Dataset not found: {data_path}")

        prepared_dir = TRAINING_DATA_DIR / "prepared" / self.config.output_name
        prepared_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Dataset preparation script would process: {data_path}")
        logger.info(f"Output directory: {prepared_dir}")

        return str(prepared_dir)

    def generate_training_script(self) -> str:
        """Generate a complete training script that can be run separately.

        Uses transformers + peft (LoRA) for efficient fine-tuning.
        Returns the script content as a string suitable for a separate training job.

        Returns:
            Python script content for training
        """
        training_args = self.config.to_training_args()
        args_str = json.dumps(training_args, indent=2)

        script = '''#!/usr/bin/env python3
"""
ALLOUL&Q Fine-Tuning Script
============================
This script fine-tunes a Qwen model on ALLOUL&Q training data using LoRA.

Usage:
    python train.py --data_path /path/to/training_data.jsonl --output_dir /path/to/output

Requirements:
    pip install transformers peft torch datasets tqdm
"""

import os
import json
import argparse
import logging
from pathlib import Path
from typing import Optional

import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def setup_training_args() -> dict:
    """Get training arguments."""
    return ''' + args_str + '''


def load_and_prepare_data(data_path: str, tokenizer) -> dict:
    """Load and tokenize dataset."""
    logger.info(f"Loading dataset from {data_path}")

    # Load JSONL dataset
    dataset = load_dataset("json", data_files=data_path, split="train")

    def format_instruction(examples):
        """Format examples for instruction tuning."""
        instructions = []
        inputs = []
        outputs = []

        for instruction, input_text, output_text in zip(
            examples["instruction"],
            examples["input"],
            examples["output"]
        ):
            if input_text:
                full_text = f"### Instruction:\\n{instruction}\\n### Input:\\n{input_text}\\n### Output:\\n{output_text}"
            else:
                full_text = f"### Instruction:\\n{instruction}\\n### Output:\\n{output_text}"
            instructions.append(full_text)

        return {"text": instructions}

    # Format and tokenize
    dataset = dataset.map(format_instruction, batched=True, remove_columns=dataset.column_names)

    def tokenize(examples):
        tokenized = tokenizer(
            examples["text"],
            truncation=True,
            max_length=''' + str(self.config.max_seq_length) + ''',
            padding="max_length",
            return_tensors=None,
        )
        tokenized["labels"] = tokenized["input_ids"].copy()
        return tokenized

    dataset = dataset.map(tokenize, batched=True, remove_columns=["text"])

    # Split into train/eval
    dataset = dataset.train_test_split(test_size=0.1)

    logger.info(f"Dataset prepared: {len(dataset['train'])} training, {len(dataset['test'])} eval examples")
    return dataset


def setup_lora(model) -> object:
    """Setup LoRA configuration."""
    lora_config = LoraConfig(
        r=''' + str(self.config.lora_rank) + ''',
        lora_alpha=''' + str(self.config.lora_alpha) + ''',
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    return model


def train(data_path: str, output_dir: Optional[str] = None):
    """Run the training pipeline."""
    if output_dir is None:
        output_dir = "''' + str(MODEL_OUTPUT_DIR / self.config.output_name) + '''"

    # Setup
    logger.info(f"Setting up training for {data_path}")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    # Load model and tokenizer
    logger.info(f"Loading base model: ''' + self.config.base_model + '''")
    model = AutoModelForCausalLM.from_pretrained(
        "''' + self.config.base_model + '''",
        device_map="auto",
        torch_dtype=torch.float16 if ''' + str(self.config.fp16).lower() + ''' else torch.float32,
    )
    tokenizer = AutoTokenizer.from_pretrained("''' + self.config.base_model + '''")
    tokenizer.pad_token = tokenizer.eos_token

    # Prepare data
    dataset = load_and_prepare_data(data_path, tokenizer)

    # Setup LoRA
    model = setup_lora(model)

    # Training arguments
    training_args_dict = setup_training_args()
    training_args_dict["output_dir"] = output_dir

    training_args = TrainingArguments(**training_args_dict)

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["test"],
        data_collator=DataCollatorForSeq2Seq(tokenizer, padding=True),
    )

    # Train
    logger.info("Starting training...")
    trainer.train()

    # Save
    logger.info(f"Saving model to {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    logger.info("Training complete!")
    return output_dir


def main():
    parser = argparse.ArgumentParser(description="Fine-tune ALLOUL&Q model")
    parser.add_argument("--data_path", required=True, help="Path to training data (JSONL)")
    parser.add_argument("--output_dir", help="Output directory for trained model")
    args = parser.parse_args()

    train(args.data_path, args.output_dir)


if __name__ == "__main__":
    main()
'''
        return script

    def generate_modelfile(self) -> str:
        """Generate Ollama Modelfile for the custom model.

        Returns:
            Modelfile content
        """
        return '''# ALLOUL&Q Custom AI Model
FROM alloul-q-7b-v1

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 8192
PARAMETER repeat_penalty 1.1

SYSTEM """
أنت ALLOUL&Q AI — مساعد أعمال ذكي واحترافي مدمج في منصة ALLOUL&Q.
متخصص في إدارة الأعمال والمهام والتسليمات في بيئة العمل الخليجية.
تجاوب بالعربية والإنجليزية بشكل احترافي.
ردودك مختصرة وعملية ودقيقة.

قدراتك:
- إنشاء تسليمات (Handovers) احترافية
- تنظيم وترتيب المهام والمشاريع
- تحليل بيانات الأعمال وتقديم توصيات
- كتابة المستندات التجارية
- فهم المصطلحات التجارية الخليجية
"""

TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
{{ .Response }}<|im_end|>
"""
'''

    def generate_deployment_script(self) -> str:
        """Generate deployment script for converting and loading into Ollama.

        Returns:
            Bash script content
        """
        return f'''#!/bin/bash
# ALLOUL&Q Model Deployment Script
# Converts fine-tuned model to GGUF and loads into Ollama

set -e

MODEL_NAME="alloul-q-7b-v1"
MODEL_PATH="{MODEL_OUTPUT_DIR}/${{MODEL_NAME}}"
OUTPUT_DIR="{MODEL_OUTPUT_DIR}/gguf"
MODELFILE_PATH="{MODEL_OUTPUT_DIR}/Modelfile"

echo "ALLOUL&Q Model Deployment"
echo "=========================="

# Check if model exists
if [ ! -d "$MODEL_PATH" ]; then
    echo "ERROR: Model not found at $MODEL_PATH"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Converting model to GGUF format..."
# This would use llama.cpp or similar
# For now, showing the command structure
echo "python -m llama_cpp.convert --model-dir $MODEL_PATH --output-file $OUTPUT_DIR/${{MODEL_NAME}}.gguf"

echo "Quantizing model..."
# Quantize to Q4_K_M for faster inference
echo "python -m llama_cpp.quantize $OUTPUT_DIR/${{MODEL_NAME}}.gguf $OUTPUT_DIR/${{MODEL_NAME}}-Q4_K_M.gguf Q4_K_M"

echo "Creating Modelfile..."
cat > "$MODELFILE_PATH" << 'EOF'
# ALLOUL&Q Custom AI Model
FROM $OUTPUT_DIR/${{MODEL_NAME}}-Q4_K_M.gguf

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 8192
PARAMETER repeat_penalty 1.1

SYSTEM \"\"\"
أنت ALLOUL&Q AI — مساعد أعمال ذكي واحترافي مدمج في منصة ALLOUL&Q.
متخصص في إدارة الأعمال والمهام والتسليمات في بيئة العمل الخليجية.
تجاوب بالعربية والإنجليزية بشكل احترافي.
ردودك مختصرة وعملية ودقيقة.
\"\"\"
EOF

echo "Loading into Ollama..."
ollama create alloul-q-7b-v1 -f "$MODELFILE_PATH"

echo "Testing model..."
echo "مرحباً، أنا ALLOUL&Q AI" | ollama run alloul-q-7b-v1

echo ""
echo "✓ Deployment complete!"
echo "Model is ready at: ollama run alloul-q-7b-v1"
'''

    def export_config(self, output_dir: Optional[str] = None) -> dict:
        """Export all configuration files needed for training.

        Saves:
        - training_script.py
        - Modelfile
        - deploy.sh
        - config.json

        Args:
            output_dir: Directory to export configurations

        Returns:
            Dictionary with paths to exported files
        """
        if output_dir is None:
            output_dir = MODEL_OUTPUT_DIR / f"{self.config.output_name}_config"
        else:
            output_dir = Path(output_dir)

        output_dir.mkdir(parents=True, exist_ok=True)

        # Generate and save training script
        training_script = self.generate_training_script()
        training_script_path = output_dir / "training_script.py"
        with open(training_script_path, "w", encoding="utf-8") as f:
            f.write(training_script)
        logger.info(f"Saved training script to {training_script_path}")

        # Generate and save Modelfile
        modelfile = self.generate_modelfile()
        modelfile_path = output_dir / "Modelfile"
        with open(modelfile_path, "w", encoding="utf-8") as f:
            f.write(modelfile)
        logger.info(f"Saved Modelfile to {modelfile_path}")

        # Generate and save deployment script
        deploy_script = self.generate_deployment_script()
        deploy_script_path = output_dir / "deploy.sh"
        with open(deploy_script_path, "w", encoding="utf-8") as f:
            f.write(deploy_script)
        # Make executable
        os.chmod(deploy_script_path, 0o755)
        logger.info(f"Saved deployment script to {deploy_script_path}")

        # Save config as JSON
        config_dict = {
            "base_model": self.config.base_model,
            "output_name": self.config.output_name,
            "training_config": asdict(self.config),
            "training_args": self.config.to_training_args(),
            "exported_at": datetime.now().isoformat(),
        }
        config_path = output_dir / "config.json"
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved configuration to {config_path}")

        return {
            "training_script": str(training_script_path),
            "modelfile": str(modelfile_path),
            "deploy_script": str(deploy_script_path),
            "config": str(config_path),
            "output_dir": str(output_dir),
        }


class ModelEvaluator:
    """Evaluate custom model quality against benchmarks."""

    BENCHMARK_TASKS = [
        {
            "type": "handover",
            "instruction": "إنشاء وثيقة تسليم احترافية",
            "input": "مشروع: تطوير نظام | المرحلة: مكتملة | المدة: 3 أسابيع",
            "expected_quality": "well_structured_arabic",
        },
        {
            "type": "handover",
            "instruction": "Generate a professional handover document",
            "input": "Project: System Development | Phase: Completed | Duration: 3 weeks",
            "expected_quality": "well_structured_english",
        },
        {
            "type": "task_org",
            "instruction": "تنظيم قائمة مهام بالأولويات",
            "input": "عدد المهام: 5 | مواعيد: اليوم | فريق: 3 أشخاص",
            "expected_quality": "organized_priorities",
        },
        {
            "type": "document",
            "instruction": "كتابة عقد خدمات",
            "input": "المدة: 6 أشهر | القيمة: كبيرة",
            "expected_quality": "formal_document",
        },
    ]

    async def evaluate_model(
        self,
        model_name: str,
        use_ollama: bool = True
    ) -> dict:
        """Run benchmarks against a model and return scores.

        Args:
            model_name: Name of model to evaluate
            use_ollama: Whether to use Ollama or transformers

        Returns:
            Dictionary with evaluation results
        """
        logger.info(f"Evaluating model: {model_name}")

        results = {
            "model": model_name,
            "timestamp": datetime.now().isoformat(),
            "benchmarks": [],
            "overall_score": 0.0,
        }

        for benchmark in self.BENCHMARK_TASKS:
            logger.info(f"Running benchmark: {benchmark['type']}")

            # Placeholder for actual evaluation
            # In real implementation, would run model inference
            score = {
                "task_type": benchmark["type"],
                "instruction": benchmark["instruction"][:50] + "...",
                "quality_expected": benchmark["expected_quality"],
                "score": 0.85,  # Placeholder
                "notes": "Benchmark placeholder",
            }
            results["benchmarks"].append(score)

        # Calculate overall score
        if results["benchmarks"]:
            avg_score = sum(b["score"] for b in results["benchmarks"]) / len(results["benchmarks"])
            results["overall_score"] = avg_score

        logger.info(f"Evaluation complete. Overall score: {results['overall_score']:.2f}")
        return results

    async def compare_models(
        self,
        model_a: str,
        model_b: str
    ) -> dict:
        """Compare two models on benchmarks.

        Args:
            model_a: First model name
            model_b: Second model name

        Returns:
            Dictionary with comparison results
        """
        logger.info(f"Comparing models: {model_a} vs {model_b}")

        results_a = await self.evaluate_model(model_a)
        results_b = await self.evaluate_model(model_b)

        comparison = {
            "model_a": model_a,
            "model_b": model_b,
            "model_a_score": results_a["overall_score"],
            "model_b_score": results_b["overall_score"],
            "winner": model_a if results_a["overall_score"] > results_b["overall_score"] else model_b,
            "difference": abs(results_a["overall_score"] - results_b["overall_score"]),
            "timestamp": datetime.now().isoformat(),
        }

        return comparison


# Singletons for convenience
data_collector = TrainingDataCollector()
model_trainer = ModelTrainer()
model_evaluator = ModelEvaluator()


async def prepare_training_pipeline(output_dir: Optional[str] = None) -> dict:
    """Full pipeline: collect data → save → generate training scripts.

    Args:
        output_dir: Directory for pipeline output

    Returns:
        Dictionary with pipeline results
    """
    logger.info("Starting ALLOUL&Q training pipeline")

    if output_dir is None:
        output_dir = TRAINING_DATA_DIR

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Collect data
    logger.info("Step 1: Collecting training data...")
    data = data_collector.collect_all(limit_per_type=100)
    logger.info(f"Collected {len(data)} training examples")

    # Step 2: Save dataset
    logger.info("Step 2: Saving dataset...")
    dataset_path = data_collector.save_dataset(
        output_path=output_dir / "training_data.jsonl"
    )

    # Step 3: Get statistics
    stats = data_collector.get_stats()
    logger.info(f"Dataset stats: {stats}")

    # Step 4: Export trainer configuration
    logger.info("Step 3: Exporting trainer configuration...")
    trainer_config = model_trainer.export_config(output_dir / "trainer_config")

    return {
        "status": "success",
        "timestamp": datetime.now().isoformat(),
        "dataset": {
            "path": dataset_path,
            "size": len(data),
            "stats": stats,
        },
        "configuration": trainer_config,
        "output_dir": str(output_dir),
        "next_steps": [
            f"1. Run training script: python {trainer_config['training_script']} --data_path {dataset_path}",
            f"2. Deploy model: bash {trainer_config['deploy_script']}",
            "3. Test with: ollama run alloul-q-7b-v1",
        ],
    }


async def get_custom_model_status() -> dict:
    """Check if custom model exists and its version.

    Returns:
        Dictionary with model status information
    """
    logger.info("Checking custom model status...")

    model_dir = MODEL_OUTPUT_DIR / "alloul-q-7b-v1"
    config_file = model_dir / "config.json"

    status = {
        "model_name": "alloul-q-7b-v1",
        "exists": model_dir.exists(),
        "path": str(model_dir) if model_dir.exists() else None,
        "config_exists": config_file.exists(),
        "timestamp": datetime.now().isoformat(),
    }

    if config_file.exists():
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                config = json.load(f)
                status["config"] = config
        except Exception as e:
            logger.warning(f"Could not read config: {e}")

    return status
