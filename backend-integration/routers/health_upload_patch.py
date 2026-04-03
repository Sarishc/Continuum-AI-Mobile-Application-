"""
Patch for your /health/entries router to support multipart file upload.

The mobile app sends a multipart/form-data POST to /health/entries with:
  - file: the PDF or image binary
  - type: health entry type (e.g. "lab_result")
  - recorded_at: ISO 8601 timestamp string

Add the `upload_health_entry` endpoint below alongside your existing
POST /health/entries JSON endpoint (use separate paths or a Form+File variant).
"""

import uuid
import aiofiles
import aiofiles.os
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

# Replace with your actual project imports:
# from db import get_db
# from models.health_entry import HealthEntry
# from auth.dependencies import get_current_user
# from services.ai_extraction import extract_health_data  # your AI pipeline

router = APIRouter(prefix="/health", tags=["health"])

UPLOAD_DIR = Path("/tmp/continuum_uploads")
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post(
    "/entries/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a health document (PDF or image)",
)
async def upload_health_entry(
    file: UploadFile = File(...),
    type: str = Form(default="lab_result"),
    recorded_at: Optional[str] = Form(default=None),
    # Replace with your actual auth dependency:
    # current_user: User = Depends(get_current_user),
    # db: AsyncSession = Depends(get_db),
):
    """
    Accepts a multipart file upload, runs AI extraction, and returns
    a structured HealthEntry with any parsed lab values, medications, etc.
    """
    # Validate MIME type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Allowed: PDF, JPEG, PNG, HEIC, WebP",
        )

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)} MB",
        )

    # Save to temp storage
    await aiofiles.os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_ext = Path(file.filename or "upload").suffix or ".pdf"
    temp_path = UPLOAD_DIR / f"{uuid.uuid4()}{file_ext}"

    async with aiofiles.open(temp_path, "wb") as f:
        await f.write(content)

    try:
        # ── Replace this block with your actual AI extraction pipeline ────────
        # extracted = await extract_health_data(
        #     file_path=temp_path,
        #     file_type=file.content_type,
        # )
        # entry = HealthEntry(
        #     id=str(uuid.uuid4()),
        #     user_id=current_user.id,
        #     type=type,
        #     title=extracted.title or file.filename or "Uploaded Document",
        #     description=extracted.summary,
        #     structured_data=extracted.structured_data,
        #     tags=["upload", type],
        #     recorded_at=datetime.fromisoformat(recorded_at) if recorded_at
        #                 else datetime.now(timezone.utc),
        #     created_at=datetime.now(timezone.utc),
        # )
        # db.add(entry)
        # await db.commit()
        # await db.refresh(entry)
        # return entry
        # ── End of AI extraction block ─────────────────────────────────────────

        # Placeholder response — replace with real DB entry above
        recorded = (
            datetime.fromisoformat(recorded_at)
            if recorded_at
            else datetime.now(timezone.utc)
        )
        return {
            "id": str(uuid.uuid4()),
            "userId": "placeholder",
            "type": type,
            "title": file.filename or "Uploaded Document",
            "tags": ["upload", type],
            "attachments": [],
            "recordedAt": recorded.isoformat(),
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

    finally:
        # Clean up temp file
        try:
            await aiofiles.os.remove(temp_path)
        except OSError:
            pass
