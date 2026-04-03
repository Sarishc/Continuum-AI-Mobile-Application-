"""
Expo Push Notification Service.

Usage:
    from services.push_service import send_push_notification, send_bulk_push

    await send_push_notification(
        token="ExponentPushToken[xxxx]",
        title="New Insight",
        body="Your latest lab results have been analysed.",
        data={"screen": "/(tabs)/insights"},
    )
"""

import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
    sound: str = "default",
    badge: Optional[int] = None,
) -> dict:
    """Send a single Expo push notification. Returns the Expo API response ticket."""
    if not token.startswith("ExponentPushToken["):
        logger.warning("Invalid Expo push token format: %s", token)
        return {"status": "error", "message": "Invalid token format"}

    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": sound,
        "data": data or {},
    }
    if badge is not None:
        payload["badge"] = badge

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            result = resp.json()
            ticket = result.get("data", {})
            if ticket.get("status") == "error":
                logger.error("Expo push error: %s", ticket.get("message"))
            return ticket
        except httpx.HTTPError as exc:
            logger.error("Push notification HTTP error: %s", exc)
            return {"status": "error", "message": str(exc)}


async def send_bulk_push(
    notifications: list[dict],
) -> list[dict]:
    """
    Send up to 100 notifications in a single Expo batch request.

    Each item in `notifications` should be a dict with keys:
        to, title, body, data (optional), sound (optional), badge (optional)
    """
    if not notifications:
        return []

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=notifications,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            return resp.json().get("data", [])
        except httpx.HTTPError as exc:
            logger.error("Bulk push HTTP error: %s", exc)
            return [{"status": "error", "message": str(exc)}] * len(notifications)
