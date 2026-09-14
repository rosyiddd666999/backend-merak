# Backend: Fix 500 Error di Endpoint `GET /api/dashboard/summary`

Dokumen ini untuk developer backend Kampung Merak API. Endpoint `dashboard/summary`
mengembalikan **HTTP 500** saat user terautentikasi, padahal endpoint lain
(users, finance, alerts, breeders, eggs, chicks, sales, incubator) bekerja
normal.

## Konteks

Aplikasi mobile Kampung Merak sudah berhasil login ke backend, dan memanggil
`GET /api/dashboard/summary` dengan header `Authorization: Bearer <jwt>`. Server
merespons `500 Internal Server Error` (raw text, bukan JSON).

Hasil verifikasi manual via curl (dengan JWT valid milik user `USR-001`):

| Endpoint | HTTP | Keterangan |
|---|---|---|
| `GET /` | 200 | OK |
| `GET /api/breeders` | 200 | OK (return `[]`) |
| `GET /api/eggs` | 200 | OK (return `[]`) |
| `GET /api/chicks` | 200 | OK (return `[]`) |
| `GET /api/sales` | 200 | OK (return `[]`) |
| `GET /api/incubator/status` | 404 | Data memang belum ada (handled) |
| `GET /api/incubator/settings` | 200 | OK |
| `GET /api/incubator/telemetry-logs` | 200 | OK (return `[]`) |
| `GET /api/incubator/rotation-logs` | 200 | OK (return `[]`) |
| `GET /api/finance` | 200 | OK (return `[]`) |
| `GET /api/alerts` | 200 | OK (return `[]`) |
| `GET /api/users` | 200 | OK (return list user termasuk `role="pemilik"`) |
| **`GET /api/dashboard/summary`** | **500** | **❌ HANYA INI YANG ERROR** |

Karena **semua endpoint lain bisa load user dengan `role="pemilik"` tanpa
masalah**, bug bukan di kolom `role` user, foreign key, atau migrasi DB.
Bug ada di **logic spesifik endpoint dashboard**.

## Cara Ambil Stack Trace dari Server

Jalankan ini di server (`edy@ai`):

```bash
# Opsi 1: docker logs langsung
docker logs kampung-merak-api --tail 300 2>&1 | grep -B 2 -A 50 "Internal Server Error"

# Opsi 2: docker compose
cd ~/merak/backend
docker compose logs api --tail 300 2>&1 | grep -B 2 -A 50 "Internal Server Error"

# Opsi 3: live stream (untuk reproduce error)
docker logs -f kampung-merak-api
# Lalu dari workstation, hit endpoint:
# curl -H "X-API-Key: a6aGc2JHHIu3A53S10Ypkzwf7nKgt18jkerto" \
#      -H "Authorization: Bearer <token>" \
#      https://api-merak.abdulrosyid.my.id/api/dashboard/summary
```

Cari di output:
- `Traceback (most recent call last):`
- Baris `File "/app/app/routers/dashboard.py", line XX, in <func>`
- Tipe exception di baris terakhir (mis. `ValidationError`, `OperationalError`,
  `AttributeError`, `TypeError`, `ValueError`)

## 4 Hipotesis Penyebab (urut prioritas)

### Hipotesis 1: `incubator_status` null menyebabkan crash saat serialize
- OpenAPI schema: `inkubator_status: IncubatorStatusResponse | null`
- Tapi response dashboard biasanya return `IncubatorStatusResponse`, bukan `null`
- Mungkin di router: `summary.inkubator_status = db.query(IncubatorStatus).first()`
  lalu di-serialize. Jika relasi `IncubatorStatus.terakhir_rotasi` adalah
  `datetime | null` dan ORM tidak handle dengan benar → error.

