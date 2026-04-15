from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import SessionLocal
from models import (
    Company, CompanyMember, Subscription, SubscriptionNotification, User
)
from plan_limits import (
    PLAN_FEATURES, check_employee_threshold, get_plan_features, EMPLOYEE_ALERT_THRESHOLDS
)

logger = logging.getLogger(__name__)


def check_can_add_employee(db: Session, company_id: int) -> dict:
    """
    Check if a company can add another employee based on their plan.

    Args:
        db: Database session
        company_id: Company ID to check

    Returns:
        Dictionary with permission status, current count, limit, and alert info
    """
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            logger.warning(f"Company {company_id} not found")
            return {
                "allowed": False,
                "current_count": 0,
                "limit": 0,
                "plan_id": None,
                "message": "الشركة غير موجودة",
                "alert_level": None,
                "upgrade_needed": False,
                "next_plan": None,
            }

        # Get active subscription
        subscription = db.query(Subscription).filter(
            Subscription.company_id == company_id,
            Subscription.status == "active"
        ).first()

        if not subscription:
            logger.warning(f"No active subscription for company {company_id}")
            return {
                "allowed": False,
                "current_count": 0,
                "limit": 0,
                "plan_id": None,
                "message": "لا توجد خطة مشترك بها نشطة",
                "alert_level": None,
                "upgrade_needed": True,
                "next_plan": "professional",
            }

        # Count current employees
        employee_count = db.query(func.count(CompanyMember.id)).filter(
            CompanyMember.company_id == company_id,
            CompanyMember.is_active == True
        ).scalar() or 0

        # Get plan features
        plan_features = get_plan_features(subscription.plan_id)
        employee_limit = plan_features.get("max_employees", 0)

        # Check if at limit (blocked)
        if employee_count >= employee_limit:
            logger.info(f"Company {company_id} at employee limit: {employee_count}/{employee_limit}")
            return {
                "allowed": False,
                "current_count": employee_count,
                "limit": employee_limit,
                "plan_id": subscription.plan_id,
                "message": "وصلت للحد الأقصى من الموظفين في خطتك الحالية",
                "alert_level": "blocked",
                "upgrade_needed": True,
                "next_plan": _get_next_plan(subscription.plan_id),
            }

        # Check if within alert thresholds
        alert_level = None
        next_plan = None

        threshold_percentages = EMPLOYEE_ALERT_THRESHOLDS.get(subscription.plan_id, [])
        current_percentage = (employee_count / employee_limit * 100) if employee_limit > 0 else 0

        for threshold_pct in sorted(threshold_percentages):
            if current_percentage >= threshold_pct:
                if threshold_pct >= 95:
                    alert_level = "critical"
                elif threshold_pct >= 85:
                    alert_level = "warning"
                next_plan = _get_next_plan(subscription.plan_id)

        upgrade_needed = alert_level is not None

        message = f"لديك {employee_count} موظف من أصل {employee_limit}"
        if alert_level == "critical":
            message = "تنبيه: أنت قريب جداً من الحد الأقصى للموظفين. يرجى ترقية خطتك."
        elif alert_level == "warning":
            message = "تنبيه: قد تكون قريباً من الحد الأقصى للموظفين."

        logger.info(f"Company {company_id}: {employee_count}/{employee_limit} employees, alert_level={alert_level}")

        return {
            "allowed": True,
            "current_count": employee_count,
            "limit": employee_limit,
            "plan_id": subscription.plan_id,
            "message": message,
            "alert_level": alert_level,
            "upgrade_needed": upgrade_needed,
            "next_plan": next_plan,
        }

    except Exception as e:
        logger.error(f"Error checking employee addition for company {company_id}: {str(e)}")
        return {
            "allowed": False,
            "current_count": 0,
            "limit": 0,
            "plan_id": None,
            "message": "حدث خطأ في التحقق من الحد الأقصى للموظفين",
            "alert_level": None,
            "upgrade_needed": False,
            "next_plan": None,
        }


