"""Background email scheduler for ALLOUL&Q trial and alert emails."""

from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta
from database import SessionLocal
from models import Subscription, Company, User, CompanyMember
from services.email_service import email_service

logger = logging.getLogger(__name__)


def check_trial_emails() -> None:
    """Check all trialing subscriptions and send appropriate emails based on day."""
    db = SessionLocal()
    try:
        # Query all subscriptions with trialing status
        trials = db.query(Subscription).filter(
            Subscription.status == "trialing"
        ).all()

        for sub in trials:
            # Skip if no trial end date
            if not sub.trial_end:
                logger.warning(f"Subscription {sub.id} has no trial_end date")
                continue

            # Get company info
            company = db.query(Company).filter(
                Company.id == sub.company_id
            ).first()
            if not company:
                logger.warning(
                    f"Company not found for subscription {sub.id}"
                )
                continue

            # Find owner/admin member
            admin_member = db.query(CompanyMember).filter(
                CompanyMember.company_id == company.id,
                CompanyMember.role == "owner"
            ).first()
            if not admin_member:
                logger.warning(
                    f"No owner found for company {company.id}"
                )
                continue

            # Get user info
            user = db.query(User).filter(
                User.id == admin_member.user_id
            ).first()
            if not user:
                logger.warning(
                    f"User not found for member {admin_member.id}"
                )
                continue

            # Calculate trial day (0-indexed, where 0 is start day)
            trial_end_utc = sub.trial_end.replace(
                tzinfo=timezone.utc
            ) if sub.trial_end.tzinfo is None else sub.trial_end
            now_utc = datetime.now(timezone.utc)
            days_until_end = (trial_end_utc - now_utc).days
            trial_day = 14 - days_until_end

            logger.info(
                f"Company {company.name} (ID: {company.id}): "
                f"Trial day {trial_day}, days until end: {days_until_end}"
            )

            # Send emails based on trial day
            admin_name = user.name or "Partner"

            try:
                if trial_day == 0:
                    logger.info(
                        f"Sending welcome email to {user.email} "
                        f"for {company.name}"
                    )
                    email_service.send_trial_welcome(
                        user.email, company.name, admin_name
                    )
                elif trial_day == 3:
                    logger.info(
                        f"Sending day 3 tips email to {user.email} "
                        f"for {company.name}"
                    )
                    email_service.send_trial_tips(
                        user.email, company.name, admin_name
                    )
                elif trial_day == 7:
                    logger.info(
                        f"Sending day 7 midcheck email to {user.email} "
                        f"for {company.name}"
                    )
                    email_service.send_trial_midcheck(
                        user.email, company.name, admin_name
                    )
                elif trial_day == 11:
                    logger.info(
                        f"Sending day 11 warning email to {user.email} "
                        f"for {company.name}"
                    )
                    email_service.send_trial_warning(
                        user.email, company.name, admin_name, days_left=3
                    )
                elif trial_day == 13:
                    logger.info(
                        f"Sending day 13 last day email to {user.email} "
                        f"for {company.name}"
                    )
                    email_service.send_trial_lastday(
                        user.email, company.name, admin_name
                    )
                elif trial_day >= 14:
                    logger.info(
                        f"Sending day 14+ ended email to {user.email} "
                        f"for {company.name}"
                    )
                    email_service.send_trial_ended(
                        user.email, company.name, admin_name
                    )
            except Exception as e:
                logger.error(
                    f"Error sending trial email for {company.name}: {e}",
                    exc_info=True
                )

    except Exception as e:
        logger.error(f"Error in trial email check: {e}", exc_info=True)
    finally:
        db.close()


def check_employee_alerts() -> None:
    """Check companies approaching employee limits and send alerts."""
    db = SessionLocal()
    try:
        # Query all active subscriptions
        subscriptions = db.query(Subscription).filter(
            Subscription.status == "active"
        ).all()

        for sub in subscriptions:
            # Get company info
            company = db.query(Company).filter(
                Company.id == sub.company_id
            ).first()
            if not company:
                continue

            # Get the plan details (assuming there's a plan_name field)
            plan_name = getattr(sub, "plan_name", "starter")

            # Define employee limits per plan
            plan_limits = {
                "starter": 50,
                "professional": 500,
                "enterprise": float("inf"),
            }
            limit = plan_limits.get(plan_name.lower(), 50)

            # Skip if unlimited (enterprise)
            if limit == float("inf"):
                continue

            # Count active employees for the company
            from models import Employee

            employee_count = db.query(Employee).filter(
                Employee.company_id == company.id,
                Employee.status == "active"
            ).count()

            logger.info(
                f"Company {company.name}: "
                f"{employee_count}/{limit} employees"
            )

            # Check if approaching limit (80% or more)
            if employee_count >= limit:
                # Critical: at or over limit
                logger.warning(
                    f"Company {company.name} at/over employee limit: "
                    f"{employee_count}/{limit}"
                )
                _send_employee_alert(
                    db, company, employee_count, limit, "critical"
                )
            elif employee_count >= (limit * 0.8):
                # Warning: 80% of limit
                logger.warning(
                    f"Company {company.name} approaching employee limit: "
                    f"{employee_count}/{limit}"
                )
                _send_employee_alert(
                    db, company, employee_count, limit, "warning"
                )

    except Exception as e:
        logger.error(
            f"Error in employee alert check: {e}", exc_info=True
        )
    finally:
        db.close()


