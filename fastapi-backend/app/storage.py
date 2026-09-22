"""MinIO/S3 storage helper untuk Kampung Merak.

Folders resmi:
- breeders-images  : foto induk merak  (Breeder.foto_url)
- chicks-images     : foto anak merak   (Chick.foto_url)
- profile-images    : foto profile user (User.avatar_url)
- cctv-images       : snapshot CCTV incubator otomatis (CctvSnapshot)
"""

from __future__ import annotations

import logging
import os
import uuid

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)

ALLOWED_FOLDERS = frozenset({
    "breeders-images",
    "chicks-images",
    "profile-images",
    "cctv-images",
})

ALLOWED_CONTENT_TYPES = frozenset({
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
})

ALLOWED_EXTENSIONS = frozenset({"jpg", "jpeg", "png", "webp", "gif"})

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))


def get_minio_settings() -> dict:
    return {
        # ENDPOINT INTERNAL untuk koneksi boto3 (jangan isi domain publik di sini).
        "endpoint": os.getenv("MINIO_ENDPOINT", "http://minio-storage:9005"),
        "access_key": os.getenv("MINIO_ACCESS_KEY"),
        "secret_key": os.getenv("MINIO_SECRET_KEY"),
        "bucket": os.getenv("MINIO_BUCKET"),
        # PUBLIC BASE URL hanya untuk string URL akhir ke frontend/DB (tidak dipakai koneksi).
        "public_base_url": os.getenv(
            "MINIO_PUBLIC_BASE_URL"
        ).strip(),
    }


_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    cfg = get_minio_settings()
    _s3_client = boto3.client(
        "s3",
        endpoint_url=cfg["endpoint"],
        aws_access_key_id=cfg["access_key"],
        aws_secret_access_key=cfg["secret_key"],
        region_name="us-east-1",
        config=BotoConfig(signature_version="s3v4"),
    )
    return _s3_client


def reset_s3_client_cache() -> None:
    """Dipakai saat testing agar perubahan ENV terbaca ulang."""
    global _s3_client
    _s3_client = None


def public_base_url() -> str:
    cfg = get_minio_settings()
    if cfg["public_base_url"]:
        return cfg["public_base_url"].rstrip("/")
    return f"{cfg['endpoint'].rstrip('/')}/{cfg['bucket']}"


def ensure_bucket() -> None:
    """Buat bucket bila belum ada (idempotent). Gagal -> log warning saja."""
    cfg = get_minio_settings()
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=cfg["bucket"])
    except ClientError as e:
        code = str(e.response.get("ResponseMetadata", {}).get("HTTPStatusCode", ""))
        err_code = ""
        try:
            err_code = str(e.response.get("Error", {}).get("Code", ""))
        except Exception:
            pass
        if code == "404" or err_code in ("404", "NoSuchBucket", "NotFound"):
            try:
                client.create_bucket(Bucket=cfg["bucket"])
                logger.info("MinIO bucket created: %s", cfg["bucket"])
            except (BotoCoreError, ClientError):
                logger.exception("Gagal membuat bucket MinIO %s", cfg["bucket"])
        else:
            logger.warning("MinIO head_bucket warning: %s", e)
    except (BotoCoreError, Exception):
        logger.exception("MinIO tidak terjangkau saat ensure_bucket")


def build_public_url(object_key: str) -> str:
    return f"{public_base_url()}/{object_key.strip('/')}"


def validate_folder(folder: str) -> str:
    cleaned = (folder or "").strip().strip("/")
    if cleaned not in ALLOWED_FOLDERS:
        raise ValueError(
            f"Folder tidak valid. Pilih salah satu: {', '.join(sorted(ALLOWED_FOLDERS))}"
        )
    return cleaned


def validate_image(filename: str, content_type: str) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    ext = (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""
    if ct not in ALLOWED_CONTENT_TYPES:
        raise ValueError("File harus berupa gambar (jpeg/png/webp/gif)!")
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Ekstensi file tidak didukung (jpg/jpeg/png/webp/gif)!")
    return ext


def build_object_key(folder: str, extension: str) -> str:
    return f"{folder}/{uuid.uuid4().hex}.{extension}"


def upload_fileobj(fileobj, object_key: str, content_type: str) -> None:
    cfg = get_minio_settings()
    get_s3_client().upload_fileobj(
        fileobj,
        cfg["bucket"],
        object_key,
        ExtraArgs={"ContentType": content_type},
    )


def upload_bytes(data: bytes, object_key: str, content_type: str) -> None:
    import io

    upload_fileobj(io.BytesIO(data), object_key, content_type)


def delete_object(object_key: str) -> None:
    cfg = get_minio_settings()
    key = (object_key or "").strip().strip("/")
    if not key or ".." in key:
        raise ValueError("object_key tidak valid")
    get_s3_client().delete_object(Bucket=cfg["bucket"], Key=key)


def object_key_from_url(url: str) -> str | None:
    """Ekstrak object_key dari public URL (untuk hapus file lama). Return None bila bukan URL MinIO kita."""
    if not url:
        return None
    base = public_base_url()
    if url.startswith(base + "/"):
        return url[len(base) + 1:]
    return None