def on_employee_added(db: Session, company_id: int) -> Optional[dict]:
    """
    Called after an employee is successfully added.
    Checks thresholds and creates notifications if needed.

    Args:
        db: Database session
        company_id: Company ID where employee was added

    Returns:
        Alert info if notification was created, None otherwise
    """
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            logger.warning(f"Company {company_id} not found")
            return None

        subscription = db.query(Subscription).filter(
            Subscription.company_id == company_id,
            Subscription.status == "active"
        ).first()

        if not subscription:
            logger.warning(f"No active subscription for company {company_id}")
            return None

        # Count employees
        employee_count = db.query(func.count(CompanyMember.id)).filter(
            CompanyMember.company_id == company_id,
            CompanyMember.is_active == True
        ).scalar() or 0

        # Get plan features
        plan_features = get_plan_features(subscription.plan_id)
        employee_limit = plan_features.get("max_employees", 0)

        if employee_limit == 0:
            return None

        current_percentage = (employee_count / employee_limit * 100)

        # Check against thresholds
        threshold_percentages = EMPLOYEE_ALERT_THRESHOLDS.get(subscription.plan_id, [])
        alert_created = False
        alert_level = None

        for threshold_pct in sorted(threshold_percentages):
            if current_percentage >= threshold_pct:
                if threshold_pct >= 95:
                    alert_level = "critical"
                elif threshold_pct >= 85:
                    alert_level = "warning"
                else:
                    alert_level = "info"

        if alert_level is None:
            return None

        # Check if notification already exists within last 24 hours
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        existing_notification = db.query(SubscriptionNotification).filter(
            SubscriptionNotification.subscription_id == subscription.id,
            SubscriptionNotification.notification_type == "employee_limit_warning",
            SubscriptionNotification.created_at >= twenty_four_hours_ago
        ).first()

        if existing_notification:
            logger.info(f"Recent notification already exists for company {company_id}")
            return None

        # Create notification
        notification = SubscriptionNotification(
            subscription_id=subscription.id,
            notification_type="employee_limit_warning",
            alert_level=alert_level,
            message=_get_alert_message(alert_level, employee_count, employee_limit, subscription.plan_id),
            metadata={
                "current_count": employee_count,
                "limit": employee_limit,
                "percentage": round(current_percentage, 2),
                "plan_id": subscription.plan_id,
            },
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )

        db.add(notification)
        db.commit()
        alert_created = True

        logger.info(f"Created {alert_level} notification for company {company_id}: {employee_count}/{employee_limit}")

        # Send email via email service (import if available)
        try:
            from services.email_service import send_employee_limit_alert_email
            admin_users = db.query(User).filter(
                User.company_id == company_id,
                User.role.in_(["admin", "owner"])
            ).all()

            for user in admin_users:
                send_employee_limit_alert_email(
                    user.email,
                    user.first_name or "Manager",
                    company.name,
                    employee_count,
                    employee_limit,
                    alert_level,
                    subscription.plan_id
                )
        except ImportError:
            logger.info("Email service not available, skipping email notification")
        except Exception as e:
            logger.error(f"Error sending alert email for company {company_id}: {str(e)}")

        return {
            "alert_created": alert_created,
            "alert_level": alert_level,
            "current_count": employee_count,
            "limit": employee_limit,
            "percentage": round(current_percentage, 2),
            "message": notification.message,
        }

    except Exception as e:
        logger.error(f"Error in on_employee_added for company {company_id}: {str(e)}")
        return None


