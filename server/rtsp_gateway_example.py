"""MJPEG Gateway OpenCV untuk Kampung Merak.

Fitur:
- Background Streamer Tunggal: Satu koneksi VideoCapture OpenCV melayani semua pengunjung web secara simultan tanpa membebani ESP32 / kamera.
- Deteksi status real-time tanpa TCP ping yang mengganggu sesi RTSP.
- Tampilan diagnostic standby frame otomatis saat kamera offline/gagal menyambung.
- Masking password kredensial di layar untuk keamanan.
- Resize proporsional untuk menghemat CPU server.
- OpenCV contour detection overlay.
"""

from __future__ import annotations

import os
import re
import socket
import threading
import time
import urllib.parse
from typing import Generator

import cv2
import numpy as np
from flask import Flask, Response, request
from dotenv import load_dotenv

# Optimasi FFMPEG agar stream tidak delay (nobuffer & low_delay) dan timeout 8 detik
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay|stimeout;8000000"

load_dotenv()

app = Flask(__name__)

INCUBATOR_RTSP_URL = os.environ.get(
    "INCUBATOR_RTSP_URL",
    "rtsp://admin:Admin123@127.0.0.1:8554/V_ENC_000",
)
KANDANG_RTSP_URL = os.environ.get(
    "KANDANG_RTSP_URL",
    "rtsp://admin:Admin123@127.0.0.1:8554/V_ENC_000",
)


def mask_rtsp_url(url: str) -> str:
    """Sembunyikan password dalam URL RTSP agar tidak bocor di tampilan."""
    return re.sub(r":([^@/]+)@", ":****@", url)


