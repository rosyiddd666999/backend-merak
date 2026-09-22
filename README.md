<div align="center">

<img src="public/logo.png" alt="Logo Kampung Merak" width="120" />

# 🪶 Kampung Merak — Dashboard Inkubator Telur Merak IoT

**Sistem digitalisasi penangkaran merak: monitoring telemetri real-time, kendali aktuator ESP32, silsilah indukan → telur → anakan, CCTV live + snapshot otomatis, storage gambar MinIO, kas & penjualan, dan REST API terpadu.**

</div>

<p align="center">
  <a href="https://github.com/rosyiddd666999/backend-merak"><img src="https://img.shields.io/badge/repo-rosyiddd666999%2Fbackend--merak-181717?logo=github&logoColor=white" alt="GitHub Repo" /></a>
  <img src="https://img.shields.io/github/last-commit/rosyiddd666999/backend-merak?logo=git&logoColor=white" alt="Last Commit" />
  <img src="https://img.shields.io/github/issues-pr/rosyiddd666999/backend-merak?logo=github" alt="PRs" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/maintained-yes-brightgreen.svg" alt="Maintained" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/mqtt.js-5.10-660791?logo=eclipse-mosquitto&logoColor=white" alt="MQTT" />
  <img src="https://img.shields.io/badge/FastAPI-0.80+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/HiveMQ-Cloud-FFC72C?logo=hivemq&logoColor=black" alt="HiveMQ" />
  <img src="https://img.shields.io/badge/ESP32-S3-000000?logo=espressif&logoColor=white" alt="ESP32" />
  <img src="https://img.shields.io/badge/OpenCV-4.10-5C3EE8?logo=opencv&logoColor=white" alt="OpenCV" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Nginx-proxy-009639?logo=nginx&logoColor=white" alt="Nginx" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License MIT" />
</p>