def block_employee_addition(db: Session, company_id: int) -> dict:
    """
    Returns blocking response when employee limit is reached.

    Args:
        db: Database session
        company_id: Company ID that has reached limit

    Returns:
        Blocking response with upgrade options
    """
    try:
        company = db.query(Company).filter(Company.id == company_id).first()

        subscription = db.query(Subscription).filter(
            Subscription.company_id == company_id,
            Subscription.status == "active"
        ).first()

        if not subscription:
            return {
                "blocked": True,
                "current_count": 0,
                "limit": 0,
                "message": "لا توجد خطة مشترك بها نشطة",
                "upgrade_options": {},
            }

        # Count employees
        employee_count = db.query(func.count(CompanyMember.id)).filter(
            CompanyMember.company_id == company_id,
            CompanyMember.is_active == True
        ).scalar() or 0

        # Get plan features
        plan_features = get_plan_features(subscription.plan_id)
        employee_limit = plan_features.get("max_employees", 0)

        # Build upgrade options
        upgrade_options = {}

        if subscription.plan_id == "professional":
            upgrade_options["business"] = {
                "name": "ALLOUL&Q Business",
                "message": "للاستمرار، تحتاج ALLOUL&Q Business",
                "contact_url": "/upgrade/business",
                "demo_url": "/demo/business",
            }
            upgrade_options["enterprise"] = {
                "name": "ALLOUL&Q Enterprise",
                "message": "للاستمرار، تحتاج ALLOUL&Q Enterprise",
                "contact_url": "/enterprise",
                "demo_url": "/enterprise#book-demo",
            }
        elif subscription.plan_id == "business":
            upgrade_options["enterprise"] = {
                "name": "ALLOUL&Q Enterprise",
                "message": "للاستمرار، تحتاج ALLOUL&Q Enterprise",
                "contact_url": "/enterprise",
                "demo_url": "/enterprise#book-demo",
            }

        logger.info(f"Employee limit reached for company {company_id}: {employee_count}/{employee_limit}")

        return {
            "blocked": True,
            "current_count": employee_count,
            "limit": employee_limit,
            "message": "وصلت للحد الأقصى من الموظفين في خطتك الحالية",
            "upgrade_options": upgrade_options,
        }

    except Exception as e:
        logger.error(f"Error in block_employee_addition for company {company_id}: {str(e)}")
        return {
            "blocked": True,
            "current_count": 0,
            "limit": 0,
            "message": "حدث خطأ في التحقق من الحد الأقصى",
            "upgrade_options": {},
        }


def run_employee_check_all() -> list[dict]:
    """
    Batch check ALL companies for employee count thresholds.
    Called by cron/scheduler. Generates notifications for companies at thresholds.

    Returns:
        List of alerts generated
    """
    db = SessionLocal()
    alerts_generated = []

    try:
        # Get all companies with active subscriptions
        companies = db.query(Company).join(
            Subscription, Subscription.company_id == Company.id
        ).filter(
            Subscription.status == "active"
        ).all()

        logger.info(f"Running employee check for {len(companies)} companies")

        for company in companies:
            try:
                subscription = db.query(Subscription).filter(
                    Subscription.company_id == company.id,
                    Subscription.status == "active"
                ).first()

                if not subscription:
                    continue

                # Count employees
                employee_count = db.query(func.count(CompanyMember.id)).filter(
                    CompanyMember.company_id == company.id,
                    CompanyMember.is_active == True
                ).scalar() or 0

                # Get plan features
                plan_features = get_plan_features(subscription.plan_id)
                employee_limit = plan_features.get("max_employees", 0)

                if employee_limit == 0:
                    continue

                current_percentage = (employee_count / employee_limit * 100)
                threshold_percentages = EMPLOYEE_ALERT_THRESHOLDS.get(subscription.plan_id, [])

                alert_level = None
                for threshold_pct in sorted(threshold_percentages):
                    if current_percentage >= threshold_pct:
                        if threshold_pct >= 95:
                            alert_level = "critical"
                        elif threshold_pct >= 85:
                            alert_level = "warning"
                        else:
                            alert_level = "info"

                if alert_level is None:
                    continue

                # Check if notification already exists within last 24 hours
                twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
                existing_notification = db.query(SubscriptionNotification).filter(
                    SubscriptionNotification.subscription_id == subscription.id,
                    SubscriptionNotification.notification_type == "employee_limit_warning",
                    SubscriptionNotification.created_at >= twenty_four_hours_ago
                ).first()

                if existing_notification:
                    logger.debug(f"Recent notification already exists for company {company.id}")
                    continue

                # Create notification
                notification = SubscriptionNotification(
                    subscription_id=subscription.id,
                    notification_type="employee_limit_warning",
                    alert_level=alert_level,
                    message=_get_alert_message(alert_level, employee_count, employee_limit, subscription.plan_id),
                    metadata={
                        "current_count": employee_count,
                        "limit": employee_limit,
                        "percentage": round(current_percentage, 2),
                        "plan_id": subscription.plan_id,
                    },
                    is_read=False,
                    created_at=datetime.now(timezone.utc),
                )

                db.add(notification)
                db.commit()

                alert_info = {
                    "company_id": company.id,
                    "company_name": company.name,
                    "alert_level": alert_level,
                    "current_count": employee_count,
                    "limit": employee_limit,
                    "percentage": round(current_percentage, 2),
                    "plan_id": subscription.plan_id,
                }
                alerts_generated.append(alert_info)

                logger.info(f"Generated {alert_level} alert for company {company.id}: {employee_count}/{employee_limit}")

                # Send email
                try:
                    from services.email_service import send_employee_limit_alert_email
                    admin_users = db.query(User).filter(
                        User.company_id == company.id,
                        User.role.in_(["admin", "owner"])
                    ).all()

                    for user in admin_users:
                        send_employee_limit_alert_email(
                            user.email,
                            user.first_name or "Manager",
                            company.name,
                            employee_count,
                            employee_limit,
                            alert_level,
                            subscription.plan_id
                        )
                except Exception as e:
                    logger.error(f"Error sending alert email for company {company.id}: {str(e)}")

            except Exception as e:
                logger.error(f"Error checking company {company.id}: {str(e)}")
                continue

        logger.info(f"Employee check completed. Generated {len(alerts_generated)} alerts")

    except Exception as e:
        logger.error(f"Error in run_employee_check_all: {str(e)}")
    finally:
        db.close()

    return alerts_generated