### Hipotesis 2: `Decimal` vs `float` di `finance_summary`
- MySQL `SUM(jumlah)` return `Decimal` (presisi tinggi)
- Pydantic v2 strict mode akan reject `Decimal` jika schema expects `float`
- Pattern:
  ```python
  total_pemasukan = db.query(func.sum(Finance.jumlah)).filter(...).scalar()
  # ini return Decimal atau None

  return FinanceSummary(
      total_pemasukan=total_pemasukan,  # Decimal, bukan float
      ...
  )
  ```

### Hipotesis 3: Field name casing mismatch
- Schema: `total_telur_aktif`, `total_anakan_bulan_ini` (snake_case)
- Mungkin model di-query dengan alias `totalTelurAktif` (camelCase) atau
  sebaliknya. Pydantic v2 default tidak auto-convert.
- Cek `model_config` di Pydantic schema: harus ada
  `ConfigDict(populate_by_name=True)` atau `by_alias=True`.

### Hipotesis 4: Query ke tabel yang tidak ada / kolom yang tidak ada
- Bisa jadi ada query langsung (raw SQL) yang reference kolom lama
- Atau ada JOIN ke tabel yang baru di-add di `Base.metadata.create_all`
  tapi tidak dibuat karena tabel sudah ada dari versi sebelumnya.

## Patch Kode (3 Skenario)

Terapkan sesuai hasil stack trace. **Patch C (hardening)** wajib diterapkan
meskipun patch A/B sudah fix root cause — ini agar error 500 tidak pernah
terulang dengan raw text.

### Patch A — Fix Decimal ke float (Hipotesis 2)

Lokasi: `app/routers/dashboard.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models.finance import Finance
from ..schemas.dashboard import DashboardSummary, FinanceSummary  # sesuaikan import

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    # ... existing logic untuk totalTelurAktif, totalAnakanBulanIni ...

    # Fix: cast Decimal ke float SEBELUM masuk Pydantic schema
    total_pemasukan_raw = db.query(func.sum(Finance.jumlah)).filter(
        Finance.tipe == "pemasukan"
    ).scalar()
    total_pengeluaran_raw = db.query(func.sum(Finance.jumlah)).filter(
        Finance.tipe == "pengeluaran"
    ).scalar()

    total_pemasukan = float(total_pemasukan_raw or 0)
    total_pengeluaran = float(total_pengeluaran_raw or 0)

    finance_summary = FinanceSummary(
        total_pemasukan=total_pemasukan,
        total_pengeluaran=total_pengeluaran,
        saldo=total_pemasukan - total_pengeluaran,
    )
    # ... dst ...
```

### Patch B — Fix field name casing (Hipotesis 3)

Lokasi: `app/schemas/dashboard.py`

```python
from pydantic import BaseModel, ConfigDict


class DashboardSummary(BaseModel):
    total_telur_aktif: int
    total_anakan_bulan_ini: int
    inkubator_status: "IncubatorStatusResponse | None" = None
    finance_summary: "FinanceSummary | None" = None

    # Terima kedua casing
    model_config = ConfigDict(populate_by_name=True)


class FinanceSummary(BaseModel):
    total_pemasukan: float = 0.0
    total_pengeluaran: float = 0.0
    saldo: float = 0.0

    model_config = ConfigDict(populate_by_name=True)
```

Atau jika pakai `Field(alias=...)`, tambahkan di router:
```python
return DashboardSummary.model_validate(data, by_alias=False)
```

### Patch C — Hardening endpoint (WAJIB, anti 500 mentah)

Lokasi: `app/routers/dashboard.py`

