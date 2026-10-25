"""
Dish image storage. Two backends selected by STORAGE_BACKEND:

  local -> saves under backend/uploads/, served by FastAPI at /uploads/<file>
  s3    -> uploads to S3_BUCKET and returns the public object URL

The rest of the app only calls `save_image(upload)` and stores the URL.
"""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .config import settings

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB


async def _read_validated(upload: UploadFile) -> tuple[bytes, str]:
    ext = ALLOWED_TYPES.get(upload.content_type or "")
    if not ext:
        raise HTTPException(400, "Image must be JPEG, PNG, WEBP or GIF")
    data = await upload.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "Image larger than 5 MB")
    return data, ext


async def save_image(upload: UploadFile) -> str:
    data, ext = await _read_validated(upload)
    filename = f"{uuid.uuid4().hex}{ext}"

    if settings.STORAGE_BACKEND == "s3":
        return _save_s3(filename, data, upload.content_type)
    return _save_local(filename, data)


def _save_local(filename: str, data: bytes) -> str:
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path: Path = settings.UPLOAD_DIR / filename
    path.write_bytes(data)
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/uploads/{filename}"


def _save_s3(filename: str, data: bytes, content_type: str | None) -> str:
    import boto3  # imported lazily so local dev doesn't need boto3 configured

    if not settings.S3_BUCKET:
        raise HTTPException(500, "S3_BUCKET is not configured")
    key = f"dishes/{filename}"
    s3 = boto3.client("s3", region_name=settings.AWS_REGION)
    s3.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type or "application/octet-stream",
        CacheControl="public, max-age=31536000",
    )
    if settings.S3_PUBLIC_BASE_URL:
        return f"{settings.S3_PUBLIC_BASE_URL.rstrip('/')}/{key}"
    return f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