def _send_employee_alert(
    db,
    company: Company,
    employee_count: int,
    limit: int,
    alert_level: str,
) -> None:
    """Send employee growth alert to company admin."""
    try:
        # Find owner/admin member
        admin_member = db.query(CompanyMember).filter(
            CompanyMember.company_id == company.id,
            CompanyMember.role == "owner"
        ).first()

        if not admin_member:
            logger.warning(
                f"No owner found for company {company.id} "
                f"to send employee alert"
            )
            return

        # Get user info
        user = db.query(User).filter(
            User.id == admin_member.user_id
        ).first()

        if not user:
            logger.warning(
                f"User not found for member {admin_member.id}"
            )
            return

        logger.info(
            f"Sending {alert_level} employee alert to {user.email} "
            f"for {company.name}"
        )
        email_service.send_employee_growth_alert(
            user.email,
            company.name,
            employee_count,
            limit,
            alert_level,
        )
    except Exception as e:
        logger.error(
            f"Error sending employee alert for {company.name}: {e}",
            exc_info=True,
        )


def check_renewal_reminders() -> None:
    """Check subscriptions nearing renewal and send reminders."""
    db = SessionLocal()
    try:
        # Query all active subscriptions
        subscriptions = db.query(Subscription).filter(
            Subscription.status == "active"
        ).all()

        now = datetime.now(timezone.utc)
        reminder_window = timedelta(days=7)  # Remind 7 days before renewal

        for sub in subscriptions:
            # Get renewal date (usually end of billing cycle)
            if not hasattr(sub, "current_period_end") or not sub.current_period_end:
                continue

            period_end = sub.current_period_end.replace(
                tzinfo=timezone.utc
            ) if sub.current_period_end.tzinfo is None else sub.current_period_end

            days_until_renewal = (period_end - now).days

            # Send reminder if within 7 days
            if 0 <= days_until_renewal <= 7:
                # Get company and user info
                company = db.query(Company).filter(
                    Company.id == sub.company_id
                ).first()
                if not company:
                    continue

                admin_member = db.query(CompanyMember).filter(
                    CompanyMember.company_id == company.id,
                    CompanyMember.role == "owner"
                ).first()
                if not admin_member:
                    continue

                user = db.query(User).filter(
                    User.id == admin_member.user_id
                ).first()
                if not user:
                    continue

                plan_name = getattr(sub, "plan_name", "Professional")
                amount = getattr(sub, "amount", "N/A")
                renewal_date_str = period_end.strftime("%Y-%m-%d")

                try:
                    logger.info(
                        f"Sending renewal reminder to {user.email} "
                        f"for {company.name}"
                    )
                    email_service.send_renewal_reminder(
                        user.email,
                        company.name,
                        plan_name,
                        renewal_date_str,
                        str(amount),
                    )
                except Exception as e:
                    logger.error(
                        f"Error sending renewal reminder for "
                        f"{company.name}: {e}",
                        exc_info=True,
                    )

    except Exception as e:
        logger.error(
            f"Error in renewal reminder check: {e}", exc_info=True
        )
    finally:
        db.close()


def check_enterprise_offers() -> None:
    """Check companies with high employee counts and send enterprise offers."""
    db = SessionLocal()
    try:
        from models import Employee

        # Query all non-enterprise subscriptions
        subscriptions = db.query(Subscription).filter(
            Subscription.status == "active"
        ).all()

        for sub in subscriptions:
            plan_name = getattr(sub, "plan_name", "starter")

            # Skip if already on enterprise plan
            if plan_name.lower() == "enterprise":
                continue

            # Get company info
            company = db.query(Company).filter(
                Company.id == sub.company_id
            ).first()
            if not company:
                continue

            # Count active employees
            employee_count = db.query(Employee).filter(
                Employee.company_id == company.id,
                Employee.status == "active"
            ).count()

            # Send enterprise offer if 200+ employees
            if employee_count >= 200:
                admin_member = db.query(CompanyMember).filter(
                    CompanyMember.company_id == company.id,
                    CompanyMember.role == "owner"
                ).first()

                if not admin_member:
                    continue

                user = db.query(User).filter(
                    User.id == admin_member.user_id
                ).first()

                if not user:
                    continue

                try:
                    logger.info(
                        f"Sending enterprise offer to {user.email} "
                        f"for {company.name}"
                    )
                    email_service.send_enterprise_offer(
                        user.email, company.name, employee_count
                    )
                except Exception as e:
                    logger.error(
                        f"Error sending enterprise offer for "
                        f"{company.name}: {e}",
                        exc_info=True,
                    )

    except Exception as e:
        logger.error(
            f"Error in enterprise offer check: {e}", exc_info=True
        )
    finally:
        db.close()


def run_all_email_checks() -> None:
    """Run all email scheduler checks."""
    logger.info("Starting email scheduler checks")
    check_trial_emails()
    check_employee_alerts()
    check_renewal_reminders()
    check_enterprise_offers()
    logger.info("Completed email scheduler checks")
