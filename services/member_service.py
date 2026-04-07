"""
MemberService — business logic for company members.
"""
from __future__ import annotations

import random
import string
from typing import Optional

from sqlalchemy.orm import Session

from models import CompanyMember, User


def _generate_icode(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


class MemberService:

    @staticmethod
    def generate_unique_member_code(db: Session, company_id: int, max_attempts: int = 50) -> str:
        for _ in range(max_attempts):
            code = _generate_icode()
            exists = db.query(CompanyMember).filter(
                CompanyMember.company_id == company_id,
                CompanyMember.i_code == code,
            ).first()
            if not exists:
                return code
        return _generate_icode()

    @staticmethod
    def is_member(db: Session, user_id: int, company_id: int) -> bool:
        return (
            db.query(CompanyMember)
            .filter(CompanyMember.user_id == user_id, CompanyMember.company_id == company_id)
            .first()
        ) is not None

    @staticmethod
    def get_member_phone(db: Session, user_id: int) -> Optional[str]:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        phone = getattr(user, "phone", None)
        return phone.strip() if isinstance(phone, str) and phone.strip() else None

    @staticmethod
    def add_member(
        db: Session,
        company_id: int,
        user_id: int,
        role: str = "employee",
        department_id: Optional[int] = None,
        manager_id: Optional[int] = None,
        job_title: Optional[str] = None,
    ) -> CompanyMember:
        i_code = MemberService.generate_unique_member_code(db, company_id)
        member = CompanyMember(
            company_id=company_id,
            user_id=user_id,
            role=role,
            department_id=department_id,
            manager_id=manager_id,
            job_title=job_title,
            i_code=i_code,
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return member
