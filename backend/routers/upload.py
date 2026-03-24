"""
Upload files and images to Azure Blob Storage.
Requires AZURE_STORAGE_CONNECTION_STRING and optional AZURE_STORAGE_CONTAINER.
"""
from __future__ import annotations

from typing import Optional

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, status, UploadFile

from auth import get_current_user
from config import settings
from models import User

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


def _get_blob_client():
    if not settings.AZURE_STORAGE_CONNECTION_STRING:
        return None
    try:
        from azure.storage.blob import BlobServiceClient
        return BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
    except Exception:
        return None


def _upload_bytes(container_name: str, blob_name: str, data: bytes, content_type: Optional[str] = None) -> Optional[str]:
    client = _get_blob_client()
    if not client:
        return None
    try:
        from azure.storage.blob import ContentSettings
        container = client.get_container_client(container_name)
        blob = container.get_blob_client(blob_name)
        cs = ContentSettings(content_type=content_type) if content_type else None
        blob.upload_blob(data, overwrite=True, content_settings=cs)
        return blob.url
    except Exception:
        return None


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload an image (profile, logo, etc.). Returns { "url": "https://..." }."""
    if not settings.AZURE_STORAGE_CONNECTION_STRING:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Azure Storage not configured")
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image type")
    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large")
    ext = "jpg" if "jpeg" in content_type else (content_type.split("/")[-1] or "jpg")
    blob_name = f"images/{current_user.id}/{uuid.uuid4().hex}.{ext}"
    url = _upload_bytes(settings.AZURE_STORAGE_CONTAINER, blob_name, data, content_type)
    if not url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Upload failed")
    return {"url": url}


@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a file. Returns { "url": "https://..." }."""
    if not settings.AZURE_STORAGE_CONNECTION_STRING:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Azure Storage not configured")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")
    ext = (file.filename or "").split(".")[-1] or "bin"
    safe_ext = ext[:20] if ext.isalnum() else "bin"
    blob_name = f"files/{current_user.id}/{uuid.uuid4().hex}.{safe_ext}"
    url = _upload_bytes(settings.AZURE_STORAGE_CONTAINER, blob_name, data, file.content_type)
    if not url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Upload failed")
    return {"url": url}