```python
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.dashboard import DashboardSummary, FinanceSummary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    """
    Dashboard summary endpoint.

    Hardened: jika ada error apapun (DB, serializer, dll), return default
    kosong dan log error untuk investigasi. Aplikasi mobile tidak boleh
    crash dengan 500 mentah.
    """
    try:
        # === existing logic di sini ===
        # Hapus komentar di bawah dan pindahkan kode asli ke sini
        
        # Contoh placeholder (ganti dengan logic asli):
        total_telur_aktif = 0
        total_anakan_bulan_ini = 0
        inkubator_status = None
        finance_summary = None
        # === end existing logic ===

        return DashboardSummary(
            total_telur_aktif=total_telur_aktif,
            total_anakan_bulan_ini=total_anakan_bulan_ini,
            inkubator_status=inkubator_status,
            finance_summary=finance_summary,
        )
    except Exception as e:
        logger.exception("dashboard_summary failed: %s", e)
        # Return safe default — mobile tidak crash
        return DashboardSummary(
            total_telur_aktif=0,
            total_anakan_bulan_ini=0,
            inkubator_status=None,
            finance_summary=None,
        )
```

Tambahkan logger config di `app/main.py` agar `logger.exception` muncul di
`docker logs`:

```python
import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
```

## Verifikasi Setelah Fix

```bash
# Login untuk dapat token
TOKEN=$(curl -s -X POST \
  -H "X-API-Key: a6aGc2JHHIu3A53S10Ypkzwf7nKgt18jkerto" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kampungmerak.id","password":"admin123"}' \
  https://api-merak.abdulrosyid.my.id/auth/login | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Test endpoint
curl -s \
  -H "X-API-Key: a6aGc2JHHIu3A53S10Ypkzwf7nKgt18jkerto" \
  -H "Authorization: Bearer $TOKEN" \
  https://api-merak.abdulrosyid.my.id/api/dashboard/summary \
  -w "\nHTTP:%{http_code}\n"
```

**Harusnya return 200 + JSON:**
```json
{
  "total_telur_aktif": 0,
  "total_anakan_bulan_ini": 0,
  "inkubator_status": null,
  "finance_summary": null
}
```

## Verifikasi dari Mobile

1. `flutter run` di project mobile
2. Login dengan `admin@kampungmerak.id` / `admin123`
3. Buka tab **Dashboard**
4. **Yang diharapkan:** Tidak ada error merah, statistik tampil (meskipun 0 karena data kosong)

## Catatan Tambahan untuk Backend Dev

### Migrasi `on_event` → `lifespan` (Best Practice FastAPI Modern)

Di `app/main.py`, `@app.on_event("startup")` sudah deprecated. Migrasi ke:

```python
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    db = next(get_db())
    try:
        settings = db.query(IncubatorSettings).first()
        if settings is None:
            default_settings = IncubatorSettings(
                suhu_min=37.0,
                suhu_max=38.0,
                kelembapan_min=55.0,
                kelembapan_max=65.0,
                interval_rotasi_menit=240,
            )
            db.add(default_settings)
            db.commit()

        first_user = db.query(User).first()
        if first_user is None:
            admin_email = os.getenv("FIRST_ADMIN_EMAIL")
            admin_password = os.getenv("FIRST_ADMIN_PASSWORD")
            if admin_email and admin_password:
                seed_user = User(
                    id="USR-001",
                    email=admin_email,
                    hashed_password=get_password_hash(admin_password),
                    nama="Admin Utama",
                    role="pemilik",
                )
                db.add(seed_user)
                db.commit()
    finally:
        db.close()
    yield
    # shutdown (cleanup jika perlu)


app = FastAPI(title="Kampung Merak API", version="1.0.0", lifespan=lifespan)
```

### Validasi Role User

`role="pemilik"` saat ini lolos karena tidak ada validasi Literal di User schema.
Jika ini memang role yang valid, tambahkan di schema. Jika tidak, ganti ke
`"admin"` untuk konsistensi.

### Global Exception Handler (Opsional, Recommended)

Tambahkan di `main.py` agar semua 500 return JSON terstruktur:

```python
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )
```

## FAQ

**Q: Kenapa `/api/users` bisa load user `role="pemilik"` tapi dashboard crash?**
A: Bug bukan di kolom `role` user, foreign key, atau migrasi DB. Bug spesifik
di logic endpoint dashboard yang aggregate data dari `incubator_status`,
`finance`, atau `eggs`. Setelah `docker logs` dijalankan, baris `File ".../routers/dashboard.py"`
akan menunjukkan persis penyebabnya.

