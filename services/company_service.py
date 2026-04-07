"""
CompanyService — business logic for company entities.
Routers call these methods instead of duplicating DB queries.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from models import Company, CompanyMember, Subscription, CompanyOnboarding, ActivityLog


ROLE_HIERARCHY = ["owner", "admin", "manager", "employee", "member"]
MAX_EMPLOYEES = {"starter": 10, "pro": 50, "pro_plus": 200}


class CompanyService:

    @staticmethod
    def get_company_for_user(db: Session, user_id: int) -> Optional[Company]:
        """Return the company the user belongs to, or None."""
        mem = db.query(CompanyMember).filter(CompanyMember.user_id == user_id).first()
        if not mem:
            return None
        return db.query(Company).filter(Company.id == mem.company_id).first()

    @staticmethod
    def get_membership(db: Session, user_id: int, company_id: int) -> Optional[CompanyMember]:
        return db.query(CompanyMember).filter(
            CompanyMember.user_id == user_id,
            CompanyMember.company_id == company_id,
        ).first()

    @staticmethod
    def has_role(db: Session, user_id: int, company_id: int, min_role: str) -> bool:
        """Return True if user's role is >= min_role in the hierarchy."""
        mem = CompanyService.get_membership(db, user_id, company_id)
        if not mem:
            return False
        try:
            allowed = ROLE_HIERARCHY[: ROLE_HIERARCHY.index(min_role) + 1]
        except ValueError:
            return False
        return mem.role in allowed

    @staticmethod
    def get_subscription(db: Session, company_id: int) -> Optional[Subscription]:
        return (
            db.query(Subscription)
            .filter(Subscription.company_id == company_id)
            .order_by(Subscription.id.desc())
            .first()
        )

    @staticmethod
    def is_subscription_active(db: Session, company_id: int) -> bool:
        sub = CompanyService.get_subscription(db, company_id)
        return sub is not None and sub.status in ("active", "trialing")

    @staticmethod
    def get_member_limit(plan_id: Optional[str]) -> Optional[int]:
        if not plan_id:
            return None
        return MAX_EMPLOYEES.get(plan_id)

    @staticmethod
    def log_activity(db: Session, company_id: int, user_id: Optional[int], action: str, details: Optional[str] = None) -> None:
        db.add(ActivityLog(company_id=company_id, user_id=user_id, action=action, details=details))
        db.commit()

    @staticmethod
    def get_or_create_onboarding(db: Session, company_id: int) -> CompanyOnboarding:
        ob = db.query(CompanyOnboarding).filter(CompanyOnboarding.company_id == company_id).first()
        if not ob:
            ob = CompanyOnboarding(company_id=company_id)
            db.add(ob)
            db.commit()
            db.refresh(ob)
        return ob

    @staticmethod
    def tick_onboarding_step(db: Session, company_id: int, step_field: str) -> None:
        ob = CompanyService.get_or_create_onboarding(db, company_id)
        setattr(ob, step_field, 1)
        if ob.step_profile and ob.step_team and ob.step_invite and ob.step_project:
            ob.completed = 1
        db.commit()