> **Status deploy aktif:** API produksi di `https://api-merak.abdulrosyid.my.id` — dokumentasi interaktif (Swagger UI) tersedia di [`/docs`](https://api-merak.abdulrosyid.my.id/docs).

---

## 📑 Daftar Isi

- [1. Tentang Proyek](#1-tentang-proyek)
- [2. Tangkapan Layar](#2-tangkapan-layar)
- [3. Fitur Utama](#3-fitur-utama)
- [4. Arsitektur Sistem](#4-arsitektur-sistem)
- [5. Tech Stack](#5-tech-stack)
- [6. Struktur Direktori](#6-struktur-direktori)
- [7. Panduan Menjalankan (Development)](#7-panduan-menjalankan-development)
- [8. Konfigurasi Environment](#8-konfigurasi-environment)
- [9. Kontrak MQTT](#9-kontrak-mqtt)
- [10. REST API](#10-rest-api)
- [11. Hak Akses & Peran (RBAC)](#11-hak-akses--peran-rbac)
- [12. Skema Database & Aturan Silsilah](#12-skema-database--aturan-silsilah)
- [13. CCTV / RTSP Gateway](#13-cctv--rtsp-gateway)
  - [13.3 Alur Storage Gambar (Upload → DB → Render)](#133-alur-storage-gambar-upload--db--render)
- [14. Firmware ESP32 (Template)](#14-firmware-esp32-template)
- [15. Deployment Produksi](#15-deployment-produksi)
- [16. Troubleshooting](#16-troubleshooting)
- [17. Roadmap](#17-roadmap)
- [18. Kontribusi](#18-kontribusi)
- [19. Lisensi](#19-lisensi)
- [20. Kredit & Kontak](#20-kredit--kontak)
- [🇬🇧 English Summary](#-english-summary)

---

## 1. Tentang Proyek

**Kampung Merak** adalah dashboard IoT untuk mesin inkubator telur merak. Sistem menggantikan pencatatan manual dengan alur digital ujung-ke-ujung:

- **IoT real-time:** ESP32 + sensor SHT31 mempublish suhu/kelembaban/status aktuator ke HiveMQ Cloud (TLS). Browser berlangganan via MQTT WebSocket Secure (WSS) tanpa me-reload halaman.
- **Kendali jarak jauh:** Lampu pemanas, mist maker (kelembaban), dan motor rak pemutar telur dikendalikan dari web via topik `iot/cmd/*`, dengan mode AUTO/MANUAL di firmware.
- **Silsilah terdokumentasi:** Rantai `Indukan (Breeder) → Telur (Egg) → Anakan (Chick)` dengan ID generatif dan validasi anti-salah-induk.
- **Operasional lengkap:** Manajemen 100 slot inkubator, data indukan, anakan, penjualan, kas (pemasukan/pengeluaran), alert 3-state + notifikasi bermargin, dashboard ringkasan, katalog publik, CCTV live + snapshot otomatis, dan storage gambar MinIO.
- **Backend modern:** FastAPI + SQLAlchemy + MySQL (Docker), autentikasi ganda `X-API-Key` + JWT, rate-limit (SlowAPI), CORS ketat, dan auto-seed admin & pengaturan inkubator.

Dokumentasi pendalaman tersedia di [`docs/backend_api_fastapi_mysql.md`](docs/backend_api_fastapi_mysql.md) dan [`docs/FLOW.md`](docs/FLOW.md).

---

## 2. Tangkapan Layar

### 2.1 Backend — Swagger UI (`/docs`)

> Dokumentasi interaktif produksi: [`https://api-merak.abdulrosyid.my.id/docs`](https://api-merak.abdulrosyid.my.id/docs).

| Halaman Utama API | Uji Endpoint Telur |
|---|---|
| ![Main Display — Kampung Merak API + Auth Register](screenshots/main-display.png) | ![GET Eggs — respons daftar telur](screenshots/get-eggs.png) |

| Auth & Breeder | Egg, Chick & Incubator |
|---|---|
| ![Tampilan 1 — Auth dan Breeder](screenshots/tampilan1.png) | ![Tampilan 2 — Egg, Chick, dan Incubator](screenshots/tampilan2.png) |

| Telemetry, Sales & Finance | Dashboard, Alerts & Users |
|---|---|
| ![Tampilan 3 — Telemetry, Rotation, Sales, Finance](screenshots/tampilan3.png) | ![Tampilan 4 — Dashboard, Alerts, User Management](screenshots/tampilan4.png) |

### 2.2 Frontend — Dashboard Web

> Screenshot frontend menyusul. Folder `screenshots/` saat ini berisi capture backend di atas. Tampilan dashboard mengikuti role yang login (Viewer/Operator/Admin) dari hasil build produksi (`dist/`).

---

## 3. Fitur Utama

### 🌡️ Monitoring & Telemetri
- Kartu suhu/kelembaban live, tren 24 titik, status lampu/mist/motor/sensor, dan log MQTT (`RX/TX/SYSTEM/ERROR`, max 32 baris).
- Throttling cerdas: frontend hanya `POST /api/incubator/status` tiap **60 detik** agar database tidak membengkak.
- Badge 3-state presisi ikut ambang DB (`incubator_settings`, bisa diubah dari halaman Pengaturan): **Normal** (dalam range) / **Warning kuning** (di luar range tapi masih dalam margin — tanpa notifikasi) / **Perhatian** (melewati margin — backend membuat record `Alert`).
- Margin notifikasi: suhu **±0.2°C**, kelembaban **±2 poin persen** (konstanta di `routers/incubator.py` + `hooks/useIncubatorThresholds.js`, wajib sinkron). Contoh ambang 37.5–38.5 °C → badge kuning di 38.5–38.7, notifikasi saat `<37.3` / `>38.7`.

### 💡 Kendali Aktuator ESP32
- Lampu (AUTO histeresis + MANUAL_ON/OFF), mist maker (durasi 10 dtk + cooldown 5 dtk, auto saat kelembaban < ambang bawah), motor rak (30 dtk per putaran, auto tiap 4 jam / 240 menit).
- Threshold dapat diubah dari web: `lamp_thresh_on/off`, `humid_thresh_low/high`. Badge hak akses khusus Admin & Operator pada panel kontrol.

### 🥚 Nampan Telur 100 Slot
- Grid visual slot 1–100, status `Fertil / Infertil / Belum dicek` × `Proses / Menetas / Gagal`, estimasi menetas otomatis **tanggalMasuk + 28 hari**.
- **Terakhir rotasi** di-resolve otomatis dari `rotation_logs` sukses terbaru (toleran multi-format timestamp), dengan hardening `503` saat DB tidak tersedia.

### 🧬 Silsilah (Breeder → Egg → Chick)
- ID F0: `JB01` (jantan) / `BB01` (betina); keturunan & telur: `{Jantan}{Betina}-{NN}` cth. `JB01BB02-01`; anakan: `{egg_id}-C{NN}` cth. `JB01BB02-01-C01`.
- Endpoint `lineage` (pohon orang tua rekursif) dan `compare?ids=A,B` (metrik fertilitas & anakan side-by-side, dihitung on-the-fly).
- Aturan edit ketat di `silsilah.py`: field induk terkunci saat PUT, rename hanya suffix, ditolak bila ID dipakai / sudah punya turunan.

### 📹 CCTV Ganda + Health Check + Snapshot Otomatis
- Feed inkubator (`/video_feed`) & kandang (`/kandang_feed`) via OpenCV MJPEG, proxy Nginx anti mixed-content, endpoint `/cctv_health` + relay status `:9001`.
- Snapshot otomatis tiap **4 jam** (APScheduler di FastAPI → `GET /snapshot.jpg` gateway → MinIO `cctv-images/` + tabel `cctv_snapshots`); riwayat: `GET /api/cctv-snapshots` (key URL gambar: `url`, absolut siap pakai).

### 🖼️ Storage Gambar (MinIO/S3)
- Upload via `POST /api/storage/upload` (alias lama `POST /api/v1/upload`), hapus via `DELETE /api/storage/delete`. Folder resmi: `breeders-images` (foto induk), `chicks-images` (foto anak), `profile-images` (foto user), `cctv-images` (otomatis).
- URL absolut tersimpan di `Breeder.foto_url`, `Chick.foto_url`, `User.avatar_url`, `CctvSnapshot.url` — langsung dipakai `<img src>` / Flutter `Image.network`. `object_key` tersedia untuk hapus/migrasi.

### 💰 Penjualan, Keuangan & Dashboard
- CRUD Sales (Booking/DP/Lunas), Finance khusus `pemilik` (Pemasukan/Pengeluaran: Pakan, Listrik, Obat, Penjualan), `GET /api/dashboard/summary` (field `finance_summary` hanya untuk `pemilik`).

### 📖 Katalog & 🔐 Akun
- Katalog varietas *Pavo muticus* (Hijau) & *Pavo cristatus* (Biru) + paket unggulan + tombol WhatsApp admin.
- JWT login (`/auth/login`, `/auth/me`), manajemen user khusus `pemilik`, pemetaan role backend `pemilik/staff` → UI `admin/operator`, Viewer tanpa login.

---

## 4. Arsitektur Sistem

```mermaid
graph TD
    SHT[SHT31 Temp+Hum] --> ESP32[ESP32 Inkubator Controller]
    ESP32 -- MQTT TLS 8883 publish iot/telemetry/* --> HiveMQ[HiveMQ Cloud]
    HiveMQ -- MQTT WSS 8884 subscribe --> Web[React 19 + mqtt.js Browser]
    Web -- Publish iot/cmd/* --> HiveMQ
    HiveMQ --> ESP32

    Web -- HTTPS REST X-API-Key + JWT --> Nginx[Nginx Reverse Proxy]
    Nginx -- /api/* /auth/* --> API[FastAPI api-merak.abdulrosyid.my.id]
    API -- SQLAlchemy PyMySQL pool_pre_ping --> MySQL[(MySQL kampung_merak Docker)]

    Bardi[Kamera Bardi RTSP] -- TCP 554 via ESP32 Bridge Core0 --> Relay[relay_server.py :9000 + :554/:8554 + :9001 health]
    Relay --> OpenCV[OpenCV Flask Gateway :5000]
    OpenCV -- MJPEG /video_feed /kandang_feed --> Nginx
    Nginx --> Web
```

**Alur data ringkas:** `Sensor → HiveMQ → React state → UI` (detik), `React → FastAPI → MySQL` (60-detik throttle / CRUD), `Bardi → ESP32 bridge → Relay → OpenCV → Nginx → <img>` (video).

### 4.1 Sequence Telemetri Real-time

```mermaid
sequenceDiagram
    participant Sensor as Sensor SHT31 (ESP32)
    participant Broker as HiveMQ MQTT Broker
    participant Web as React Web Browser
    participant API as FastAPI Backend
    participant DB as MySQL Database

    Sensor->>Broker: Publish (iot/telemetry/temperature & humidity)
    Broker->>Web: Live Update (WebSocket wss://...:8884)
    Note over Web: Menampilkan suhu & kelembaban<br/>real-time setiap detik di UI.
    Note over Web: Throttling: Menunggu interval 60 detik
    Web->>API: HTTP POST /api/incubator/status (JSON payload)
    API->>DB: Simpan status + buat Alert bila lewat ambang+margin
```

Throttling 60 detik mencegah database membengkak akibat ribuan data masuk tiap menit.

### 4.2 Sinkronisasi Data & Fallback Luring

```mermaid
graph TD
    User([Pengguna / Admin]) -->|Input Form/Edit UI| React[React Frontend]
    React -->|Cek .env: VITE_API_BASE_URL| Check{API Terkonfigurasi?}
    Check -->|Tidak / Kosong| LocalStorage[(Browser LocalStorage)]
    Check -->|Ya / Aktif| HTTP[Kirim HTTP Request]
    HTTP -->|POST / PUT / DELETE| FastAPI[FastAPI Server]
    FastAPI -->|Simpan / Edit SQL| MySQL[(MySQL Database)]
    React -->|On App Mount / GET| FastAPI
    FastAPI -->|Ambil Data Awal| MySQL
```

Saat `VITE_API_BASE_URL` kosong, data tersimpan lokal di browser (mode luring); saat aktif, setiap tambah/ubah/hapus memicu `POST`/`PUT /api/{id}`/`DELETE /api/{id}`.

---

## 5. Tech Stack

| Lapisan | Teknologi | Versi / Keterangan |
|---|---|---|
| Frontend | React, React-DOM, Vite, TailwindCSS, PostCSS, mqtt.js | `19.1.0`, `6.3.5`, `3.4.17`, `5.10.4` — `package.json` |
| Backend | FastAPI, Uvicorn, SQLAlchemy, PyMySQL, Pydantic, python-dotenv, SlowAPI, python-jose, passlib, boto3, APScheduler, httpx, python-multipart | `fastapi-backend/requirements.txt`, Python `3.12-slim` |
| CCTV Gateway | Flask, OpenCV-Python, python-dotenv | `3.0.3`, `4.10.0.84` — `server/requirements.txt` |
| IoT | ESP32 (WiFi, FreeRTOS Core 0), SHT31 (0x44), PubSubClient, WiFiClientSecure | `esp32/incubator_controller.ino.example` (template, kredensial via placeholder) |
| Broker | HiveMQ Cloud | TLS `8883` (device), WSS `8884/mqtt` (browser) |
| Database | MySQL (Docker `webserver_database`) | `fastapi-backend/app/database.py` (`pool_pre_ping`, `pool_recycle=3600`) — MySQL wajib, tidak ada fallback SQLite |
| Storage | MinIO/S3 (`merak-storage`: `breeders-images`, `chicks-images`, `profile-images`, `cctv-images`) | `fastapi-backend/app/storage.py` (boto3, UUID filename, max 5MB) |
| Infra | Nginx reverse proxy (gzip, cache 1y, `proxy_buffering off`), Docker Compose (`database`, `proxy` external) | `nginx.conf`, `Dockerfile`, `docker-compose.yml` |
| Auth | X-API-Key per platform (`API_KEY_WEB/ANDROID`) + JWT Bearer + CORS allowlist + rate-limit | `app/main.py`, `app/auth.py`, `AGENT.md` |

---

## 6. Struktur Direktori

```text
.
├── src/                          # Frontend React 19 + Vite
│   ├── App.jsx                   # Shell, role mapping, sync REST, throttle 60s
│   ├── main.jsx / styles.css
│   ├── components/               # 24 komponen (EggTray, MqttCommandPanel, Sidebar, StatCard, ...)
│   ├── pages/                    # 13 halaman (Dashboard, Cctv, Egg, Breeders, Chicks,
│   │                             #  Katalog, Sales, Finance, Accounts, Settings, ...)
│   ├── hooks/useMqttBridge.js    # Klien mqtt.js (connect/subscribe/publish/log)
│   ├── hooks/useIncubatorThresholds.js  # Ambang DB + klasifikasi badge Normal/Warning/Perhatian
│   ├── utils/api.js              # fetchApi (X-API-Key + JWT)
│   └── data/constants.js         # Topik MQTT, ROLES, VARIETAS, initial data
├── fastapi-backend/              # REST API Python
│   ├── app/
│   │   ├── main.py               # Lifespan seed, scheduler CCTV 4 jam, CORS, X-API-Key middleware, routers
│   │   ├── database.py           # Engine MySQL (wajib MYSQL_HOST/USER/PASSWORD/DATABASE)
│   │   ├── models.py             # 12 tabel SQLAlchemy (+ users.avatar_url, cctv_snapshots)
│   │   ├── schemas.py            # Pydantic request/response (+ Upload, CctvSnapshot)
│   │   ├── auth.py / silsilah.py # JWT + require_role + aturan ID silsilah
│   │   ├── storage.py            # Klien MinIO (whitelist folder, validasi gambar, public URL)
│   │   ├── cctv_snapshot.py      # Job scraping /snapshot.jpg tiap 4 jam → MinIO + DB
│   │   └── routers/              # auth, breeders, eggs, chicks, incubator,
│   │                             # sales, finance, dashboard, alerts, users,
│   │                             # storage (+ alias legacy /api/v1), cctv (12 file)
│   ├── migrasi_storage_cctv.sql  # Migrasi sekali untuk DB existing (avatar_url + cctv_snapshots)
│   ├── Dockerfile                # python:3.12-slim + uvicorn :8000
│   ├── requirements.txt
│   └── .env.example              # Template tersanitasi (placeholder)
├── server/                       # Video gateway
│   ├── relay_server.py           # TCP relay ESP32 :9000, RTSP :554/:8554, health :9001
│   ├── rtsp_gateway_example.py   # OpenCV RTSP → MJPEG :5000
│   ├── requirements.txt
│   └── .env.example              # Template RTSP tersanitasi
├── esp32/
│   └── incubator_controller.ino.example  # Template firmware (SHT31, relay 25/27/26, HiveMQ, RTSP bridge)
│                                         # Salin jadi .ino lokal saat flashing — file .ino asli JANGAN di-commit
├── docs/
│   ├── backend_api_fastapi_mysql.md
│   └── FLOW.md
├── public/logo.png
├── screenshots/                  # main-display, get-eggs, tampilan1-4 (backend Swagger)
├── nginx.conf / Dockerfile / docker-compose.yml
├── vite.config.js                # Proxy /api,/auth → api-merak... ; /video_feed → :5000
├── AGENT.md (source of truth untuk AI agent)
└── README.md / LICENSE
```

> Catatan migrasi (`5ac6c21`): direktori legasi `backend/` (Express + SQLite `kampung-merak.db`) telah **dihapus**. Jangan lagi merujuk `BACKEND_FIXX.md / FRONTEND.md / MOBILE.md` yang sudah dibersihkan dari repo.

---

## 7. Panduan Menjalankan (Development)

### Prasyarat
- Node.js 20+, Python 3.12+, MySQL 8 (atau Docker), akses HiveMQ Cloud, satu kamera RTSP di LAN yang sama.

### 7.1 Backend — FastAPI + MySQL
```bash
cd fastapi-backend
python -m venv venv && source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # isi MYSQL_*, API_KEY_*, JWT_SECRET, CORS_ORIGINS, FIRST_ADMIN_*
# pastikan database kampung_merak sudah dibuat
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Swagger: http://localhost:8000/docs
```
Startup otomatis: `Base.metadata.create_all`, seed 1 baris `incubator_settings` (37.0–38.0 °C, 55–65 %, rotasi 240 mnt), dan seed `USR-001` bila `FIRST_ADMIN_EMAIL/PASSWORD` diisi.

> Untuk mengetes upload gambar lokal, MinIO harus jalan dan terjangkau (`MINIO_ENDPOINT`, default `http://localhost:9005`) — tanpa itu `POST /api/storage/upload` 500. Bucket `merak-storage` dibuat otomatis saat startup.

### 7.2 CCTV Gateway — Relay + OpenCV
```bash
# Terminal 1 — relay TCP (wajib dulu untuk ESP32 bridge)
python server/relay_server.py
# → ESP :9000, RTSP :554/:8554, health :9001/status

# Terminal 2 — gateway MJPEG
cd server
pip install -r requirements.txt
cp .env.example .env   # isi INCUBATOR_RTSP_URL, KANDANG_RTSP_URL (placeholder)
python rtsp_gateway_example.py
# → http://localhost:5000/video_feed
```

### 7.3 Frontend — React + Vite
```bash
npm install
cp .env.example .env   # isi VITE_MQTT_*, VITE_API_BASE_URL, VITE_API_KEY_WEB, ...
npm run dev            # → http://localhost:5173
npm run build          # → dist/ (di-track untuk deploy langsung ke STB)
```
`vite.config.js` mem-proxy `/api,/auth → https://api-merak.abdulrosyid.my.id` agar bebas CORS saat dev, dan `/video_feed → http://127.0.0.1:5000`.

---

## 8. Konfigurasi Environment

> Nilai di bawah adalah **placeholder**. Jangan commit kredensial asli. File `.env` sudah di-ignore (`.gitignore`). Contoh nyata yang lama (HiveMQ cluster, user, password, IP kamera, SSID WiFi) **sengaja tidak ditampilkan**.

**Frontend (`/.env.example`):**
```env
VITE_MQTT_URL=wss://<your-hivemq-cluster>.s1.eu.hivemq.cloud:8884/mqtt
VITE_MQTT_USERNAME=<mqtt-username>
VITE_MQTT_PASSWORD=<mqtt-password>
VITE_RTSP_MJPEG_URL=/video_feed
VITE_INKUBASI_START=2026-06-02T07:00:00
VITE_ADMIN_ACCESS_CODE=<admin-code>
VITE_OPERATOR_ACCESS_CODE=<operator-code>
VITE_API_BASE_URL=https://api-merak.abdulrosyid.my.id
VITE_API_KEY_WEB=<api-key-web>
```

**Backend (`/fastapi-backend/.env.example`):**
```env
MYSQL_HOST=<mysql-host>
MYSQL_PORT=3306
MYSQL_DATABASE=kampung_merak
MYSQL_USER=<mysql-user>
MYSQL_PASSWORD=<mysql-password>
API_KEY_WEB=<api-key-web>
API_KEY_ANDROID=<api-key-android>
JWT_SECRET=<jwt-secret-min-32-char>
CORS_ORIGINS=https://<domain-prod-anda>
FIRST_ADMIN_EMAIL=<admin-email>
FIRST_ADMIN_PASSWORD=<admin-password>
MQTT_URL=wss://<your-hivemq-cluster>.s1.eu.hivemq.cloud:8884/mqtt
MQTT_USERNAME=<mqtt-username>
MQTT_PASSWORD=<mqtt-password>
# Storage MinIO/S3 (URL absolut untuk foto; kosongkan PUBLIC_BASE_URL bila sama dengan ENDPOINT/BUCKET)
MINIO_ENDPOINT=http://localhost:9005
MINIO_ACCESS_KEY=<minio-access-key>
MINIO_SECRET_KEY=<minio-secret-key>
MINIO_BUCKET=merak-storage
MINIO_PUBLIC_BASE_URL=
MAX_UPLOAD_BYTES=5242880
# Snapshot CCTV otomatis tiap 4 jam (butuh service gateway bernama cctv-gateway, atau ganti host)
CCTV_SNAPSHOT_URL=http://cctv-gateway:5000/snapshot.jpg
CCTV_HEALTH_URL=http://cctv-gateway:5000/health
CCTV_SNAPSHOT_SOURCE=incubator
CCTV_SNAPSHOT_ENABLED=true
```

**Gateway (`/server/.env.example`):**
```env
INCUBATOR_RTSP_URL=rtsp://<user>:<password>@<ip-kamera>:<port>/V_ENC_000
KANDANG_RTSP_URL=rtsp://<user>:<password>@<ip-kamera-kandang>:<port>/stream1
```

**Firmware (`esp32/`):** salin `incubator_controller.ino.example` menjadi `incubator_controller.ino` lokal, lalu isi semua placeholder `<...>` (WiFi, HiveMQ, IP kamera, host relay) sebelum flashing. File `.ino` asli di-ignore git — jangan commit kredensial.

---

## 9. Kontrak MQTT

Broker: HiveMQ Cloud — device `8883/TLS`, browser `8884/WSS`. QoS 0, `clean:true`, `keepalive:30`, auto-reconnect 3 dtk.

| Arah | Topik | Payload | Sumber |
|---|---|---|---|
| Publish (device→web) | `iot/telemetry/temperature` | `37.8` (°C, 1 desimal, tiap 5 dtk) | Firmware ESP32 |
|  | `iot/telemetry/humidity` | `48.2` (%, 1 desimal) | Firmware ESP32 |
|  | `iot/telemetry/status_lamp` | `ON`/`OFF` | Firmware ESP32 |
|  | `iot/telemetry/status_mist` | `ON`/`OFF` | Firmware ESP32 |
|  | `iot/telemetry/status_motor` | `ON`/`OFF` | Firmware ESP32 |
|  | `iot/telemetry/status_sensor` | `OK`/`ERROR` | Firmware ESP32 |
| Subscribe (web→device) | `iot/cmd/lamp_thresh_on` | `37.5` (float) | `constants.js:11` |
|  | `iot/cmd/lamp_thresh_off` | `38.0` (float) | `constants.js:12` |
|  | `iot/cmd/humid_thresh_low` | `40.0` (float) | `constants.js:13` |
|  | `iot/cmd/humid_thresh_high` | `70.0` (float) | `constants.js:14` |
|  | `iot/cmd/lamp_mode` | `ON`/`OFF`/`AUTO` | `constants.js:15` |
|  | `iot/cmd/mist_trigger` | `TRIGGER` | `constants.js:18` |
|  | `iot/cmd/motor_trigger` | `TRIGGER` | `constants.js:17` |

Topik tambahan di frontend (`motor_turns`, `candling_mode`, `alert_ack`) dicadangkan untuk ekstensi firmware berikutnya.

---

## 10. REST API

Base prod: `https://api-merak.abdulrosyid.my.id` — **semua request wajib header `X-API-Key`**, endpoint bertanda 🔒 wajib JWT Bearer. Swagger: `/docs`.

```bash
# Publik (cukup API Key)
curl -H "X-API-Key: <api-key-web>" https://api-merak.abdulrosyid.my.id/api/eggs
curl -H "X-API-Key: <api-key-web>" https://api-merak.abdulrosyid.my.id/api/incubator/status

# Login lalu pakai token
curl -X POST https://api-merak.abdulrosyid.my.id/auth/login \
  -H "Content-Type: application/json" -H "X-API-Key: <api-key-web>" \
  -d '{"email":"<admin-email>","password":"<admin-password>"}'
curl -H "X-API-Key: <api-key-web>" -H "Authorization: Bearer <jwt>" \
  https://api-merak.abdulrosyid.my.id/api/finance
```

| Modul | Method & Endpoint | Akses |
|---|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` | publik / login |
|  | `POST /auth/register` | 🔒 `pemilik` |
| Breeder | `GET /api/breeders`, `GET /api/breeders/{id}` | publik |
|  | `POST /api/breeders`, `PUT /api/breeders/{id}` | 🔒 `pemilik,staff` |
|  | `DELETE /api/breeders/{id}` | 🔒 `pemilik` |
|  | `GET /api/breeders/{id}/lineage`, `GET /api/breeders/compare?ids=A,B` | publik |
| Egg | `GET /api/eggs` | publik |
|  | `POST /api/eggs`, `PUT /api/eggs/{id}` | 🔒 `pemilik,staff` |
|  | `DELETE /api/eggs/{id}` | 🔒 `pemilik` |
| Chick | `GET /api/chicks` | publik |
|  | `POST/PUT /api/chicks[/{id}]` | 🔒 `pemilik,staff` |
|  | `DELETE /api/chicks/{id}` | 🔒 `pemilik` |
| Incubator | `GET /api/incubator/settings`, `GET /api/incubator/status`, `GET /api/incubator/telemetry-logs`, `GET /api/incubator/rotation-logs` | publik |
|  | `PUT /api/incubator/settings` | 🔒 `pemilik,staff` (ambang suhu/kelembaban — langsung diikuti badge & notifikasi) |
|  | `POST /api/incubator/status`, `POST /api/incubator/telemetry-logs`, `POST /api/incubator/rotation-logs` | device/internal (API Key) |
| Storage | `POST /api/storage/upload` (`folder` + `file` gambar; alias lama `POST /api/v1/upload`) | 🔒 `pemilik,staff` |
|  | `DELETE /api/storage/delete?object_key=...` (alias `DELETE /api/v1/delete`) | 🔒 `pemilik,staff` |
| CCTV | `GET /api/cctv-snapshots?limit=50` (riwayat snapshot, key gambar: `url` absolut) | publik |
| Sales | `GET /api/sales` | publik |
|  | `POST/PUT /api/sales[/{id}]` | 🔒 `pemilik,staff` |
|  | `DELETE /api/sales/{id}` | 🔒 `pemilik` |
| Finance | `GET/POST/PUT/DELETE /api/finance[/{id}]` | 🔒 `pemilik` |
| Dashboard | `GET /api/dashboard/summary` | 🔒 `pemilik,staff` (`finance_summary` hanya `pemilik`) |
| Alerts | `GET /api/alerts`, `PUT /api/alerts/{id}/read` | 🔒 `pemilik,staff` |
|  | `DELETE /api/alerts/{id}` | 🔒 `pemilik` |
| Users | `GET/PUT/DELETE /api/users[/{id}]` | 🔒 `pemilik` |

Spesifikasi Pydantic lengkap: `fastapi-backend/app/schemas.py`. Urutan middleware: `RateLimit → CORS → X-API-Key → JWT+Role → logic` (`AGENT.md §8`).

---

## 11. Hak Akses & Peran (RBAC)

| Modul | Pemilik (backend) / Admin (UI) | Staff / Operator | Publik / Viewer (tanpa login) |
|---|---|---|---|
| Dashboard, CCTV, Telur view, Indukan view, Anakan view, Katalog | ✅ | ✅ | ✅ (read-only) |
| Kontrol aktuator, threshold, CCTV config | ✅ | ✅ | ❌ dikunci |
| CRUD Breeder/Egg/Chick/Sales (create/update) | ✅ | ✅ | ❌ |
| Delete Breeder/Egg/Chick/Sales | ✅ | ❌ | ❌ |
| Finance | ✅ CRUD | ❌ | ❌ |
| Dashboard summary | ✅ (+finance) | ✅ (tanpa finance) | ❌ |
| Alerts view/ack | ✅ | ✅ | ❌ |
| Alerts delete, User management, Register | ✅ | ❌ | ❌ |
| Upload gambar (`breeders/chicks/profile-images`) | ✅ | ✅ | ❌ |
| Hapus gambar MinIO | ✅ | ✅ | ❌ |
| Riwayat snapshot CCTV | ✅ | ✅ | ✅ (read-only) |

Login UI: ikon kunci di sidebar → JWT disimpan di `localStorage` (`jwt_token`), role backend dipetakan (`pemilik/admin→admin`, `staff/operator→operator`), fallback kode akses lokal `VITE_ADMIN/OPERATOR_ACCESS_CODE` untuk mode demo.

---

## 12. Skema Database & Aturan Silsilah

Tabel (`fastapi-backend/app/models.py`): `users` (+`avatar_url`), `breeders` (+`foto_url`), `eggs`, `chicks` (+`foto_url`), `incubator_settings` (1 baris global), `incubator_status` (append-only), `telemetry_logs`, `rotation_logs`, `sales`, `finance_entries`, `alerts`, `cctv_snapshots` (`captured_at`, `object_key`, `url`, `source`).

```mermaid
erDiagram
    breeders ||--o{ eggs : "induk jantan/betina"
    breeders ||--o{ breeders : "parent jantan/betina"
    eggs ||--o{ chicks : "egg_id"
    users ||--o{ finance_entries : "created_by"
    users ||--o{ incubator_settings : "updated_by"
```

**Ambang & notifikasi:** badge UI presisi ikut `incubator_settings` (dapat diubah via `PUT /api/incubator/settings` / form Pengaturan — baca selalu baris terbaru). Record `Alert` baru dibuat bila nilai melewati ambang + margin (suhu ±0.2°C, kelembaban ±2 poin). Migrasi terkait: `migrasi_silsilah.sql`, `migrasi_incubator_terakhir_rotasi.sql`, `migrasi_storage_cctv.sql` (wajib sekali untuk DB existing).

Aturan ID (`silsilah.py`): kosong saat POST = auto-generate per pasangan/per telur; prefix lama (`MRK-*`, `EGG-*`, `CHK-*`) tetap diterima (legacy bypass); `jenis_kelamin/parent_*/induk_*/egg_id` terkunci saat PUT; rename hanya suffix nomor. Migrasi terkait: `migrasi_silsilah.sql`, `migrasi_incubator_terakhir_rotasi.sql`.

---

## 13. CCTV / RTSP Gateway

Browser modern yang memuat web via HTTPS **tidak diizinkan** memuat stream RTSP/HTTP yang tidak aman langsung (mixed content). Arsitekturnya:

1. **Relay (`server/relay_server.py`):** terima ESP32 di `:9000`, layani OpenCV di `:554/:8554`, health JSON di `:9001/status|/health|/cctv_health` (`esp_connected`, `active_clients`). Deteksi cerdas: sesi 0-byte dianggap TCP ping dan **tidak** mereset ESP32.
2. **Gateway (`server/rtsp_gateway_example.py`):** OpenCV baca RTSP → resize/kompresi JPEG → Flask multipart `multipart/x-mixed-replace` di `:5000/video_feed` (+ `/kandang_feed`, `/snapshot.jpg`, `/health`).
3. **Nginx:** `/video_feed`, `/kandang_feed`, `/cctv_health` di-proxy ke `cctv-gateway:5000` dengan `proxy_buffering off` + timeout 86400s; frontend cukup pakai path relatif `/video_feed` agar lolos mixed-content HTTPS.

### 13.1 Menjalankan di Server Kandang (Produksi)

Prasyarat: PC server satu LAN dengan kamera, bisa `ping` IP kamera (pakai Static IP / DHCP Reservation), Python 3.8+, Nginx.

```bash
# Terminal 1 — relay TCP (wajib jalan DULU untuk ESP32 bridge)
python server/relay_server.py
# → ESP :9000, RTSP :554/:8554, health :9001/status

# Terminal 2 — gateway MJPEG
cd server
python -m venv venv && source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # isi INCUBATOR_RTSP_URL, KANDANG_RTSP_URL (placeholder)
python rtsp_gateway_example.py
# → http://localhost:5000/video_feed
```

Agar gateway tetap jalan setelah restart, jalankan via **systemd / Supervisor / PM2**.

Blok Nginx wajib di dalam `server {}`:

```nginx
location /video_feed {
    proxy_pass http://127.0.0.1:5000/video_feed;
    proxy_buffering off;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
# Ulangi pola yang sama untuk /kandang_feed dan /cctv_health.
```

```bash
sudo systemctl reload nginx   # Ubuntu / Linux
```

> Setelah mengubah `VITE_RTSP_MJPEG_URL`, selalu `npm run build` ulang. Nilainya harus `/video_feed` (path relatif), **bukan** `http://localhost:5000/video_feed`.

### 13.2 Snapshot Otomatis Tiap 4 Jam

Scheduler APScheduler di FastAPI (`fastapi-backend/app/cctv_snapshot.py`) fetch `GET /snapshot.jpg` dari gateway tiap 4 jam, cek `/health` dulu (skip bila kamera offline agar tidak menyimpan standby-frame), lalu upload ke MinIO folder `cctv-images/` + catat di tabel `cctv_snapshots`. Riwayat: `GET /api/cctv-snapshots`. Konfigurasi: `CCTV_SNAPSHOT_URL`, `CCTV_HEALTH_URL`, `CCTV_SNAPSHOT_ENABLED` di `fastapi-backend/.env`.

### 13.3 Alur Storage Gambar (Upload → DB → Render)

> Detail ringkas juga ada di §3 (fitur) dan §10 (endpoint) — bagian ini adalah alur lengkapnya.

**Penting:** upload saja **tidak** otomatis menempel ke data. Urutan wajibnya selalu 2 langkah: upload file → dapat `url` → `PUT` ke field foto.

```mermaid
sequenceDiagram
    participant Client as Web / Flutter
    participant API as FastAPI
    participant MinIO as MinIO / S3
    participant DB as MySQL

    Client->>API: POST /api/storage/upload (multipart: folder + file)
    API->>API: Validasi folder, tipe, ukuran (maks 5MB)
    API->>MinIO: Simpan {folder}/{uuid}.{ext} (bucket auto-create)
    MinIO-->>API: OK
    API-->>Client: {url (absolut), object_key, filename}
    Client->>API: PUT /api/breeders/{id} {foto_url: url}
    API->>DB: Simpan foto_url
    Client->>API: GET /api/breeders/{id}
    API-->>Client: foto_url (siap render di img / Image.network)
```

**Pemetaan folder → field DB:**

| Folder (`folder` form) | Field DB (via PUT) | Endpoint PUT | Akses PUT |
|---|---|---|---|
| `breeders-images` | `Breeder.foto_url` | `PUT /api/breeders/{id}` | 🔒 `pemilik,staff` |
| `chicks-images` | `Chick.foto_url` | `PUT /api/chicks/{id}` | 🔒 `pemilik,staff` |
| `profile-images` | `User.avatar_url` | `PUT /api/users/{id}` | 🔒 `pemilik` |
| `cctv-images` | `CctvSnapshot.url` | Otomatis tiap 4 jam — jangan upload manual | — |

**Aturan validasi upload:** tipe `image/jpeg/png/webp/gif` saja, maks **5MB** (`MAX_UPLOAD_BYTES`), nama file di-generate UUID agar tidak tabrakan, bucket `merak-storage` dibuat otomatis saat startup bila belum ada (`ensure_bucket`).

**Contoh request:**

```bash
curl -X POST https://api-merak.abdulrosyid.my.id/api/storage/upload \
  -H "X-API-Key: <api-key-web>" \
  -H "Authorization: Bearer <jwt-pemilik-atau-staff>" \
  -F "folder=breeders-images" \
  -F "file=@/path/foto.jpg"
# → {"message":"Upload berhasil","folder":"breeders-images",
#     "filename":"<uuid>.jpg","object_key":"breeders-images/<uuid>.jpg",
#     "url":"https://<minio-publik>/merak-storage/breeders-images/<uuid>.jpg"}
```

**Alur hapus / ganti foto:** `DELETE /api/storage/delete?object_key=breeders-images/<uuid>.jpg`. Saat ganti foto, hapus file lama dulu agar bucket tidak menumpuk (aplikasi tidak auto-hapus).

**Kontrak untuk frontend (web + Flutter):**
- Field URL (`foto_url`, `avatar_url`, snapshot `url`) selalu **absolut siap pakai** — web: `<img src={foto_url}>`, Flutter: `Image.network(url)`.
- Nilai `null` = belum ada foto → tampilkan placeholder, jangan render string kosong.
- `object_key` hanya untuk hapus/migrasi, jangan dipakai untuk render.
- `MINIO_PUBLIC_BASE_URL` wajib **HTTPS publik** (bukan `http://localhost:9005`) agar lolos mixed-content di web HTTPS. Detail keputusan: lihat riwayat diskusi absolut-vs-relatif (diputuskan: absolut + `object_key` pendamping).

---

## 14. Firmware ESP32 (Template)

> **Keamanan:** file `incubator_controller.ino` asli yang berisi kredensial produksi **sudah dihapus dari repo**. Yang tersisa hanya `esp32/incubator_controller.ino.example` (semua kredensial berupa placeholder `<...>`).

Cara flashing:

```bash
cp esp32/incubator_controller.ino.example esp32/incubator_controller.ino
# Isi semua placeholder: <wifi-ssid>, <wifi-password>,
# <your-hivemq-cluster>, <mqtt-username>, <mqtt-password>,
# <ip-kamera>, <relay-server-host>
```

Lalu buka `.ino` lokal di Arduino IDE, install `PubSubClient` + `Adafruit SHT31`, pilih board ESP32, upload. File `.ino` asli di-ignore git — jangan pernah di-commit.

- **Pin:** Lampu `25`, Mist `27`, Motor `26` (`RELAY_ON=HIGH`).
- **Sensor:** SHT31 `0x44` (SDA 21, SCL 22), baca tiap 2 dtk, publish tiap 5 dtk bila valid.
- **Kontrol:** lampu histeresis AUTO (`temp_thresh_on 37.5` / `off 38.0`), mist auto bila `humidity < humid_thresh_low` (default 40.0, atas 70.0, jalan 10 dtk + cooldown 5 dtk), motor auto tiap 4 jam (jalan 30 dtk); semua threshold & mode dapat dioverride via MQTT (lihat §9).
- **RTSP bridge:** task FreeRTOS pinned Core 0, buffer 2 KB, jembatan dua arah kamera ↔ relay server dengan auto-reconnect WiFi/MQTT.

> **Rotasi kredensial wajib:** karena file lama pernah ter-commit, riwayat git masih menyimpan kredensial tersebut. Ganti password WiFi, user/pass HiveMQ, dan kredensial kamera di sisi server/perangkat setelah penghapusan ini.

---

## 15. Deployment Produksi

Deploy langsung via Docker Compose di server (SSH) — tanpa script tambahan:

```bash
# Frontend (bila ada perubahan UI)
npm install
npm run build          # hasil ke dist/ (di-track untuk STB)

# Di server:
git pull
cd /home/edy/merak/backend   # sesuaikan path checkout di server
docker compose up -d --build api   # --build WAJIB agar kode baru masuk image
docker compose ps
curl -s http://localhost:8000/openapi.json | grep -c '"/api/storage/upload"'
# angka > 0 = endpoint storage/cctv sudah live
```

Prasyarat tiap deploy: `.env` produksi berisi `MINIO_*`/`CCTV_*`, dan migrasi SQL baru (mis. `migrasi_storage_cctv.sql`) sudah dijalankan sekali di MySQL.

Komponen:

- **Frontend:** `Dockerfile` (`nginx:alpine`, copy `dist/` + `nginx.conf`, `chmod 755`, expose 80) dengan gzip + cache aset 1 tahun (`index.html` no-cache) + proxy `/api/,/auth/,/video_feed,/kandang_feed,/cctv_health`.
- **API:** `fastapi-backend/Dockerfile` (`python:3.12-slim`, `uvicorn :8000`), `docker-compose.yml` (service `api`, network external `webserver_database` + `webserver_proxy`, `env_file: fastapi-backend/.env`, `restart: unless-stopped`).

---

## 16. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| `401 X-API-Key tidak valid` | Header kurang/salah | Kirim `X-API-Key: <API_KEY_WEB>` di semua request; samakan dengan backend `.env` |
| `503 Database inkubator tidak tersedia` | `MYSQL_*` salah / pool putus | Cek `docker network`, `MYSQL_HOST/USER/PASSWORD/DATABASE`, `pool_pre_ping`; lihat log `merak` |
| `RuntimeError: MySQL configuration is incomplete` | Env belum diisi | Lengkapi 4 var wajib di `fastapi-backend/.env` |
| MQTT `error/offline` di UI | URL WSS salah / kredensial / firewall | Pakai `wss://...:8884/mqtt` untuk browser (bukan `1883`), cek user/pass, buka DevTools → Network WS |
| CORS ditolak | Origin belum allowlist | Tambah domain ke `CORS_ORIGINS` backend; dev gunakan proxy Vite |
| `429 Too Many Requests` | Kena SlowAPI rate-limit | Kurangi frekuensi polling / naikkan limit per IP/key |
| CCTV blank | IP kamera berubah / relay belum jalan | `ping <ip-kamera>`, pastikan `relay_server.py` dulu baru gateway, gunakan static IP/DHCP reservation |
| Video patah-patah | Resolusi Bardi tinggi | Pastikan `cv2.resize` + `proxy_buffering off` di Nginx |
| ESP32 churn (connect/disconnect) | TCP ping dianggap putus | Sudah ditangani (0-byte = ping, sesi dipertahankan) — update ke `relay_server.py` terbaru |
| `Slot sudah terisi` / `422` silsilah | Slot duplikat / ganti induk dilarang | Pakai slot 1–100 unik; rename hanya suffix nomor |
| Badge kuning tapi tidak ada notifikasi | Perilaku normal: nilai di zona margin (suhu ±0.2°C, humidity ±2 poin di luar ambang) | Notifikasi/record Alert baru muncul bila melewati margin; cek `GET /api/incubator/settings` untuk ambang aktif |
| Badge masih pakai ambang lama setelah update DB | Frontend baca sekali saat mount | Refresh halaman (hook `useIncubatorThresholds` fetch ulang) atau simpan via form Pengaturan agar auto-refresh |
| Upload `400 Folder tidak valid` | Nama folder salah | Pakai persis: `breeders-images`, `chicks-images`, `profile-images` (`cctv-images` otomatis) |
| Snapshot CCTV tidak bertambah | Gateway tidak terjangkau / kamera offline / job disabled | Cek `CCTV_SNAPSHOT_URL` (nama service `cctv-gateway` harus se-network), `/health` gateway, dan `CCTV_SNAPSHOT_ENABLED=true`; job skip diam-diam saat offline |

---

## 17. Roadmap

- [ ] Play Integrity (Android) + token integrity untuk endpoint sensitif (`AGENT.md §8.2`)
- [ ] Sertifikat keaslian + QR silsilah (DCA)
- [ ] Multi-inkubator (saat ini 1 unit fisik)
- [ ] Peringatan inbreeding di breeder compare
- [ ] Push notification (FCM/OneSignal) — saat ini polling `/api/alerts`
- [ ] Test otomatis backend (`pytest`) & E2E frontend

---

## 18. Kontribusi

1. Fork repo `rosyiddd666999/backend-merak`, buat branch `feat/<nama-fitur>`.
2. Ikuti `AGENT.md` sebagai source of truth (JS: `npm run build` lolos; Python: hormati `require_role` + `silsilah.py`).
3. Jangan commit `.env`, kredensial, atau `venv/node_modules`. Gunakan placeholder di `.env.example`.
4. Buka PR dengan deskripsi jelas + screenshot bila menyentuh UI. PR welcome!

---

## 19. Lisensi

Proyek ini dilisensikan di bawah **MIT License** — lihat file [`LICENSE`](LICENSE). Bebas dipakai, dimodifikasi, dan didistribusikan dengan mencantumkan atribusi.

---

## 20. Kredit & Kontak

- **Repository utama:** [rosyiddd666999/backend-merak](https://github.com/rosyiddd666999/backend-merak)
- **Kontributor:** [PrasetyaRiski/kampung_merak](https://github.com/PrasetyaRiski/kampung_merak)
- **API produksi:** [`https://api-merak.abdulrosyid.my.id`](https://api-merak.abdulrosyid.my.id) — Swagger: [`/docs`](https://api-merak.abdulrosyid.my.id/docs)
- **Tim:** Kampung Merak & Mitra Pengembang — modul IoT, backend, frontend, dan firmware ESP32.

---

## 🇬🇧 English Summary

**Kampung Merak** is an IoT dashboard for peacock-egg incubators: live telemetry (ESP32 + SHT31 → HiveMQ → React WSS) with DB-driven 3-state badges (Normal / silent yellow Warning in margin / Perhatian + Alert record beyond margin: ±0.2°C, ±2pp humidity), remote actuator control (heater lamp, mist maker, egg-tray motor with adjustable thresholds), pedigree tracking (`Breeder → Egg → Chick` with generative IDs), dual CCTV live feeds (Bardi RTSP → ESP32 bridge → TCP relay → OpenCV MJPEG → Nginx) plus automatic snapshots every 4 hours to MinIO, MinIO/S3 image storage (absolute URLs ready for `<img>`/`Image.network`), sales/finance, and a hardened FastAPI + MySQL backend (`X-API-Key` + JWT, CORS, rate-limit). Main repo: `rosyiddd666999/backend-merak` (contributor: `PrasetyaRiski/kampung_merak`), production API: `https://api-merak.abdulrosyid.my.id`, license: MIT. See sections above for architecture, MQTT contract, REST endpoints, RBAC matrix, and deployment.
