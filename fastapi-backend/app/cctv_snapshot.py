"""Scraping gambar CCTV incubator tiap 4 jam -> MinIO + tabel cctv_snapshots."""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime

import httpx
from botocore.exceptions import BotoCoreError, ClientError
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import CctvSnapshot
from .storage import build_object_key, build_public_url, ensure_bucket, upload_bytes

logger = logging.getLogger(__name__)

CCTV_FOLDER = "cctv-images"


def get_cctv_settings() -> dict:
    base = os.getenv("CCTV_SNAPSHOT_URL", "http://cctv-gateway:5000/snapshot.jpg").rstrip("/")
    health = os.getenv("CCTV_HEALTH_URL", "")
    if not health:
        # Turunkan dari snapshot URL: http://host:port/snapshot.jpg -> http://host:port/health
        try:
            from urllib.parse import urlsplit, urlunsplit

            parts = urlsplit(base)
            health = urlunsplit((parts.scheme, parts.netloc, "/health", "", ""))
        except Exception:
            health = "http://cctv-gateway:5000/health"
    return {
        "snapshot_url": base,
        "health_url": health,
        "enabled": os.getenv("CCTV_SNAPSHOT_ENABLED", "true").lower() not in ("0", "false", "no"),
        "source": os.getenv("CCTV_SNAPSHOT_SOURCE", "incubator"),
        "timeout": float(os.getenv("CCTV_SNAPSHOT_TIMEOUT", "15")),
    }


def is_camera_live(timeout: float = 5.0) -> bool:
    """Cek gateway /health agar tidak menyimpan standby-frame saat offline."""
    cfg = get_cctv_settings()
    try:
        resp = httpx.get(cfg["health_url"], timeout=timeout)
        if resp.status_code != 200:
            return False
        data = resp.json()
        if isinstance(data, dict) and "incubator_reachable" in data:
            return bool(data["incubator_reachable"])
        return True
    except Exception as e:
        logger.warning("CCTV health check gagal (%s): %s", cfg["health_url"], e)
        return False


def fetch_snapshot_bytes(timeout: float = 15.0) -> bytes | None:
    cfg = get_cctv_settings()
    try:
        resp = httpx.get(cfg["snapshot_url"], timeout=timeout)
        if resp.status_code != 200:
            logger.warning("Snapshot CCTV status %s dari %s", resp.status_code, cfg["snapshot_url"])
            return None
        ctype = resp.headers.get("content-type", "")
        if "image" not in ctype:
            logger.warning("Snapshot CCTV bukan gambar (content-type=%s)", ctype)
            return None
        if not resp.content:
            return None
        return resp.content
    except Exception as e:
        logger.warning("Gagal fetch snapshot CCTV: %s", e)
        return None


def store_snapshot(db: Session, image: bytes, source: str = "incubator") -> CctvSnapshot:
    ensure_bucket()
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    object_key = f"{CCTV_FOLDER}/{stamp}-{uuid.uuid4().hex}.jpg"
    upload_bytes(image, object_key, "image/jpeg")
    row = CctvSnapshot(
        captured_at=datetime.now(),
        object_key=object_key,
        url=build_public_url(object_key),
        source=source,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def run_cctv_snapshot_job() -> None:
    """Entry point APScheduler (sync). Skip bila kamera offline / disabled."""
    cfg = get_cctv_settings()
    if not cfg["enabled"]:
        logger.info("CCTV snapshot job disabled (CCTV_SNAPSHOT_ENABLED=false)")
        return
    if not is_camera_live():
        logger.info("CCTV offline, snapshot dilewati (tidak menyimpan standby-frame)")
        return
    image = fetch_snapshot_bytes(timeout=cfg["timeout"])
    if not image:
        logger.warning("Snapshot CCTV kosong, dilewati")
        return
    db = SessionLocal()
    try:
        row = store_snapshot(db, image, source=cfg["source"])
        logger.info("CCTV snapshot tersimpan: %s", row.object_key)
    except (BotoCoreError, ClientError) as e:
        db.rollback()
        logger.exception("Gagal upload snapshot CCTV ke MinIO: %s", e)
    except Exception:
        db.rollback()
        logger.exception("Gagal menyimpan snapshot CCTV")
    finally:
        db.close()


def build_object_key_for_test(folder: str, ext: str) -> str:  # helper kecil utk testing
    return build_object_key(folder, ext)
