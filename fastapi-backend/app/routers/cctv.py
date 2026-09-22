"""Riwayat snapshot CCTV incubator (diisi otomatis tiap 4 jam)."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CctvSnapshot
from ..schemas import CctvSnapshotResponse

router = APIRouter(prefix="/api/cctv-snapshots", tags=["CCTV"])


@router.get("", response_model=List[CctvSnapshotResponse])
def list_snapshots(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return (
        db.query(CctvSnapshot)
        .order_by(CctvSnapshot.id.desc())
        .limit(limit)
        .all()
    )