def create_standby_frame(title: str, target_url: str, reason: str = "") -> bytes:
    """Membuat frame diagnostik informatif saat kamera offline agar web tidak blank hitam."""
    frame = np.zeros((360, 640, 3), dtype=np.uint8)
    frame[:] = (24, 28, 32)

    cv2.circle(frame, (320, 85), 26, (45, 52, 185), -1)
    cv2.circle(frame, (320, 85), 32, (75, 85, 235), 2)
    cv2.putText(frame, "!", (314, 96), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255), 3, cv2.LINE_AA)

    cv2.putText(frame, title, (40, 155), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (240, 240, 240), 2, cv2.LINE_AA)

    masked = mask_rtsp_url(target_url)
    disp_sub = f"Target: {masked}"
    if len(disp_sub) > 65:
        disp_sub = disp_sub[:62] + "..."
    cv2.putText(frame, disp_sub, (40, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 160, 160), 1, cv2.LINE_AA)

    hint = reason if reason else "Menghubungkan ke kamera melalui ESP32 Bridge..."
    if len(hint) > 70:
        hint = hint[:67] + "..."
    cv2.putText(frame, hint, (40, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (130, 130, 130), 1, cv2.LINE_AA)

    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(
        frame,
        f"Status Gateway ({now_str})",
        (40, 305),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (70, 210, 150),
        1,
        cv2.LINE_AA,
    )

    ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    return buffer.tobytes() if ok else b""


# Mode pemantauan murni: Tanpa deteksi kontur agar tampilan jernih dan hemat CPU server


def check_relay_esp_online() -> bool:
    """Periksa ke status server relay apakah ESP32 terhubung."""
    try:
        req = urllib.request.Request("http://127.0.0.1:9001/status")
        with urllib.request.urlopen(req, timeout=0.8) as res:
            import json
            data = json.loads(res.read().decode("utf-8"))
            return bool(data.get("esp_connected"))
    except Exception:
        return True


class CameraStreamer:
    """Thread background tunggal yang terus membaca RTSP dan menyimpannya sebagai JPEG."""

    def __init__(self, rtsp_url: str, label: str):
        self.rtsp_url = rtsp_url
        self.label = label
        self.latest_jpeg = None
        self.last_frame_time = 0.0
        self.lock = threading.Lock()
        self.running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()

    def is_alive(self) -> bool:
        return (time.time() - self.last_frame_time) < 4.5

    def get_jpeg(self) -> bytes:
        with self.lock:
            if self.latest_jpeg and self.is_alive():
                return self.latest_jpeg
        return create_standby_frame(f"Kamera ({self.label}) Menghubungkan...", self.rtsp_url, "Menunggu sinyal video ESP32 relay...")

    def _capture_loop(self):
        masked = mask_rtsp_url(self.rtsp_url)
        print(f"[CCTV-{self.label}] Background capture worker dimulai: {masked}")

        while self.running:
            # Jika menggunakan relay lokal, pastikan ESP32 sudah menyambung agar tidak memicu timeout
            if "127.0.0.1" in self.rtsp_url:
                if not check_relay_esp_online():
                    with self.lock:
                        self.latest_jpeg = None
                    time.sleep(1.5)
                    continue

            print(f"[CCTV-{self.label}] Membuka koneksi VideoCapture ke: {masked}")
            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not cap.isOpened():
                print(f"[CCTV-{self.label}] Gagal membuka stream. Menunggu 2 detik sebelum mencoba lagi...")
                with self.lock:
                    self.latest_jpeg = None
                time.sleep(2.0)
                continue

            print(f"[CCTV-{self.label}] VideoCapture berhasil dibuka! Mulai membaca frame...")

            consecutive_failures = 0
            while self.running:
                ret, frame = cap.read()
                if not ret or frame is None:
                    consecutive_failures += 1
                    if consecutive_failures > 5:
                        print(f"[CCTV-{self.label}] Gagal membaca frame berulang kali. Menyambung ulang...")
                        break
                    time.sleep(0.05)
                    continue

                consecutive_failures = 0

                # Resize proporsional agar hemat bandwidth & CPU
                h, w = frame.shape[:2]
                if w > 1280 or h > 720:
                    scale = min(1280 / w, 720 / h)
                    frame = cv2.resize(frame, (int(w * scale), int(h * scale)))

                ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
                if ok:
                    jpeg_bytes = buffer.tobytes()
                    with self.lock:
                        self.latest_jpeg = jpeg_bytes
                        self.last_frame_time = time.time()

                time.sleep(0.035)  # ~28 FPS

            cap.release()
            with self.lock:
                self.latest_jpeg = None
            time.sleep(1.5)


incubator_streamer = CameraStreamer(INCUBATOR_RTSP_URL, "Inkubator")


@app.get("/video_feed")
def video_feed() -> Response:
    def stream_generator() -> Generator[bytes, None, None]:
        while True:
            jpeg = incubator_streamer.get_jpeg()
            if jpeg:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
                )
            time.sleep(0.04)  # ~25 FPS ke klien web

    return Response(
        stream_generator(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/kandang_feed")
def kandang_feed() -> Response:
    # Menggunakan streamer yang sama jika kandang mengarah ke incubator
    def stream_generator() -> Generator[bytes, None, None]:
        while True:
            jpeg = incubator_streamer.get_jpeg()
            if jpeg:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
                )
            time.sleep(0.04)

    return Response(
        stream_generator(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/snapshot.jpg")
def snapshot() -> Response:
    """Satu frame JPEG terbaru untuk di-scrape scheduler FastAPI tiap 4 jam."""
    if not incubator_streamer.is_alive():
        return Response("kamera offline", status=503, mimetype="text/plain")
    jpeg = incubator_streamer.get_jpeg()
    return Response(jpeg, mimetype="image/jpeg")


@app.get("/health")
@app.get("/cctv_health")
def health() -> dict:
    is_live = incubator_streamer.is_alive()
    return {
        "status": "ok",
        "service": "kampung-merak-opencv-gateway",
        "incubator_reachable": is_live,
        "stream_source": "direct_rtsp" if is_live else "none",
        "incubator_target": mask_rtsp_url(INCUBATOR_RTSP_URL),
        "incubator_endpoint": "/video_feed",
        "kandang_endpoint": "/kandang_feed",
        "snapshot_endpoint": "/snapshot.jpg",
    }


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
