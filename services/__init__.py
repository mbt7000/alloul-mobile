# Company Workspace Service Layer
# Thin business-logic helpers used by routers.
# Keeps routing code clean and logic reusable.
from .company_service import CompanyService
from .member_service import MemberService
from .project_service import ProjectService
from .email_service import email_service
from .email_scheduler import (
    check_trial_emails,
    check_employee_alerts,
    check_renewal_reminders,
    check_enterprise_offers,
    run_all_email_checks,
)

__all__ = [
    "CompanyService",
    "MemberService",
    "ProjectService",
    "email_service",
    "check_trial_emails",
    "check_employee_alerts",
    "check_renewal_reminders",
    "check_enterprise_offers",
    "run_all_email_checks",
]