def get_company_usage(db: Session, company_id: int) -> dict:
    """
    Returns comprehensive usage data for a company across all plan features.

    Args:
        db: Database session
        company_id: Company ID to get usage for

    Returns:
        Dictionary with usage data for employees, storage, and AI messages
    """
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            logger.warning(f"Company {company_id} not found")
            return {
                "employees": {"current": 0, "limit": 0, "percentage": 0},
                "storage": {"current_gb": 0, "limit_gb": 0, "percentage": 0},
                "ai_messages": {"current": 0, "limit": 0, "percentage": 0},
                "alerts": [],
            }

        subscription = db.query(Subscription).filter(
            Subscription.company_id == company_id,
            Subscription.status == "active"
        ).first()

        if not subscription:
            return {
                "employees": {"current": 0, "limit": 0, "percentage": 0},
                "storage": {"current_gb": 0, "limit_gb": 0, "percentage": 0},
                "ai_messages": {"current": 0, "limit": 0, "percentage": 0},
                "alerts": [],
            }

        # Get plan features
        plan_features = get_plan_features(subscription.plan_id)

        # Count employees
        employee_count = db.query(func.count(CompanyMember.id)).filter(
            CompanyMember.company_id == company_id,
            CompanyMember.is_active == True
        ).scalar() or 0

        employee_limit = plan_features.get("max_employees", 0)
        employee_percentage = (employee_count / employee_limit * 100) if employee_limit > 0 else 0

        # Get active alerts
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        active_alerts = db.query(SubscriptionNotification).filter(
            SubscriptionNotification.subscription_id == subscription.id,
            SubscriptionNotification.is_read == False,
            SubscriptionNotification.created_at >= twenty_four_hours_ago
        ).all()

        alerts = [
            {
                "type": alert.notification_type,
                "level": alert.alert_level,
                "message": alert.message,
                "created_at": alert.created_at.isoformat(),
            }
            for alert in active_alerts
        ]

        # Note: Storage and AI messages would need to be tracked in actual implementation
        # For now, returning placeholder structure
        storage_limit_gb = plan_features.get("storage_gb", 0)
        ai_messages_limit = plan_features.get("ai_messages", 0)

        logger.info(f"Retrieved usage for company {company_id}: {employee_count}/{employee_limit} employees")

        return {
            "employees": {
                "current": employee_count,
                "limit": employee_limit,
                "percentage": round(employee_percentage, 2),
            },
            "storage": {
                "current_gb": 0,  # Would be populated from actual usage tracking
                "limit_gb": storage_limit_gb,
                "percentage": 0,
            },
            "ai_messages": {
                "current": 0,  # Would be populated from actual usage tracking
                "limit": ai_messages_limit,
                "percentage": 0,
            },
            "alerts": alerts,
        }

    except Exception as e:
        logger.error(f"Error getting company usage for {company_id}: {str(e)}")
        return {
            "employees": {"current": 0, "limit": 0, "percentage": 0},
            "storage": {"current_gb": 0, "limit_gb": 0, "percentage": 0},
            "ai_messages": {"current": 0, "limit": 0, "percentage": 0},
            "alerts": [],
        }


