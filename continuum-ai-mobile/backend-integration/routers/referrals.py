"""
Continuum AI — Referrals Router
Drop into FastAPI backend: include_router(referrals.router, prefix="/referrals")

Requires: add_referrals migration (see migrations/add_referrals.py)
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.user import User
from ..models.referral import Referral
from ..database import get_db
from ..auth import get_current_user
from ..services.push_notifications import send_push_notification

router = APIRouter(tags=["referrals"])

PRO_TRIAL_DAYS = 7


# ─── Helpers ──────────────────────────────────────────────────────────────────

def generate_code(name: str) -> str:
    """Generate a code like JORDAN-X7K2 from user's name."""
    prefix = (name.strip().upper().replace(" ", "")[:6]) or "USER"
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{suffix}"


def grant_pro_trial(user: User, db: Session) -> None:
    """Give a user 7 days of Pro trial (extends existing if active)."""
    now = datetime.utcnow()
    current_end = user.pro_trial_ends_at or now
    # Extend from latest of now or current end
    base = max(current_end, now)
    user.pro_trial_ends_at = base + timedelta(days=PRO_TRIAL_DAYS)


# ─── GET /referrals/validate (no auth) ───────────────────────────────────────

@router.get("/validate")
async def validate_code(
    code: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.referral_code == code.upper()).first()
    if not user:
        return {"valid": False, "referrerName": None}
    first_name = user.name.split()[0] if user.name else "Someone"
    return {"valid": True, "referrerName": first_name}


# ─── GET /referrals/my-code ───────────────────────────────────────────────────

@router.get("/my-code")
async def get_my_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Generate code on first access
    if not current_user.referral_code:
        code = generate_code(current_user.name or "USER")
        # Ensure uniqueness
        while db.query(User).filter(User.referral_code == code).first():
            code = generate_code(current_user.name or "USER")
        current_user.referral_code = code
        db.commit()

    total = current_user.total_referrals or 0
    pending = (
        db.query(func.count(Referral.id))
        .filter(
            Referral.referrer_id == current_user.id,
            Referral.status == "completed",
        )
        .scalar()
        or 0
    )
    rewarded = (
        db.query(func.count(Referral.id))
        .filter(
            Referral.referrer_id == current_user.id,
            Referral.status == "rewarded",
        )
        .scalar()
        or 0
    )

    return {
        "code": current_user.referral_code,
        "referralUrl": f"https://continuum-health.app/invite/{current_user.referral_code}",
        "totalReferrals": total,
        "pendingReferrals": pending,
        "rewardedReferrals": rewarded,
    }


# ─── POST /referrals/apply ────────────────────────────────────────────────────

class ApplyCodeBody(BaseModel):
    code: str


@router.post("/apply")
async def apply_referral_code(
    body: ApplyCodeBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = body.code.upper().strip()

    # Prevent self-referral
    if current_user.referral_code == code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot apply your own referral code.",
        )

    # Prevent re-applying
    if current_user.referred_by_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A referral code has already been applied to your account.",
        )

    # Find referrer
    referrer = db.query(User).filter(User.referral_code == code).first()
    if not referrer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral code not found.",
        )

    # Create referral record
    referral = Referral(
        referrer_id=referrer.id,
        referred_id=current_user.id,
        code=code,
        status="rewarded",
        completed_at=datetime.utcnow(),
    )
    db.add(referral)

    # Grant Pro trial to both users
    grant_pro_trial(referrer, db)
    grant_pro_trial(current_user, db)

    # Update referrer stats
    referrer.total_referrals = (referrer.total_referrals or 0) + 1

    # Mark new user's applied code
    current_user.referred_by_code = code

    db.commit()

    # Push notification to referrer (fire-and-forget)
    new_user_name = current_user.name.split()[0] if current_user.name else "Someone"
    try:
        await send_push_notification(
            user_id=referrer.id,
            title="🎉 Referral Reward!",
            body=f"{new_user_name} joined using your code! You both get {PRO_TRIAL_DAYS} days Pro free.",
            data={"type": "referral_rewarded"},
        )
    except Exception:
        pass  # Never fail the endpoint due to push errors

    return {
        "success": True,
        "proTrialDays": PRO_TRIAL_DAYS,
        "referrerName": referrer.name.split()[0] if referrer.name else "Your friend",
    }


# ─── GET /referrals/history ───────────────────────────────────────────────────

@router.get("/history")
async def get_referral_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    referrals = (
        db.query(Referral)
        .filter(Referral.referrer_id == current_user.id)
        .order_by(Referral.completed_at.desc())
        .limit(50)
        .all()
    )

    result = []
    for r in referrals:
        referred = db.query(User).filter(User.id == r.referred_id).first()
        if referred:
            first_name = referred.name.split()[0][0] if referred.name else "?"
            last_initial = referred.name.split()[-1][0] if referred.name and len(referred.name.split()) > 1 else "?"
            result.append({
                "name": f"{referred.name.split()[0]} {last_initial}." if referred.name else "Anonymous",
                "date": _format_relative_date(r.completed_at),
                "status": r.status,
            })

    return result


def _format_relative_date(dt: Optional[datetime]) -> str:
    if not dt:
        return "recently"
    delta = datetime.utcnow() - dt
    if delta.days == 0:
        return "today"
    if delta.days == 1:
        return "yesterday"
    if delta.days < 7:
        return f"{delta.days} days ago"
    if delta.days < 14:
        return "1 week ago"
    return f"{delta.days // 7} weeks ago"
