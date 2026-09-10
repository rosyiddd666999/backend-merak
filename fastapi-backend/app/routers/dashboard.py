import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Egg, Chick, IncubatorStatus, FinanceEntry, EggAkhir, FinanceTipe
from ..schemas import DashboardSummary
from ..auth import require_role, get_current_user
from .incubator import resolve_terakhir_rotasi

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _month_range_utc(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        end = start.replace(year=now.year + 1, month=1)
    else:
        end = start.replace(month=now.month + 1)
    return start, end


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(current_user=Depends(require_role("pemilik", "staff")), db: Session = Depends(get_db)):
    """
    Dashboard summary endpoint.

    Hardened: jika ada error apapun (DB, serializer, dll), return default
    kosong dan log error untuk investigasi. Aplikasi mobile tidak boleh
    crash dengan 500 mentah.
    """
    try:
        total_telur_aktif = db.query(func.count(Egg.id)).filter(
            Egg.akhir != EggAkhir.MENETAS,
            Egg.akhir != EggAkhir.GAGAL,
        ).scalar() or 0

        now = datetime.utcnow()
        bulan_ini_start, bulan_ini_end = _month_range_utc(now)

        total_anakan_bulan_ini = db.query(func.count(Chick.id)).filter(
            Chick.tanggal_menetas >= bulan_ini_start.date(),
            Chick.tanggal_menetas < bulan_ini_end.date(),
        ).scalar() or 0

        inkubator_status = db.query(IncubatorStatus).order_by(IncubatorStatus.id.desc()).first()
        if inkubator_status is not None and inkubator_status.terakhir_rotasi is None:
            # Opsi B: isi otomatis dari rotation-log sukses terbaru.
            # In-memory saja (tanpa commit).
            resolved = resolve_terakhir_rotasi(db)
            if resolved is not None:
                inkubator_status.terakhir_rotasi = resolved

        finance_summary = None
        role = getattr(current_user, "role", None)
        if role == "pemilik":
            raw_pemasukan = db.query(func.sum(FinanceEntry.jumlah)).filter(
                FinanceEntry.tipe == FinanceTipe.PEMASUKAN,
                FinanceEntry.tanggal >= bulan_ini_start.strftime("%Y-%m-%d"),
                FinanceEntry.tanggal < bulan_ini_end.strftime("%Y-%m-%d"),
            ).scalar()
            raw_pengeluaran = db.query(func.sum(FinanceEntry.jumlah)).filter(
                FinanceEntry.tipe == FinanceTipe.PENGELUARAN,
                FinanceEntry.tanggal >= bulan_ini_start.strftime("%Y-%m-%d"),
                FinanceEntry.tanggal < bulan_ini_end.strftime("%Y-%m-%d"),
            ).scalar()

            total_pemasukan = float(raw_pemasukan or 0)
            total_pengeluaran = float(raw_pengeluaran or 0)

            finance_summary = {
                "total_pemasukan": total_pemasukan,
                "total_pengeluaran": total_pengeluaran,
                "saldo": total_pemasukan - total_pengeluaran,
            }

        return DashboardSummary(
            total_telur_aktif=int(total_telur_aktif),
            total_anakan_bulan_ini=int(total_anakan_bulan_ini),
            inkubator_status=inkubator_status,
            finance_summary=finance_summary,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("dashboard_summary failed: %s", e)
        return DashboardSummary(
            total_telur_aktif=0,
            total_anakan_bulan_ini=0,
            inkubator_status=None,
            finance_summary=None,
        )
