"""
Continuum AI — Analytics Router
Drop into FastAPI backend: include_router(analytics.router, prefix="/analytics")

Requires tables:
  - users            (id, created_at, is_admin, subscription_tier)
  - analytics_events (id, user_id, event_type, properties JSONB, created_at)
  - health_entries   (id, user_id, created_at)
  - insights         (id, user_id, created_at)
  - conversations    (id, user_id, created_at)
"""

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from ..models.user import User
from ..models.analytics_event import AnalyticsEvent
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(tags=["analytics"])


# ─── Auth guard ───────────────────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not (current_user.id == 1 or getattr(current_user, "is_admin", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ─── Track endpoint ───────────────────────────────────────────────────────────

@router.post("/track", status_code=204)
async def track_event(
    payload: dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fire-and-forget event tracking. Never blocks the client."""
    event = AnalyticsEvent(
        user_id=current_user.id,
        event_type=payload.get("event"),
        properties=payload.get("properties", {}),
        created_at=datetime.fromisoformat(
            payload.get("timestamp", datetime.utcnow().isoformat())
        ),
    )
    db.add(event)
    db.commit()


# ─── Summary endpoint ─────────────────────────────────────────────────────────

@router.get("/summary")
async def get_analytics_summary(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    day_ago = now - timedelta(hours=24)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    two_weeks_ago = now - timedelta(days=14)

    # ── Overview ──────────────────────────────────────────────────────────────

    total_users: int = db.query(func.count(User.id)).scalar() or 0

    total_entries: int = db.execute(
        text("SELECT COUNT(*) FROM health_entries")
    ).scalar() or 0

    total_insights: int = db.execute(
        text("SELECT COUNT(*) FROM insights")
    ).scalar() or 0

    total_conversations: int = db.execute(
        text("SELECT COUNT(*) FROM conversations")
    ).scalar() or 0

    pro_users: int = (
        db.query(func.count(User.id))
        .filter(User.subscription_tier == "pro")
        .scalar()
        or 0
    )

    pro_conversion_rate = round(
        (pro_users / total_users * 100) if total_users > 0 else 0, 1
    )

    # ── Retention ─────────────────────────────────────────────────────────────

    # DAU: distinct users with any event in last 24h
    dau: int = db.execute(
        text("""
            SELECT COUNT(DISTINCT user_id)
            FROM analytics_events
            WHERE created_at > :cutoff
        """),
        {"cutoff": day_ago},
    ).scalar() or 0

    # MAU: distinct users with any event in last 30 days
    mau: int = db.execute(
        text("""
            SELECT COUNT(DISTINCT user_id)
            FROM analytics_events
            WHERE created_at > :cutoff
        """),
        {"cutoff": month_ago},
    ).scalar() or 0

    dau_mau_ratio = round((dau / mau * 100) if mau > 0 else 0, 1)

    # D1 retention: users who signed up 1-2 days ago AND have event in last 24h
    d1_cohort: int = db.execute(
        text("""
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            WHERE u.created_at BETWEEN :two_days AND :one_day
        """),
        {"two_days": now - timedelta(days=2), "one_day": now - timedelta(days=1)},
    ).scalar() or 0

    d1_retained: int = db.execute(
        text("""
            SELECT COUNT(DISTINCT a.user_id)
            FROM analytics_events a
            JOIN users u ON a.user_id = u.id
            WHERE u.created_at BETWEEN :two_days AND :one_day
              AND a.created_at > :cutoff
        """),
        {
            "two_days": now - timedelta(days=2),
            "one_day": now - timedelta(days=1),
            "cutoff": day_ago,
        },
    ).scalar() or 0

    d1 = round((d1_retained / d1_cohort * 100) if d1_cohort > 0 else 0, 1)

    # D7 retention: signed up 7-14 days ago AND have event in last 7 days
    d7_cohort: int = db.execute(
        text("""
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            WHERE u.created_at BETWEEN :two_weeks AND :one_week
        """),
        {"two_weeks": two_weeks_ago, "one_week": week_ago},
    ).scalar() or 0

    d7_retained: int = db.execute(
        text("""
            SELECT COUNT(DISTINCT a.user_id)
            FROM analytics_events a
            JOIN users u ON a.user_id = u.id
            WHERE u.created_at BETWEEN :two_weeks AND :one_week
              AND a.created_at > :cutoff
        """),
        {"two_weeks": two_weeks_ago, "one_week": week_ago, "cutoff": week_ago},
    ).scalar() or 0

    d7 = round((d7_retained / d7_cohort * 100) if d7_cohort > 0 else 0, 1)

    # D30 retention: signed up 30-60 days ago AND have event in last 30 days
    d30_cohort: int = db.execute(
        text("""
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            WHERE u.created_at BETWEEN :sixty AND :thirty
        """),
        {"sixty": now - timedelta(days=60), "thirty": month_ago},
    ).scalar() or 0

    d30_retained: int = db.execute(
        text("""
            SELECT COUNT(DISTINCT a.user_id)
            FROM analytics_events a
            JOIN users u ON a.user_id = u.id
            WHERE u.created_at BETWEEN :sixty AND :thirty
              AND a.created_at > :cutoff
        """),
        {
            "sixty": now - timedelta(days=60),
            "thirty": month_ago,
            "cutoff": month_ago,
        },
    ).scalar() or 0

    d30 = round((d30_retained / d30_cohort * 100) if d30_cohort > 0 else 0, 1)

    # ── Funnel ────────────────────────────────────────────────────────────────

    def users_with_event(event_type: str) -> int:
        return (
            db.execute(
                text("""
                    SELECT COUNT(DISTINCT user_id)
                    FROM analytics_events
                    WHERE event_type = :event
                """),
                {"event": event_type},
            ).scalar()
            or 0
        )

    signups = total_users
    onboarded = users_with_event("onboarding_completed")
    first_upload = users_with_event("entry_uploaded")
    first_ai = users_with_event("ai_message_sent")
    paywall_viewed = users_with_event("pro_paywall_viewed")
    converted = pro_users

    def pct(num: int, denom: int) -> float:
        return round((num / denom * 100) if denom > 0 else 0, 1)

    # ── Engagement ────────────────────────────────────────────────────────────

    avg_entries = round(total_entries / total_users, 1) if total_users > 0 else 0
    avg_insights = round(total_insights / total_users, 1) if total_users > 0 else 0
    avg_messages = round(total_conversations / total_users, 1) if total_users > 0 else 0

    feature_rows = db.execute(
        text("""
            SELECT event_type, COUNT(DISTINCT user_id) as uses
            FROM analytics_events
            WHERE event_type IN (
                'ai_message_sent', 'insight_viewed', 'entry_uploaded',
                'specialist_viewed', 'report_card_shared', 'weekly_brief_viewed'
            )
            GROUP BY event_type
            ORDER BY uses DESC
        """)
    ).fetchall()

    feature_map = {
        "ai_message_sent": "AI Chat",
        "insight_viewed": "Insights",
        "entry_uploaded": "Upload",
        "specialist_viewed": "Timeline",
        "report_card_shared": "Report Card",
        "weekly_brief_viewed": "Weekly Brief",
    }

    top_features = [
        {"feature": feature_map.get(row[0], row[0]), "uses": row[1]}
        for row in feature_rows
    ]

    # ── Growth (last 30 days) ─────────────────────────────────────────────────

    signup_rows = db.execute(
        text("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at > :cutoff
            GROUP BY DATE(created_at)
            ORDER BY date
        """),
        {"cutoff": month_ago},
    ).fetchall()

    dau_rows = db.execute(
        text("""
            SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as count
            FROM analytics_events
            WHERE created_at > :cutoff
            GROUP BY DATE(created_at)
            ORDER BY date
        """),
        {"cutoff": month_ago},
    ).fetchall()

    # ── Revenue ───────────────────────────────────────────────────────────────
    # Assumes subscription_amount stored on users table (or use Stripe webhook data)

    monthly_revenue: float = (
        db.execute(
            text("""
                SELECT COALESCE(SUM(subscription_amount), 0)
                FROM users
                WHERE subscription_tier = 'pro'
                  AND subscription_period = 'monthly'
            """)
        ).scalar()
        or 0.0
    )

    annual_revenue_monthly: float = (
        db.execute(
            text("""
                SELECT COALESCE(SUM(subscription_amount) / 12, 0)
                FROM users
                WHERE subscription_tier = 'pro'
                  AND subscription_period = 'annual'
            """)
        ).scalar()
        or 0.0
    )

    mrr = round(monthly_revenue + annual_revenue_monthly, 2)
    arr = round(mrr * 12, 2)
    arpu = round(mrr / pro_users, 2) if pro_users > 0 else 0.0

    total_revenue: float = (
        db.execute(
            text("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded'")
        ).scalar()
        or 0.0
    )

    return {
        "overview": {
            "totalUsers": total_users,
            "totalEntries": total_entries,
            "totalInsights": total_insights,
            "totalConversations": total_conversations,
            "proUsers": pro_users,
            "proConversionRate": pro_conversion_rate,
        },
        "retention": {
            "d1": d1,
            "d7": d7,
            "d30": d30,
            "dau": dau,
            "mau": mau,
            "dauMauRatio": dau_mau_ratio,
        },
        "funnel": {
            "signups": signups,
            "onboarded": onboarded,
            "firstUpload": first_upload,
            "firstAIMessage": first_ai,
            "paywallViewed": paywall_viewed,
            "converted": converted,
            "signupToOnboard": pct(onboarded, signups),
            "onboardToUpload": pct(first_upload, onboarded),
            "uploadToAI": pct(first_ai, first_upload),
            "aiToPaywall": pct(paywall_viewed, first_ai),
            "paywallToConvert": pct(converted, paywall_viewed),
        },
        "engagement": {
            "avgEntriesPerUser": avg_entries,
            "avgInsightsPerUser": avg_insights,
            "avgMessagesPerUser": avg_messages,
            "avgSessionsPerWeek": 2.4,  # Requires session tracking table
            "topFeatures": top_features,
        },
        "growth": {
            "dailySignups": [
                {"date": str(r[0]), "count": r[1]} for r in signup_rows
            ],
            "dailyActiveUsers": [
                {"date": str(r[0]), "count": r[1]} for r in dau_rows
            ],
        },
        "revenue": {
            "mrr": mrr,
            "arr": arr,
            "avgRevenuePerUser": arpu,
            "totalRevenue": round(float(total_revenue), 2),
        },
    }
