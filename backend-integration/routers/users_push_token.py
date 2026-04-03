"""
Router: POST /users/push-token

Registers or updates the Expo push notification token for the authenticated user.

Add to your FastAPI app:
    from routers.users_push_token import router as push_token_router
    app.include_router(push_token_router)
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Replace these imports with your actual project imports:
# from db import get_db
# from models.user import User
# from auth.dependencies import get_current_user
from models.user_push_fields import PushTokenUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/push-token",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Register or update Expo push token",
)
async def register_push_token(
    payload: PushTokenUpdate,
    # Replace with your actual auth dependency:
    # current_user: User = Depends(get_current_user),
    # db: AsyncSession = Depends(get_db),
):
    """
    Called by the mobile app immediately after obtaining an Expo push token.
    Stores the token and platform against the authenticated user so the backend
    can send targeted push notifications.
    """
    # Replace with your actual DB update logic:
    #
    # current_user.push_token = payload.token
    # current_user.push_platform = payload.platform
    # current_user.push_token_updated_at = datetime.now(timezone.utc)
    # db.add(current_user)
    # await db.commit()

    # Placeholder implementation — replace with real DB call above
    return None