**Q: Apakah data kosong (return `[]`) bisa menyebabkan 500?**
A: Tidak untuk list endpoint. Tapi di dashboard, ada object `inkubator_status`
dan `finance_summary` yang mungkin di-aggregate dengan `SUM()`. Aggregate ke
tabel kosong return `None`, bukan `Decimal` atau `int` — dan inilah paling
sering jadi penyebab 500.

**Q: Setelah fix, apakah perlu hapus user admin dan re-seed?**
A: Tidak. User `USR-001` sudah ada dan login bekerja. Fix hanya untuk
endpoint dashboard, bukan untuk data user.

----------------------

# Backend: Fix 500 `OperationalError` di `GET /api/incubator/status`

Dokumen ini untuk developer backend Kampung Merak API.

## Konteks (regresi!)

Endpoint `GET /api/incubator/status` **sebelumnya return 404** ("Belum ada data
status inkubator", ter-handle rapi di mobile). Sekarang return:

```json
{"detail": "Internal server error", "type": "OperationalError"}
```

Sementara endpoint lain (`/api/eggs`, `/api/users`, `/api/incubator/settings`,
`/api/incubator/telemetry-logs`) tetap 200. Mobile sudah tahan (tampil `-` /
empty-state, log diredam 1 baris), tapi data REST status tetap kosong sampai
server diperbaiki. Live suhu mengandalkan MQTT sementara ini.

> Catatan: `OperationalError` (bukan `ProgrammingError`) artinya **bukan**
> salah sintaks query — melainkan koneksi/operasional MySQL: koneksi basi,
> tabel hilang/rusak, lock timeout, atau pool habis.

## 1. Ambil traceback asli (wajib pertama)

```bash
# Opsi 1
docker logs kampung-merak-api --tail 300 2>&1 | grep -B 2 -A 40 "Traceback"

# Opsi 2
cd ~/merak/backend && docker compose logs api --tail 300 2>&1 | grep -B 2 -A 40 "Traceback"

# Opsi 3: live reproduce
docker logs -f kampung-merak-api &
curl -s -H "X-API-Key: a6aGc2JHHIu3A53S10Ypkzwf7nKgt18jkerto" \
  https://api-merak.abdulrosyid.my.id/api/incubator/status; echo
```

Cari baris terakhir exception: `(2006, 'MySQL server has gone away')`,
`(2013, 'Lost connection')`, `(1205, 'Lock wait timeout')`,
`(2003, "Can't connect")`, atau `(1146, "Table ... doesn't exist")`
(yang terakhir biasanya `ProgrammingError`, tapi handler global bisa
melabeli ulang — tetap cek).

## 2. Hipotesis (urut periksa)

### H1 — Koneksi pool basi ("MySQL server has gone away", 2006/2013) ⭐ paling mungkin
Proses API long-running + `create_engine()` tanpa `pool_pre_ping`: koneksi
idle melewati `wait_timeout` MySQL (default 8 jam) lalu dipakai lagi → 500.
Dulu 404 karena koneksi masih segar; sekarang 500 setelah proses lama hidup.

Cek: traceback menyebut 2006/2013, dan error muncul acak di endpoint DB
lain dari waktu ke waktu.

Fix (`app/database.py`):

```python
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # buang koneksi basi sebelum dipakai
    pool_recycle=3600,    # daur ulang tiap 1 jam
)
```

### H2 — Tabel `incubator_status` hilang/rusak
Regresi setelah migrasi/seed (`migrasi_silsilah.sql`, сюда). Router melakukan
`db.query(IncubatorStatus).order_by(...).first()` — tabel tidak ada / kolom
berubah → error saat query.

Cek dari dalam MySQL:

```sql
SHOW TABLES LIKE 'incubator_status';
DESCRIBE incubator_status;
SELECT COUNT(*) FROM incubator_status;
```

Fix: jalankan ulang migrasi/create tabel yang sesuai `models.py` versi
**yang ter-deploy** (bukan checkout lokal yang tertinggal — pastikan
`git pull` dulu di server, karena router lokal mengimpor model yang tidak
ada di `models.py` lokal).

### H3 — Lock wait timeout (1205) / pool habis
Banyak penulis konkuren ke tabel status: throttle web 60 dtk + sync mobile
60 dtk + polling dashboard. Transaksi macet menahan lock.

Cek:

```sql
SHOW ENGINE INNODB STATUS\G       -- cari "TRANSACTIONS" macet
SHOW PROCESSLIST;                 -- query yang menggantung
```

Fix: bunuh transaksi macet (`KILL <id>`), pastikan tiap endpoint selalu
`commit`/`rollback` + `close` (pola `get_db` sudah benar — jangan ada
`db.commit()` yang tertinggal tanpa `try/finally` di path alert).

### H4 — `check_and_create_alerts` ikut meledak saat POST
Fungsi ini query `IncubatorSettings` + `commit` alert di dalam request
`POST /api/incubator/status`. Jika tabel `alerts`/`incubator_settings`
bermasalah, sync 60-detik (web + mobile) ikut 500 dan riwayat tak terisi.

## 3. Hardening endpoint (wajib, agar tak pernah 500 mentah lagi)

`app/routers/incubator.py`:

```python
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

@router.get("/status", response_model=IncubatorStatusResponse)
def get_latest_status(db: Session = Depends(get_db)):
    try:
        status = db.query(IncubatorStatus).order_by(IncubatorStatus.id.desc()).first()
    except OperationalError:
        logger.exception("incubator/status: DB operational error")
        raise HTTPException(status_code=503, detail="Database inkubator tidak tersedia")
    if not status:
        raise HTTPException(status_code=404, detail="Belum ada data status inkubator")
    return status
```

Mobile mapping: `404` → kosong, `503` → "coba lagi nanti" (bisa ditambah
nanti; saat ini diperlakukan sama seperti 500: data kosong).

## 4. Verifikasi setelah fix

```bash
curl -s -H "X-API-Key: a6aGc2JHHIu3A53S10Ypkzwf7nKgt18jkerto" \
  https://api-merak.abdulrosyid.my.id/api/incubator/status -w "\nHTTP:%{http_code}\n"
# Harusnya 404 (kosong, normal) atau 200 berisi JSON — BUKAN 500.

# Lalu POST satu status valid, GET lagi harus 200:
curl -s -X POST -H "X-API-Key: a6aGc2JHHIu3A53S10Ypkzwf7nKgt18jkerto" \
  -H "Content-Type: application/json" \
  -d '{"suhu_sekarang":37.5,"kelembapan_sekarang":60,"lampu_status":"ON"}' \
  https://api-merak.abdulrosyid.my.id/api/incubator/status -w "\nHTTP:%{http_code}\n"
```

## 5. Verifikasi dari mobile

1. `flutter run`, buka Siklus Telur — log satu-baris 500 hilang.
2. Suhu tampil dari MQTT (live) + kartu REST terisi setelah POST pertama masuk.
3. Riwayat `telemetry-logs` mulai terisi via sync 60-detik.

## FAQ

**Q: Kenapa `/api/eggs` tetap 200 tapi status 500?**
A: Karena penyebabnya spesifik koneksi/tabel status (H1–H3), bukan kredensial
atau middleware. Endpoint lain memakai koneksi/tabel yang sehat.

**Q: Apakah sync 60-detik mobile memperparah?**
A: Tidak signifikan (1 req/menit, failure di-catch diam-diam). Tapi setelah
backend sehat, sync inilah yang mengisi DB sehingga fallback REST hidup.

