"""
SQLAlchemy columns to add to your User model for push notification support.

Copy the fields below into your existing User model class.
"""

from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import ENUM
import enum


class PushPlatform(str, enum.Enum):
    ios = "ios"
    android = "android"


# ─── Add these columns to your User model ────────────────────────────────────

# push_token = Column(String, nullable=True, index=True)
# push_platform = Column(
#     ENUM(PushPlatform, name="push_platform_enum", create_type=True),
#     nullable=True,
# )
# push_token_updated_at = Column(DateTime(timezone=True), nullable=True)


# ─── Pydantic schema additions ────────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PushTokenUpdate(BaseModel):
    token: str
    platform: PushPlatform


class UserPushInfo(BaseModel):
    push_token: Optional[str] = None
    push_platform: Optional[PushPlatform] = None
    push_token_updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
