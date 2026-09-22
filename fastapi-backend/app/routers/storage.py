"""Upload/hapus gambar via MinIO.

Pemetaan folder resmi:
- breeders-images -> Breeder.foto_url
- chicks-images    -> Chick.foto_url
- profile-images   -> User.avatar_url
- cctv-images      -> CctvSnapshot (otomatis, bukan upload manual)
"""

from __future__ import annotations

import logging

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..auth import require_role
from ..schemas import DeleteResponse, UploadResponse
from ..storage import (
    ALLOWED_FOLDERS,
    MAX_UPLOAD_BYTES,
    build_object_key,
    build_public_url,
    ensure_bucket,
    upload_fileobj,
    delete_object,
    validate_folder,
    validate_image,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/storage", tags=["Storage"])


@router.post("/upload", response_model=UploadResponse)
async def upload_image(
    folder: str = Form(..., description="Salah satu: breeders-images, chicks-images, cctv-images, profile-images"),
    file: UploadFile = File(...),
    current_user=Depends(require_role("pemilik", "staff")),
):
    try:
        clean_folder = validate_folder(folder)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        ext = validate_image(file.filename or "", file.content_type or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File kosong!")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Ukuran file maksimal {MAX_UPLOAD_BYTES // (1024 * 1024)}MB!",
        )

    filename = build_object_key(clean_folder, ext).rsplit("/", 1)[-1]
    object_key = f"{clean_folder}/{filename}"

    try:
        ensure_bucket()
        import io

        upload_fileobj(io.BytesIO(content), object_key, (file.content_type or "image/jpeg").split(";")[0])
        file_url = build_public_url(object_key)
        return UploadResponse(
            folder=clean_folder,
            filename=filename,
            object_key=object_key,
            url=file_url,
        )
    except (BotoCoreError, ClientError) as e:
        logger.exception("Gagal upload ke MinIO: %s", e)
        raise HTTPException(status_code=500, detail=f"Gagal upload ke MinIO: {e}")
    finally:
        try:
            await file.close()
        except Exception:
            pass


@router.delete("/delete", response_model=DeleteResponse)
def delete_image(
    object_key: str,
    current_user=Depends(require_role("pemilik", "staff")),
):
    """Hapus file berdasarkan object_key, contoh: 'breeders-images/ab12cd.jpg'."""
    key = (object_key or "").strip().strip("/")
    if not key or "/" not in key:
        raise HTTPException(status_code=400, detail="object_key tidak valid!")
    head_folder = key.split("/", 1)[0]
    if head_folder not in ALLOWED_FOLDERS:
        raise HTTPException(status_code=400, detail="Folder object_key tidak diizinkan!")
    try:
        delete_object(key)
        return DeleteResponse(message=f"File {key} berhasil dihapus")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (BotoCoreError, ClientError) as e:
        logger.exception("Gagal menghapus file MinIO: %s", e)
        raise HTTPException(status_code=500, detail=f"Gagal menghapus file: {e}")


# Alias kompatibel dengan contoh kode lama (/api/v1/upload & /api/v1/delete).
legacy_router = APIRouter(prefix="/api/v1", tags=["Storage"])


@legacy_router.post("/upload", response_model=UploadResponse)
async def legacy_upload_image(
    folder: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(require_role("pemilik", "staff")),
):
    return await upload_image(folder=folder, file=file, current_user=current_user)


@legacy_router.delete("/delete", response_model=DeleteResponse)
def legacy_delete_image(
    object_key: str,
    current_user=Depends(require_role("pemilik", "staff")),
):
    return delete_image(object_key=object_key, current_user=current_user)
