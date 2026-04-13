"""
ALLOUL&Q — Email service (SendGrid)

Usage:
    from services.email import email_service
    email_service.send("welcome", to="user@example.com", context={"name": "..."})

All templates are HTML files in services/email_templates/, branded with ALLOUL&Q.
Safe no-op when SENDGRID_API_KEY is missing.
"""
from __future__ import annotations

import os
import logging
from pathlib import Path
from typing import Optional
from string import Template

log = logging.getLogger("alloul.email")

BRAND_NAME = "ALLOUL&Q"
BRAND_NAME_AR = "اللول&Q"
BRAND_PRIMARY = "#0066FF"
BRAND_DOMAIN = "alloul.app"


class EmailService:
    def __init__(self) -> None:
        self.api_key = os.getenv("SENDGRID_API_KEY", "").strip()
        self.from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@alloul.app")
        self.from_name = os.getenv("SENDGRID_FROM_NAME", "ALLOUL&Q")
        self.enabled = bool(self.api_key)
        self.templates_dir = Path(__file__).parent / "email_templates"

    def send(
        self,
        template: str,
        to: str,
        subject: Optional[str] = None,
        context: Optional[dict] = None,
    ) -> bool:
        """Send an email using a named template. Returns True on success."""
        if not self.enabled:
            log.info(f"[email] disabled — would send '{template}' to {to}")
            return False

        ctx = context or {}
        ctx.setdefault("brand", BRAND_NAME)
        ctx.setdefault("brand_ar", BRAND_NAME_AR)
        ctx.setdefault("primary", BRAND_PRIMARY)
        ctx.setdefault("domain", BRAND_DOMAIN)
        ctx.setdefault("year", 2026)

        html = self._render(template, ctx)
        if html is None:
            log.error(f"[email] template not found: {template}")
            return False

        final_subject = subject or SUBJECTS.get(template, f"{BRAND_NAME} Notification")

        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, To, Content

            sg = sendgrid.SendGridAPIClient(self.api_key)
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to),
                subject=final_subject,
                html_content=Content("text/html", html),
            )
            response = sg.send(message)
            log.info(f"[email] sent '{template}' to {to}: {response.status_code}")
            return 200 <= response.status_code < 300
        except ImportError:
            log.error("[email] sendgrid package not installed")
            return False
        except Exception as e:
            log.error(f"[email] send failed: {e}")
            return False

    def _render(self, template: str, context: dict) -> Optional[str]:
        path = self.templates_dir / f"{template}.html"
        if not path.exists():
            return None
        raw = path.read_text(encoding="utf-8")
        try:
            return Template(raw).safe_substitute(context)
        except Exception as e:
            log.error(f"[email] render error in {template}: {e}")
            return raw


email_service = EmailService()


# ─── Subject lines per template ─────────────────────────────────────────────

SUBJECTS = {
    # Auth
    "welcome": "مرحباً بك في ALLOUL&Q",
    "email_verification": "أكّد بريدك الإلكتروني",
    "password_reset": "إعادة تعيين كلمة المرور",
    "password_changed": "تم تغيير كلمة المرور",
    "2fa_enabled": "المصادقة الثنائية مفعّلة",
    "new_login_alert": "تم تسجيل الدخول من جهاز جديد",
    "suspicious_activity": "نشاط مشبوه على حسابك",
    # Trial
    "trial_started": "بدأت تجربتك المجانية — 14 يوم",
    "trial_tips": "نصائح للاستفادة القصوى من ALLOUL&Q",
    "trial_midpoint": "نصف التجربة انتهى — إليك ما حققته",
    "trial_ending_soon": "3 أيام متبقية من تجربتك",
    "trial_last_day": "آخر يوم من التجربة",
    "trial_ended": "انتهت فترة التجربة",
    # Subscription
    "subscription_created": "تم تفعيل اشتراكك في ALLOUL&Q",
    "payment_success": "تم استلام الدفع",
    "payment_failed": "فشل الدفع — يرجى تحديث طريقة الدفع",
    "invoice_receipt": "إيصال الفاتورة",
    "subscription_renewed": "تم تجديد اشتراكك",
    "subscription_cancelled": "تم إلغاء اشتراكك",
    "subscription_upgraded": "تم ترقية خطتك",
    # Workspace
    "user_invited": "تمت دعوتك إلى مساحة عمل",
    "invitation_accepted": "قبل شخص دعوتك",
    "user_removed": "تم إزالتك من مساحة العمل",
    "employee_limit_warning": "اقترابك من حد الموظفين",
    "employee_limit_critical": "⚠️ حد الموظفين شبه ممتلئ",
    "enterprise_upgrade_needed": "تحتاج خطة Enterprise",
    # Enterprise
    "enterprise_inquiry_received": "استلمنا طلب Enterprise",
    "demo_booked_confirmation": "تأكيد موعد العرض التوضيحي",
    "demo_reminder": "تذكير: عرض توضيحي غداً",
}
