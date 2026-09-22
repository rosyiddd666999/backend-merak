import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader.jsx";
import RoleNotice, { AccessDenied } from "../components/RoleNotice.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ConnectionPanel from "../components/ConnectionPanel.jsx";
import { fetchApi } from "../utils/api.js";
import { ROLES } from "../data/constants.js";
import Icon from "../components/Icon.jsx";
import MqttCommandPanel from "../components/MqttCommandPanel.jsx";

export default function SettingsPage({ role, activeVariety, setActiveVariety, mqttUrl, clientId, connection, cctvUrl, setCctvUrl, telemetry, publish, thresholds, refreshThresholds }) {
  if (!ROLES[role].allowed.includes("pengaturan")) {
    return <AccessDenied role={role} feature="Pengaturan Sistem" />;
  }

  const canConfigureCctv = Boolean(ROLES[role]?.canConfigureCctv ?? (role === "admin" || role === "operator"));
  const cctvLocked = !canConfigureCctv;
  const [cctvSavedToast, setCctvSavedToast] = useState(false);

  const handleSaveCctv = () => {
    setCctvSavedToast(true);
    setTimeout(() => setCctvSavedToast(false), 2500);
    const el = document.activeElement;
    if (el) el.blur();
  };
  
  const [apiStatus, setApiStatus] = useState(null);
  const [isCheckingApi, setIsCheckingApi] = useState(false);

  // === Form ambang inkubator (tersimpan di database, diikuti badge & notifikasi) ===
  const [thresholdForm, setThresholdForm] = useState({
    suhu_min: "",
    suhu_max: "",
    kelembapan_min: "",
    kelembapan_max: "",
    interval_rotasi_menit: "",
  });
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);
  const [thresholdMsg, setThresholdMsg] = useState(null);

  useEffect(() => {
    if (thresholds) {
      setThresholdForm({
        suhu_min: thresholds.suhu_min ?? "",
        suhu_max: thresholds.suhu_max ?? "",
        kelembapan_min: thresholds.kelembapan_min ?? "",
        kelembapan_max: thresholds.kelembapan_max ?? "",
        interval_rotasi_menit: thresholds.interval_rotasi_menit ?? 240,
      });
    }
  }, [thresholds]);

  const handleSaveThresholds = async () => {
    const payload = {
      suhu_min: Number(thresholdForm.suhu_min),
      suhu_max: Number(thresholdForm.suhu_max),
      kelembapan_min: Number(thresholdForm.kelembapan_min),
      kelembapan_max: Number(thresholdForm.kelembapan_max),
      interval_rotasi_menit: Number(thresholdForm.interval_rotasi_menit),
    };
    if (
      [payload.suhu_min, payload.suhu_max, payload.kelembapan_min, payload.kelembapan_max, payload.interval_rotasi_menit]
        .some((v) => !Number.isFinite(v))
    ) {
      setThresholdMsg({ ok: false, text: "Semua field harus berupa angka." });
      return;
    }
    if (payload.suhu_min >= payload.suhu_max || payload.kelembapan_min >= payload.kelembapan_max) {
      setThresholdMsg({ ok: false, text: "Batas bawah harus lebih kecil dari batas atas." });
      return;
    }
    setIsSavingThresholds(true);
    setThresholdMsg(null);
    try {
      await fetchApi("/api/incubator/settings", { method: "PUT", body: JSON.stringify(payload) });
      if (refreshThresholds) await refreshThresholds();
      setThresholdMsg({ ok: true, text: "Ambang tersimpan. Badge & notifikasi kini mengikutinya." });
    } catch (err) {
      setThresholdMsg({ ok: false, text: `Gagal menyimpan: ${err.message}` });
    } finally {
      setIsSavingThresholds(false);
    }
  };

  const thresholdFields = [
    { key: "suhu_min", label: "Suhu Min (°C)", step: "0.1" },
    { key: "suhu_max", label: "Suhu Maks (°C)", step: "0.1" },
    { key: "kelembapan_min", label: "Kelembaban Min (%)", step: "1" },
    { key: "kelembapan_max", label: "Kelembaban Maks (%)", step: "1" },
    { key: "interval_rotasi_menit", label: "Interval Rotasi (menit)", step: "1" },
  ];

  const checkApiHealth = async () => {
    setIsCheckingApi(true);
    try {
      const startTime = performance.now();
      await fetchApi("/api/incubator/settings");
      const latency = Math.round(performance.now() - startTime);
      setApiStatus({
        status: "online",
        host: "api-merak.abdulrosyid.my.id",
        latency
      });
    } catch (err) {
      setApiStatus({
        status: "offline",
        host: "api-merak.abdulrosyid.my.id",
        error: err.message
      });
    } finally {
      setIsCheckingApi(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  return (
    <div className="page-content space-y-6">
      <PageHeader
        eyebrow="Konfigurasi"
        title="Pengaturan Sistem"
        description="Pilih profil inkubasi aktif dan atur parameter dasar aplikasi."
      />

      <RoleNotice role={role} />

      <SectionCard title="Informasi Aplikasi">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-alpine-high p-4 bg-alpine-low">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-outline">Versi Aplikasi</p>
            <p className="mt-1 font-mono text-sm font-semibold text-ink-primary">v1.2.0-stable</p>
          </div>
          <div className="rounded-xl border border-alpine-high p-4 bg-alpine-low">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-outline">Framework</p>
            <p className="mt-1 font-mono text-sm font-semibold text-ink-primary">React 19 + Vite</p>
          </div>
          <div className="rounded-xl border border-alpine-high p-4 bg-alpine-low">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-outline">Koneksi IoT</p>
            <p className="mt-1 font-mono text-sm font-semibold text-ink-primary">MQTT (EMQX Cloud)</p>
          </div>
          <div className="rounded-xl border border-alpine-high p-4 bg-alpine-low flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-outline">Backend REST API</p>
                <button
                  onClick={checkApiHealth}
                  disabled={isCheckingApi}
                  className="p-1 rounded text-ink-outline hover:text-teal-iridescence hover:bg-alpine-high/50 transition-colors"
                  title="Ping Server REST API"
                >
                  <Icon name="sync" className={`text-[14px] ${isCheckingApi ? "animate-spin text-teal-iridescence" : ""}`} />
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${apiStatus?.status === "online" ? "bg-status-success animate-pulse" : apiStatus ? "bg-status-dangerText" : "bg-ink-outline"}`} />
                <span className="font-mono text-sm font-semibold text-ink-primary">
                  {apiStatus?.status === "online" ? "Online & Siap" : apiStatus ? "Offline" : "Memeriksa..."}
                </span>
                {apiStatus?.latency != null && (
                  <span className="font-mono text-[10px] font-bold text-teal-iridescence px-1.5 py-0.5 rounded bg-teal-iridescence/10 border border-teal-iridescence/20 ml-auto">
                    {apiStatus.latency} ms
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-ink-outline truncate" title={apiStatus?.host || "api-merak.abdulrosyid.my.id"}>
              {apiStatus?.host || "api-merak.abdulrosyid.my.id"}
            </p>
          </div>
        </div>
      </SectionCard>

      <ConnectionPanel mqttUrl={mqttUrl} clientId={clientId} connection={connection} />
      {telemetry && publish && (
        <MqttCommandPanel telemetry={telemetry} publish={publish} role={role} />
      )}

      <SectionCard title="Konfigurasi Kamera CCTV & Gateway RTSP">
        <div className="space-y-4">
          <p className="font-body text-sm text-ink-secondary leading-relaxed">
            Atur alamat RTSP kamera Bardi Anda. Gateway Python (yang berjalan di localhost:5000 atau PC Kandang) akan secara dinamis menyambung ke alamat ini ketika halaman CCTV dibuka.
          </p>
          <div>
            <label className="block text-xs font-bold text-ink-primary uppercase tracking-widest mb-1.5">URL RTSP Kamera Inkubator</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={cctvUrl || ""}
                onChange={(e) => setCctvUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveCctv();
                  }
                }}
                disabled={cctvLocked}
                placeholder="rtsp://admin:Admin123@192.168.110.227:554/V_ENC_000"
                className="w-full rounded-xl border border-alpine-high bg-alpine-low px-4 py-2.5 text-sm font-mono text-ink-primary shadow-inner outline-none transition-all placeholder:text-ink-outline focus:border-teal-iridescence focus:ring-1 focus:ring-teal-iridescence disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                disabled={cctvLocked}
                onClick={handleSaveCctv}
                className="px-6 py-2.5 rounded-xl bg-teal-iridescence text-white font-bold text-sm hover:bg-teal-iridescence/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
              >
                <Icon name="check" className="text-[18px]" />
                Simpan
              </button>
            </div>
            {cctvSavedToast && (
              <p className="font-body text-xs text-status-success flex items-center gap-1 mt-2">
                <Icon name="check_circle" className="text-[14px]" />
                Alamat RTSP CCTV berhasil disimpan dan langsung aktif untuk gateway!
              </p>
            )}
          </div>
          {cctvLocked ? (
            <p className="font-body text-xs text-status-dangerText">
              * Hanya Admin dan Operator yang dapat mengubah alamat kamera.
            </p>
          ) : (
            <p className="font-body text-xs text-teal-iridescence flex items-center gap-1.5">
              <Icon name="verified_user" className="text-[14px]" />
              Akses Diberikan: Admin dan Operator berwenang memperbarui alamat RTSP ini.
            </p>
          )}

        </div>
      </SectionCard>

      <SectionCard title="Ambang Suhu & Kelembaban Inkubator">
        <div className="space-y-4">
          <p className="font-body text-sm text-ink-secondary leading-relaxed">
            Ambang tersimpan di database dan langsung diikuti badge dashboard (Normal / Warning kuning / Perhatian).
            Notifikasi Alert baru dibuat bila nilai melewati ambang + margin (suhu ±0.2°C, kelembaban ±2%).
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {thresholdFields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-ink-primary uppercase tracking-widest mb-1.5">{f.label}</label>
                <input
                  type="number"
                  step={f.step}
                  value={thresholdForm[f.key]}
                  onChange={(e) => setThresholdForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border border-alpine-high bg-alpine-low px-4 py-2.5 text-sm font-mono text-ink-primary shadow-inner outline-none transition-all focus:border-teal-iridescence focus:ring-1 focus:ring-teal-iridescence"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              type="button"
              disabled={isSavingThresholds}
              onClick={handleSaveThresholds}
              className="px-6 py-2.5 rounded-xl bg-teal-iridescence text-white font-bold text-sm hover:bg-teal-iridescence/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
            >
              <Icon name="check" className="text-[18px]" />
              {isSavingThresholds ? "Menyimpan..." : "Simpan Ambang"}
            </button>
            {thresholdMsg && (
              <p className={`font-body text-xs flex items-center gap-1 ${thresholdMsg.ok ? "text-status-success" : "text-status-dangerText"}`}>
                <Icon name={thresholdMsg.ok ? "check_circle" : "error"} className="text-[14px]" />
                {thresholdMsg.text}
              </p>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
