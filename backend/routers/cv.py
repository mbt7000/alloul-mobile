from __future__ import annotations
import json
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from auth import get_current_user
from database import get_db
from models import User, UserCV, CompanyMember, JobPosting, JobApplication

router = APIRouter(prefix="/cv", tags=["cv"])

class CVRequest(BaseModel):
    full_name: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    education: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None

class CVResponse(BaseModel):
    id: int
    user_id: int
    full_name: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    education: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None

    class Config:
        from_attributes = True

def _cv_to_response(cv: UserCV) -> CVResponse:
    def parse(v):
        if not v: return []
        try: return json.loads(v)
        except: return [v]
    return CVResponse(
        id=cv.id, user_id=cv.user_id,
        full_name=cv.full_name, title=cv.title, summary=cv.summary,
        phone=cv.phone, email=cv.email, location=cv.location,
        years_experience=cv.years_experience,
        skills=parse(cv.skills), education=parse(cv.education),
        certifications=parse(cv.certifications), languages=parse(cv.languages),
        linkedin_url=cv.linkedin_url, portfolio_url=cv.portfolio_url,
    )

@router.get("/me", response_model=CVResponse)
def get_my_cv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    cv = db.query(UserCV).filter(UserCV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return _cv_to_response(cv)

@router.put("/me", response_model=CVResponse)
def upsert_my_cv(
    body: CVRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    cv = db.query(UserCV).filter(UserCV.user_id == current_user.id).first()
    if not cv:
        cv = UserCV(user_id=current_user.id)
        db.add(cv)
    cv.full_name = body.full_name or cv.full_name
    cv.title = body.title if body.title is not None else cv.title
    cv.summary = body.summary if body.summary is not None else cv.summary
    cv.phone = body.phone if body.phone is not None else cv.phone
    cv.email = body.email if body.email is not None else cv.email
    cv.location = body.location if body.location is not None else cv.location
    cv.years_experience = body.years_experience if body.years_experience is not None else cv.years_experience
    if body.skills is not None: cv.skills = json.dumps(body.skills, ensure_ascii=False)
    if body.education is not None: cv.education = json.dumps(body.education, ensure_ascii=False)
    if body.certifications is not None: cv.certifications = json.dumps(body.certifications, ensure_ascii=False)
    if body.languages is not None: cv.languages = json.dumps(body.languages, ensure_ascii=False)
    cv.linkedin_url = body.linkedin_url if body.linkedin_url is not None else cv.linkedin_url
    cv.portfolio_url = body.portfolio_url if body.portfolio_url is not None else cv.portfolio_url
    db.commit()
    db.refresh(cv)
    return _cv_to_response(cv)

@router.get("/user/{user_id}", response_model=CVResponse)
def get_user_cv(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Only accessible by the owner OR company admins/owners who have a job
    that the target user has applied to."""
    # Owner can always see their own CV
    if user_id == current_user.id:
        cv = db.query(UserCV).filter(UserCV.user_id == user_id).first()
        if not cv:
            raise HTTPException(status_code=404, detail="CV not found")
        return _cv_to_response(cv)

    # Check: is current_user a company admin/owner/manager?
    my_membership = db.query(CompanyMember).filter(
        CompanyMember.user_id == current_user.id,
        CompanyMember.role.in_(["owner", "admin", "manager"]),
    ).first()
    if not my_membership:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check: has the target user applied to any job in current_user's company?
    applied = (
        db.query(JobApplication)
        .join(JobPosting, JobPosting.id == JobApplication.job_id)
        .filter(
            JobApplication.user_id == user_id,
            JobPosting.company_id == my_membership.company_id,
        )
        .first()
    )
    if not applied:
        raise HTTPException(status_code=403, detail="This user has not applied to any of your company's jobs")

    cv = db.query(UserCV).filter(UserCV.user_id == user_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return _cv_to_response(cv)
