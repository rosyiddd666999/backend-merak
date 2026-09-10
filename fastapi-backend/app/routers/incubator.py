import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import IncubatorSettings, IncubatorStatus, TelemetryLog, RotationLog, RotasiStatus, Alert, AlertTipe, AlertLevel
from ..schemas import (
    IncubatorSettingsBase, IncubatorSettingsResponse,
    IncubatorStatusCreate, IncubatorStatusResponse,
    TelemetryLogBase, TelemetryLogResponse,
    RotationLogBase, RotationLogResponse,
)
from ..auth import require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/incubator", tags=["Incubator"])


def _parse_rotation_timestamp(raw) -> Optional[datetime]:
    """Parse toleran RotationLog.timestamp (VARCHAR bebas) -> datetime | None."""
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S",
                "%d-%m-%Y %H:%M:%S", "%Y/%m/%d %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def resolve_terakhir_rotasi(db: Session) -> Optional[datetime]:
    """
    Sumber kebenaran 'rotasi terakhir': timestamp terparse dari log
    berstatus sukses yang terbaru. Kembalikan None bila tidak ada.
    """
    logs = (
        db.query(RotationLog)
        .filter(RotationLog.status == RotasiStatus.SUKSES)
        .order_by(RotationLog.id.desc())
        .limit(10)
        .all()
    )
    for log in logs:
        parsed = _parse_rotation_timestamp(log.timestamp)
        if parsed is not None:
            return parsed
    return None


def check_and_create_alerts(db: Session, suhu: float, kelembapan: float):
    settings = db.query(IncubatorSettings).first()
    if not settings:
        return

    alerts_to_create = []

    if suhu < float(settings.suhu_min) or suhu > float(settings.suhu_max):
        level = AlertLevel.CRITICAL
        pesan = (f"Suhu {suhu}°C di luar range "
                 f"({settings.suhu_min}-{settings.suhu_max}°C)")
        alerts_to_create.append(Alert(tipe=AlertTipe.SUHU, pesan=pesan, level=level))

    if kelembapan < float(settings.kelembapan_min) or kelembapan > float(settings.kelembapan_max):
        level = AlertLevel.WARNING
        pesan = (f"Kelembapan {kelembapan}% di luar range "
                 f"({settings.kelembapan_min}-{settings.kelembapan_max}%)")
        alerts_to_create.append(Alert(tipe=AlertTipe.KELEMBAPAN, pesan=pesan, level=level))

    for alert in alerts_to_create:
        db.add(alert)

    if alerts_to_create:
        db.commit()


@router.get("/settings", response_model=IncubatorSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(IncubatorSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Pengaturan inkubator belum diinisialisasi")
    return settings


@router.put("/settings", response_model=IncubatorSettingsResponse)
def update_settings(
    settings_data: IncubatorSettingsBase,
    current_user=Depends(require_role("pemilik", "staff")),
    db: Session = Depends(get_db),
):
    settings = db.query(IncubatorSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Pengaturan inkubator belum diinisialisasi")
    for key, value in settings_data.model_dump().items():
        setattr(settings, key, value)
    settings.updated_by = current_user.id
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/status", response_model=IncubatorStatusResponse)
def get_latest_status(db: Session = Depends(get_db)):
    try:
        status = db.query(IncubatorStatus).order_by(IncubatorStatus.id.desc()).first()
    except OperationalError:
        logger.exception("incubator/status: DB operational error")
        raise HTTPException(status_code=503, detail="Database inkubator tidak tersedia")
    if not status:
        raise HTTPException(status_code=404, detail="Belum ada data status inkubator")
    if status.terakhir_rotasi is None:
        # Opsi B: isi otomatis dari rotation-log sukses terbaru.
        # In-memory saja (tanpa commit) — tabel status bersifat append-only
        # sehingga kolom ini tidak bisa diandalkan sebagai penyimpanan.
        try:
            resolved = resolve_terakhir_rotasi(db)
        except OperationalError:
            logger.exception("incubator/status: resolve rotasi gagal")
            resolved = None
        if resolved is not None:
            status.terakhir_rotasi = resolved
    return status


@router.post("/status", response_model=IncubatorStatusResponse, status_code=201)
def create_status(
    status_data: IncubatorStatusCreate,
    db: Session = Depends(get_db),
):
    new_status = IncubatorStatus(**status_data.model_dump())
    db.add(new_status)
    try:
        db.commit()
    except OperationalError:
        db.rollback()
        logger.exception("incubator/status POST: DB operational error")
        raise HTTPException(status_code=503, detail="Database inkubator tidak tersedia")
    db.refresh(new_status)

    check_and_create_alerts(db, status_data.suhu_sekarang, status_data.kelembapan_sekarang)

    return new_status


@router.get("/telemetry-logs", response_model=List[TelemetryLogResponse])
def get_telemetry_logs(db: Session = Depends(get_db)):
    return db.query(TelemetryLog).order_by(TelemetryLog.id.desc()).limit(100).all()


@router.post("/telemetry-logs", response_model=TelemetryLogResponse, status_code=201)
def create_telemetry_log(log_data: TelemetryLogBase, db: Session = Depends(get_db)):
    log = TelemetryLog(**log_data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/rotation-logs", response_model=List[RotationLogResponse])
def get_rotation_logs(db: Session = Depends(get_db)):
    return db.query(RotationLog).order_by(RotationLog.id.desc()).all()


@router.post("/rotation-logs", response_model=RotationLogResponse, status_code=201)
def create_rotation_log(log_data: RotationLogBase, db: Session = Depends(get_db)):
    log = RotationLog(**log_data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)

    if log_data.status == "gagal":
        alert = Alert(
            tipe=AlertTipe.ROTASI_GAGAL,
            pesan="Rotasi telur gagal",
            level=AlertLevel.WARNING,
        )
        db.add(alert)
        db.commit()

    return log
