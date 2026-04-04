"""
Weekly Health Brief — FastAPI router
POST /health/weekly-brief

Generates a personalized AI weekly health brief for the authenticated user.
Uses Claude claude-sonnet-4-6 to synthesize the week's health data into a structured summary.

To wire up:
  1. Copy this file into your backend routers/ directory.
  2. In main.py: from routers.briefs import router as briefs_router
                 app.include_router(briefs_router, prefix="/health", tags=["briefs"])
  3. Ensure ANTHROPIC_API_KEY is set in your environment.
"""

import json
import anthropic
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

# Adjust these imports to match your project structure
from database import get_db
from auth import get_current_user
from models.user import User
from models.health import HealthEntry, Insight, HealthProfile

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def calculate_health_score(insights: list) -> int:
    """Deduct points per active insight severity. Clamp 10-100."""
    score = 100
    for i in insights:
        if i.severity == "critical":
            score -= 20
        elif i.severity == "high":
            score -= 10
        elif i.severity == "moderate":
            score -= 5
    return max(10, min(100, score))


def calculate_streak(entries: list) -> int:
    """Count consecutive days with entries (today or yesterday must anchor)."""
    if not entries:
        return 0
    dates = sorted(
        set(e.created_at.date().isoformat() for e in entries),
        reverse=True,
    )
    today = datetime.now().date()
    yesterday = (datetime.now() - timedelta(days=1)).date()
    if dates[0] not in (today.isoformat(), yesterday.isoformat()):
        return 0
    streak = 0
    prev = None
    for d in dates:
        if prev is None:
            prev = d
            streak = 1
            continue
        if (
            datetime.fromisoformat(prev).date() - datetime.fromisoformat(d).date()
        ).days == 1:
            streak += 1
            prev = d
        else:
            break
    return streak


def worst_severity(insights: list) -> str:
    order = {"critical": 3, "high": 2, "moderate": 1, "low": 0}
    if not insights:
        return "low"
    return max((i.severity for i in insights), key=lambda x: order.get(x, 0))


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/weekly-brief")
async def generate_weekly_brief(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    # Fetch this week's data
    entries = (
        db.query(HealthEntry)
        .filter(
            HealthEntry.user_id == current_user.id,
            HealthEntry.created_at >= week_ago,
        )
        .all()
    )

    insights = (
        db.query(Insight)
        .filter(
            Insight.user_id == current_user.id,
            Insight.created_at >= week_ago,
        )
        .all()
    )

    profile: Optional[HealthProfile] = (
        db.query(HealthProfile)
        .filter(HealthProfile.user_id == current_user.id)
        .first()
    )

    # Previous week entries for score comparison
    prev_entries = (
        db.query(HealthEntry)
        .filter(
            HealthEntry.user_id == current_user.id,
            HealthEntry.created_at >= two_weeks_ago,
            HealthEntry.created_at < week_ago,
        )
        .all()
    )

    prev_insights = (
        db.query(Insight)
        .filter(
            Insight.user_id == current_user.id,
            Insight.created_at >= two_weeks_ago,
            Insight.created_at < week_ago,
        )
        .all()
    )

    # Calculate scores
    current_score = calculate_health_score(insights)
    prev_score = calculate_health_score(prev_insights)

    # Serialize data safely for Claude
    entries_data = [
        {
            "type": e.entry_type,
            "title": e.title,
            "structured_data": e.structured_data or {},
        }
        for e in entries
    ]
    insights_data = [
        {
            "summary": i.insight_text,
            "severity": i.severity,
            "category": getattr(i, "health_category", "General"),
        }
        for i in insights
    ]
    profile_data = {}
    if profile:
        profile_data = {
            "conditions": profile.conditions or [],
            "medications": [
                {"name": m.get("name", ""), "dosage": m.get("dosage", "")}
                for m in (profile.medications or [])
            ],
        }

    context = (
        f"User health profile: {json.dumps(profile_data)}\n"
        f"This week's entries ({len(entries)}): {json.dumps(entries_data)}\n"
        f"This week's insights ({len(insights)}): {json.dumps(insights_data)}\n"
        f"Previous week entry count: {len(prev_entries)}\n"
        f"Current health score: {current_score}, Previous: {prev_score}"
    )

    # ── Call Claude ──────────────────────────────────────────────────────────
    try:
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            system="""You are a health intelligence assistant generating a weekly
health brief. Return ONLY valid JSON with exactly these fields:
{
  "improvements": [{"title": string, "detail": string}],
  "attentionItems": [{"title": string, "detail": string, "severity": string}],
  "aiInsight": string,
  "actionableTip": string,
  "nextSteps": [string, string, string]
}
Rules:
- Be specific: reference actual values from the data when available.
- Max 3 improvements, 2 attentionItems, exactly 3 nextSteps.
- aiInsight: 2-3 sentences synthesizing the week's patterns.
- actionableTip: 1-2 sentences, very specific and actionable.
- severity values: "low" | "moderate" | "high" | "critical"
- Always end aiInsight with: "This is not medical advice."
- Return ONLY the JSON object, no markdown, no preamble.""",
            messages=[{"role": "user", "content": context}],
        )
        ai_data = json.loads(response.content[0].text)
    except Exception:
        # Fallback if API unavailable
        ai_data = {
            "improvements": [
                {
                    "title": "Consistent health tracking",
                    "detail": f"You logged {len(entries)} entries this week.",
                }
            ],
            "attentionItems": [],
            "aiInsight": (
                "Your health data has been recorded for this week. "
                "Keep tracking consistently for more detailed AI insights. "
                "This is not medical advice."
            ),
            "actionableTip": (
                "Logging health data at the same time each day "
                "helps identify patterns more accurately."
            ),
            "nextSteps": [
                "Continue logging health data daily",
                "Review your insights tab for any flagged items",
                "Schedule any overdue medical appointments",
            ],
        }

    week_label = (
        f"{week_ago.strftime('%B %d')} – {now.strftime('%B %d, %Y')}"
    )

    return {
        "weekLabel": week_label,
        "previousScore": prev_score,
        "currentScore": current_score,
        "scoreDelta": current_score - prev_score,
        "entriesThisWeek": len(entries),
        "newInsightsCount": len(insights),
        "worstSeverity": worst_severity(insights),
        "currentStreak": calculate_streak(entries),
        **ai_data,
        "generatedAt": now.isoformat(),
    }
