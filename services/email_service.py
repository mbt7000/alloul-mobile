"""SendGrid email service for ALLOUL&Q."""

from __future__ import annotations
import logging
from typing import Optional
from datetime import datetime
from config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for ALLOUL&Q using SendGrid."""

    def __init__(self):
        """Initialize the email service."""
        self.api_key = getattr(settings, "SENDGRID_API_KEY", None)
        self.from_email = getattr(settings, "FROM_EMAIL", "noreply@alloulaq.com")
        self.from_name = "ALLOUL&Q"
        self.use_sendgrid = self.api_key is not None

    def _get_header_html(self) -> str:
        """Get the standard email header with ALLOUL&Q branding."""
        return """
        <div style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 28px;">
                ALLOUL&Q
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0; font-size: 14px;">
                نظام إدارة الموارد البشرية
            </p>
        </div>
        """

    def _get_footer_html(self, unsubscribe_url: str = "#") -> str:
        """Get the standard email footer."""
        return f"""
        <div style="background-color: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 30px 20px; text-align: center; direction: rtl;">
            <p style="margin: 0 0 15px 0; color: #666; font-size: 12px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                © 2026 ALLOUL&Q. جميع الحقوق محفوظة
            </p>
            <p style="margin: 0; color: #999; font-size: 11px;">
                <a href="{unsubscribe_url}" style="color: #0066cc; text-decoration: none;">إلغاء الاشتراك</a>
            </p>
        </div>
        """

    def _wrap_email_template(self, content_html: str, unsubscribe_url: str = "#") -> str:
        """Wrap content in a complete email template."""
        return f"""
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ALLOUL&Q</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
                {self._get_header_html()}
                <div style="padding: 30px 20px; direction: rtl; color: #333;">
                    {content_html}
                </div>
                {self._get_footer_html(unsubscribe_url)}
            </div>
        </body>
        </html>
        """

    def _send_via_sendgrid(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
    ) -> bool:
        """Send email via SendGrid API."""
        if not self.use_sendgrid:
            return False

        try:
            import requests

            from_email = from_email or self.from_email
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            data = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": from_email, "name": self.from_name},
                "subject": subject,
                "content": [{"type": "text/html", "value": html_content}],
            }

            response = requests.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=data,
                headers=headers,
                timeout=10,
            )

            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(
                    f"SendGrid error: {response.status_code} - {response.text}"
                )
                return False
        except Exception as e:
            logger.error(f"Error sending email via SendGrid: {e}")
            return False

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
    ) -> bool:
        """Base email sending method."""
        if not to_email:
            logger.warning("No recipient email provided")
            return False

        from_email = from_email or self.from_email

        # Try SendGrid first
        if self.use_sendgrid:
            return self._send_via_sendgrid(to_email, subject, html_content, from_email)

        # Fallback: just log the email
        logger.info(
            f"Email (not sent - SendGrid not configured): To={to_email}, Subject={subject}"
        )
        return True

    # ============================================================================
    # Trial Emails
    # ============================================================================

    def send_trial_welcome(
        self, to_email: str, company_name: str, admin_name: str
    ) -> bool:
        """Send trial welcome email (Day 0)."""
        content = f"""
        <p>مرحباً {admin_name},</p>

        <p>شكراً لك لاختيارك ALLOUL&Q! نحن متحمسون لتقديم حل إدارة الموارد البشرية الشامل لشركتك.</p>

        <p><strong>ما يمكنك تجربته خلال فترة التجربة المجانية (14 يوماً):</strong></p>
        <ul style="line-height: 1.8;">
            <li>إدارة الموظفين والبيانات الشخصية</li>
            <li>إدارة الرواتب والمكافآت</li>
            <li>إدارة العطل والإجازات</li>
            <li>تقارير الأداء الشاملة</li>
            <li>لوحة تحكم مركزية سهلة الاستخدام</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/dashboard" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                ابدأ الآن
            </a>
        </div>

        <p>إذا كان لديك أي أسئلة، لا تتردد في التواصل معنا على support@alloulaq.com</p>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(to_email, "مرحباً بك في ALLOUL&Q - ابدأ تجربتك الآن", html)

    def send_trial_tips(
        self, to_email: str, company_name: str, admin_name: str
    ) -> bool:
        """Send trial tips email (Day 3)."""
        content = f"""
        <p>مرحباً {admin_name},</p>

        <p>نأمل أن تستمتع باستخدام ALLOUL&Q! إليك بعض النصائح لتحقيق أقصى استفادة:</p>

        <ol style="line-height: 1.8;">
            <li><strong>إضافة الموظفين:</strong> قم بإضافة جميع موظفيك لتحصل على صورة شاملة لقوتك العاملة</li>
            <li><strong>تخصيص الأدوار:</strong> حدد الأدوار والأقسام المختلفة لتنظيم بيانات موظفيك</li>
            <li><strong>الاستفادة من التقارير:</strong> استخدم لوحة التحكم لرؤية رؤى حول الأداء والإنتاجية</li>
            <li><strong>ضبط الإعدادات:</strong> خصص النظام ليناسب احتياجات شركتك</li>
        </ol>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/employees" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                أضف موظفيك الآن
            </a>
        </div>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(to_email, "نصائح لتحقيق أقصى استفادة من ALLOUL&Q", html)

    def send_trial_midcheck(
        self, to_email: str, company_name: str, admin_name: str
    ) -> bool:
        """Send trial mid-check email (Day 7)."""
        content = f"""
        <p>مرحباً {admin_name},</p>

        <p>نصف الطريق! نتمنى أن تكون قد اكتشفت بالفعل قيمة ALLOUL&Q.</p>

        <p><strong>كيف تسير الأمور؟</strong> نود أن نسمع رأيك!</p>

        <ul style="line-height: 1.8;">
            <li>هل واجهت أي مشاكل أو لديك أسئلة؟</li>
            <li>ما هي الميزات التي أعجبتك أكثر؟</li>
            <li>هل هناك أي شيء تود تحسينه؟</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/support" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                تواصل مع فريق الدعم
            </a>
        </div>

        <p>سيكون فريقنا سعيداً بمساعدتك في استخدام ALLOUL&Q بشكل فعال.</p>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, "كيف تسير تجربتك مع ALLOUL&Q؟", html
        )

    def send_trial_warning(
        self, to_email: str, company_name: str, admin_name: str, days_left: int = 3
    ) -> bool:
        """Send trial warning email (Day 11)."""
        content = f"""
        <p>مرحباً {admin_name},</p>

        <p>تنبيه مهم: تنتهي فترة التجربة المجانية الخاصة بك خلال <strong>{days_left} أيام فقط</strong>!</p>

        <p>لعدم فقدان الوصول إلى ALLOUL&Q والبيانات الثمينة لشركتك، يرجى اختيار خطة الاشتراك المناسبة الآن.</p>

        <p><strong>خطط الاشتراك:</strong></p>
        <ul style="line-height: 1.8;">
            <li><strong>البداية:</strong> للشركات الصغيرة (حتى 50 موظف)</li>
            <li><strong>الاحترافية:</strong> للشركات المتوسطة (حتى 500 موظف)</li>
            <li><strong>المؤسسات:</strong> للشركات الكبيرة (موارد غير محدودة)</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/billing/upgrade" style="background-color: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                اختر خطتك الآن
            </a>
        </div>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, f"تجربتك تنتهي خلال {days_left} أيام!", html
        )

    def send_trial_lastday(
        self, to_email: str, company_name: str, admin_name: str
    ) -> bool:
        """Send trial last day email (Day 13)."""
        content = f"""
        <p>مرحباً {admin_name},</p>

        <p>هذا هو آخر يوم من فترة التجربة المجانية!</p>

        <p>لا تفقد الوصول إلى ALLOUL&Q وجميع الميزات الرائعة. قم بالترقية الآن لاستمرار استخدام النظام.</p>

        <p style="background-color: #fff3cd; padding: 15px; border-right: 4px solid #ff6b35; margin: 20px 0;">
            <strong>تنبيه:</strong> بدءاً من غد، لن تتمكن من الوصول إلى حسابك إلا بعد اختيار خطة الاشتراك.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/billing/upgrade" style="background-color: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                ترقية الآن - اليوم الأخير
            </a>
        </div>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, "آخر يوم في التجربة المجانية - لا تفقد وصولك!", html
        )

    def send_trial_ended(
        self, to_email: str, company_name: str, admin_name: str
    ) -> bool:
        """Send trial ended email (Day 14)."""
        content = f"""
        <p>مرحباً {admin_name},</p>

        <p>انتهت فترة التجربة المجانية الخاصة بك.</p>

        <p>نأمل أن تكون قد استمتعت باستخدام ALLOUL&Q. لعدم فقدان بيانات شركتك والوصول إلى النظام، يرجى الاشتراك الآن.</p>

        <p style="background-color: #f8d7da; padding: 15px; border-right: 4px solid #dc3545; margin: 20px 0; color: #721c24;">
            <strong>تنبيه:</strong> حسابك محفوظ حالياً، لكن سيتم حذف البيانات تلقائياً بعد 30 يوماً إذا لم تقم بالاشتراك.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/billing/upgrade" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                اشترك الآن
            </a>
        </div>

        <p>إذا كان لديك أي أسئلة أو تحتاج إلى مساعدة، لا تتردد في التواصل معنا على sales@alloulaq.com</p>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, "انتهت فترة التجربة - اشترك الآن لحفظ بيانات شركتك", html
        )

    # ============================================================================
    # Subscription Emails
    # ============================================================================

    def send_subscription_welcome(
        self, to_email: str, company_name: str, plan_name: str, amount: str
    ) -> bool:
        """Send subscription welcome email."""
        content = f"""
        <p>مرحباً,</p>

        <p>شكراً لاختيارك خطة <strong>{plan_name}</strong> من ALLOUL&Q!</p>

        <p><strong>تفاصيل الاشتراك:</strong></p>
        <ul style="line-height: 1.8;">
            <li>الخطة: {plan_name}</li>
            <li>السعر: {amount}</li>
            <li>تاريخ البدء: {datetime.now().strftime('%Y-%m-%d')}</li>
        </ul>

        <p>يمكنك الآن الاستمتاع بجميع ميزات ALLOUL&Q الكاملة!</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/dashboard" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                اذهب إلى لوحة التحكم
            </a>
        </div>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, f"مرحباً بك في ALLOUL&Q - {plan_name}", html
        )

    def send_payment_success(
        self, to_email: str, company_name: str, amount: str, invoice_url: str
    ) -> bool:
        """Send payment success email."""
        content = f"""
        <p>مرحباً,</p>

        <p>تم استقبال دفعتك بنجاح!</p>

        <p><strong>تفاصيل الدفع:</strong></p>
        <ul style="line-height: 1.8;">
            <li>المبلغ: {amount}</li>
            <li>التاريخ: {datetime.now().strftime('%Y-%m-%d %H:%M')}</li>
            <li>الحالة: ✓ مكتملة</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{invoice_url}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                عرض الفاتورة
            </a>
        </div>

        <p>شكراً لدعمك لـ ALLOUL&Q!</p>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(to_email, "تأكيد الدفع - دفعتك تمت بنجاح", html)

    def send_payment_failed(
        self, to_email: str, company_name: str, amount: str
    ) -> bool:
        """Send payment failed email."""
        content = f"""
        <p>مرحباً,</p>

        <p>للأسف، فشل معالجة دفعتك.</p>

        <p><strong>تفاصيل الدفع الفاشل:</strong></p>
        <ul style="line-height: 1.8;">
            <li>المبلغ: {amount}</li>
            <li>التاريخ: {datetime.now().strftime('%Y-%m-%d %H:%M')}</li>
            <li>الحالة: ✗ فشلت</li>
        </ul>

        <p style="background-color: #f8d7da; padding: 15px; border-right: 4px solid #dc3545; margin: 20px 0; color: #721c24;">
            يرجى التحقق من بيانات بطاقتك الائتمانية والمحاولة مرة أخرى.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/billing/payment" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                أعد محاولة الدفع
            </a>
        </div>

        <p>إذا استمرت المشكلة، يرجى التواصل معنا على support@alloulaq.com</p>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, "تنبيه - فشلت معالجة الدفع", html
        )

    def send_renewal_reminder(
        self,
        to_email: str,
        company_name: str,
        plan_name: str,
        renewal_date: str,
        amount: str,
    ) -> bool:
        """Send renewal reminder email."""
        content = f"""
        <p>مرحباً,</p>

        <p>تذكير: اشتراكك في ALLOUL&Q سينتهي قريباً.</p>

        <p><strong>تفاصيل الاشتراك:</strong></p>
        <ul style="line-height: 1.8;">
            <li>الخطة: {plan_name}</li>
            <li>تاريخ التجديد: {renewal_date}</li>
            <li>المبلغ: {amount}</li>
        </ul>

        <p>ستتم عملية التجديد تلقائياً في تاريخ انتهاء الاشتراك. لا توجد أي خطوات إضافية مطلوبة منك.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/billing/manage" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                إدارة الاشتراك
            </a>
        </div>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, f"تذكير التجديد - {plan_name}", html
        )

    def send_upgrade_confirmation(
        self, to_email: str, company_name: str, old_plan: str, new_plan: str
    ) -> bool:
        """Send upgrade confirmation email."""
        content = f"""
        <p>مرحباً,</p>

        <p>تم ترقية اشتراكك بنجاح!</p>

        <p><strong>تفاصيل الترقية:</strong></p>
        <ul style="line-height: 1.8;">
            <li>الخطة السابقة: {old_plan}</li>
            <li>الخطة الجديدة: <strong>{new_plan}</strong></li>
            <li>التاريخ: {datetime.now().strftime('%Y-%m-%d')}</li>
        </ul>

        <p>يمكنك الآن الاستمتاع بجميع ميزات الخطة الجديدة على الفور!</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/dashboard" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                استكشف الميزات الجديدة
            </a>
        </div>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, f"تم الترقية إلى {new_plan}", html
        )

    def send_cancellation_confirmation(
        self, to_email: str, company_name: str, end_date: str
    ) -> bool:
        """Send cancellation confirmation email."""
        content = f"""
        <p>مرحباً,</p>

        <p>تم إلغاء اشتراكك في ALLOUL&Q.</p>

        <p><strong>تفاصيل الإلغاء:</strong></p>
        <ul style="line-height: 1.8;">
            <li>تاريخ الإلغاء: {datetime.now().strftime('%Y-%m-%d')}</li>
            <li>تاريخ انتهاء الوصول: {end_date}</li>
        </ul>

        <p>ستتمكن من الوصول إلى حسابك حتى {end_date}. بعد هذا التاريخ، سيتم حذف البيانات تلقائياً.</p>

        <p style="background-color: #e7f3ff; padding: 15px; border-right: 4px solid #0066cc; margin: 20px 0;">
            <strong>هل تود العودة؟</strong> يمكنك إعادة تفعيل الاشتراك في أي وقت.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/billing/reactivate" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                إعادة تفعيل الاشتراك
            </a>
        </div>

        <p>نتمنى أن تتاح لنا فرصة أخرى لخدمتك!</p>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, "تأكيد إلغاء الاشتراك", html
        )

    # ============================================================================
    # Employee Alert Emails
    # ============================================================================

    def send_employee_growth_alert(
        self,
        to_email: str,
        company_name: str,
        current_count: int,
        limit: int,
        alert_level: str,
    ) -> bool:
        """Send employee growth alert email."""
        percentage = (current_count / limit) * 100
        color = "#ff6b35" if alert_level == "warning" else "#dc3545"
        status = "تنبيه" if alert_level == "warning" else "حرج"

        content = f"""
        <p>مرحباً,</p>

        <p><strong>{status}:</strong> اقتربت من حد الموظفين المسموح به في خطتك الحالية.</p>

        <p><strong>الوضع الحالي:</strong></p>
        <ul style="line-height: 1.8;">
            <li>عدد الموظفين الحالي: {current_count}</li>
            <li>حد الخطة: {limit}</li>
            <li>النسبة المستخدمة: {percentage:.1f}%</li>
        </ul>

        <div style="background-color: #fff3cd; padding: 15px; border-right: 4px solid {color}; margin: 20px 0;">
            <p>يرجى ترقية خطتك لإضافة المزيد من الموظفين، أو حذف الموظفين غير النشطين.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/billing/upgrade" style="background-color: {color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                ترقية الخطة الآن
            </a>
        </div>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, f"{status}: اقتربت من حد الموظفين - {company_name}", html
        )

    def send_enterprise_offer(
        self, to_email: str, company_name: str, current_count: int
    ) -> bool:
        """Send enterprise offer email."""
        content = f"""
        <p>مرحباً,</p>

        <p>نلاحظ أن شركتك تتنمو بشكل رائع مع {current_count} موظف!</p>

        <p>قد تكون خطة المؤسسات من ALLOUL&Q هي الحل المثالي لاحتياجاتك. تتضمن:</p>
        <ul style="line-height: 1.8;">
            <li>موارد موظفين غير محدودة</li>
            <li>دعم أولويات مخصص</li>
            <li>تكاملات متقدمة</li>
            <li>تقارير مخصصة</li>
            <li>تدريب وإعداد مخصص</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/enterprise" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                تعرف على خطة المؤسسات
            </a>
        </div>

        <p>سيكون فريقنا سعيداً بمناقشة احتياجاتك الخاصة. تواصل معنا على sales@alloulaq.com</p>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, "عرض خاص: ترقية إلى خطة المؤسسات", html
        )

    # ============================================================================
    # Enterprise Emails
    # ============================================================================

    def send_demo_confirmation(
        self,
        to_email: str,
        contact_name: str,
        company_name: str,
        demo_date: Optional[str] = None,
    ) -> bool:
        """Send demo confirmation email."""
        date_text = f"في {demo_date}" if demo_date else "قريباً"

        content = f"""
        <p>مرحباً {contact_name},</p>

        <p>شكراً لاهتمامك بـ ALLOUL&Q!</p>

        <p>تم جدولة عرضك التوضيحي {date_text}. سيقوم فريقنا بعرض:</p>
        <ul style="line-height: 1.8;">
            <li>ميزات إدارة الموارد البشرية الشاملة</li>
            <li>لوحة التحكم والتقارير</li>
            <li>التكاملات المتاحة</li>
            <li>إجابات على أسئلتك</li>
        </ul>

        <p style="background-color: #e7f3ff; padding: 15px; border-right: 4px solid #0066cc; margin: 20px 0;">
            <strong>معلومات مهمة:</strong> سيتصل بك أحد أعضاء فريقنا قبل العرض التوضيحي لتأكيد التفاصيل.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/demo" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                إدارة العرض التوضيحي
            </a>
        </div>

        <p>مع أطيب التحيات,<br/>فريق ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, "تأكيد العرض التوضيحي - ALLOUL&Q", html
        )

    def send_sales_intro(
        self, to_email: str, contact_name: str, company_name: str
    ) -> bool:
        """Send sales introduction email."""
        content = f"""
        <p>مرحباً {contact_name},</p>

        <p>شكراً لاهتمامك بـ ALLOUL&Q!</p>

        <p>أنا عضو في فريق المبيعات لدينا، وأود أن أتعرف على احتياجات {company_name} من حلول إدارة الموارد البشرية.</p>

        <p>يمكننا مساعدتك في:</p>
        <ul style="line-height: 1.8;">
            <li>تحديد الحل الأمثل لحجم وطبيعة شركتك</li>
            <li>فهم الميزات التي ستفيد عملك أكثر</li>
            <li>تقديم عرض سعري مخصص</li>
            <li>إعداد سلس للنظام</li>
        </ul>

        <p>هل يمكننا جدولة اجتماع قصير لمناقشة احتياجاتك؟</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.alloulaq.com/schedule-call" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                جدولة اتصال
            </a>
        </div>

        <p>أتطلع للحديث معك!</p>

        <p>مع أطيب التحيات,<br/>فريق المبيعات - ALLOUL&Q</p>
        """
        html = self._wrap_email_template(content)
        return self.send_email(
            to_email, "مقدمة شخصية - ALLOUL&Q", html
        )


# Singleton instance
email_service = EmailService()