def suggest_upgrade(db: Session, company_id: int) -> Optional[dict]:
    """
    Returns upgrade suggestion if the company would benefit from an upgrade.
    Checks if > 80% employee capacity, > 90% storage, or > 90% AI messages used.

    Args:
        db: Database session
        company_id: Company ID to check for upgrade opportunity

    Returns:
        Upgrade suggestion with plan details, or None if no upgrade needed
    """
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            logger.warning(f"Company {company_id} not found")
            return None

        subscription = db.query(Subscription).filter(
            Subscription.company_id == company_id,
            Subscription.status == "active"
        ).first()

        if not subscription:
            logger.warning(f"No active subscription for company {company_id}")
            return None

        # Get current usage
        usage = get_company_usage(db, company_id)

        employee_pct = usage["employees"]["percentage"]
        storage_pct = usage["storage"]["percentage"]
        ai_pct = usage["ai_messages"]["percentage"]

        # Check if upgrade is needed
        needs_upgrade = (employee_pct > 80) or (storage_pct > 90) or (ai_pct > 90)

        if not needs_upgrade:
            logger.debug(f"Company {company_id} does not need upgrade")
            return None

        # Determine next plan
        next_plan = _get_next_plan(subscription.plan_id)
        if not next_plan:
            logger.info(f"Company {company_id} already on highest plan")
            return None

        next_plan_features = get_plan_features(next_plan)

        # Build benefits comparison
        current_features = get_plan_features(subscription.plan_id)
        benefits = _compare_plan_features(current_features, next_plan_features)

        logger.info(f"Suggesting {next_plan} upgrade for company {company_id}")

        return {
            "suggested_plan": next_plan,
            "current_plan": subscription.plan_id,
            "reasons": _get_upgrade_reasons(employee_pct, storage_pct, ai_pct),
            "benefits": benefits,
            "upgrade_url": f"/upgrade/{next_plan}",
            "demo_url": f"/demo/{next_plan}",
        }

    except Exception as e:
        logger.error(f"Error suggesting upgrade for company {company_id}: {str(e)}")
        return None


# Helper Functions

def _get_next_plan(current_plan: str) -> Optional[str]:
    """Returns the next available plan tier."""
    plan_hierarchy = {
        "basic": "professional",
        "professional": "business",
        "business": "enterprise",
        "enterprise": None,
    }
    return plan_hierarchy.get(current_plan)


def _get_alert_message(alert_level: str, current: int, limit: int, plan_id: str) -> str:
    """Returns an appropriate alert message in Arabic based on alert level."""
    if alert_level == "critical":
        return f"تنبيه حرج: لديك {current} موظف من أصل {limit}. وصلت حتى 95% من الحد الأقصى."
    elif alert_level == "warning":
        return f"تنبيه: لديك {current} موظف من أصل {limit}. يرجى ترقية خطتك قريباً."
    else:
        return f"معلومة: لديك {current} موظف من أصل {limit} في خطتك الحالية."


def _compare_plan_features(current_features: dict, next_features: dict) -> list[dict]:
    """Compares current and next plan features to show benefits."""
    benefits = []

    comparison_fields = ["max_employees", "storage_gb", "ai_messages"]

    for field in comparison_fields:
        current_val = current_features.get(field, 0)
        next_val = next_features.get(field, 0)

        if next_val > current_val:
            field_names = {
                "max_employees": "الموظفين",
                "storage_gb": "التخزين (جيجابايت)",
                "ai_messages": "رسائل الذكاء الاصطناعي",
            }
            benefits.append({
                "feature": field_names.get(field, field),
                "current": current_val,
                "next": next_val,
                "improvement": next_val - current_val,
            })

    return benefits


def _get_upgrade_reasons(employee_pct: float, storage_pct: float, ai_pct: float) -> list[str]:
    """Returns list of reasons why upgrade is recommended."""
    reasons = []

    if employee_pct > 80:
        reasons.append(f"استخدام الموظفين: {round(employee_pct)}% من السعة")
    if storage_pct > 90:
        reasons.append(f"استخدام التخزين: {round(storage_pct)}% من السعة")
    if ai_pct > 90:
        reasons.append(f"استخدام الذكاء الاصطناعي: {round(ai_pct)}% من السعة")

    return reasons
