import RoleNotice, { AccessDenied } from "../components/RoleNotice.jsx";
import SectionCard from "../components/SectionCard.jsx";
import Icon from "../components/Icon.jsx";
import IncubationTrendChart from "../components/IncubationTrendChart.jsx";
import AlertPanel from "../components/AlertPanel.jsx";
import MqttCommandPanel from "../components/MqttCommandPanel.jsx";
import VarietyToggle from "../components/VarietyToggle.jsx";
import { ROLES, VARIETAS } from "../data/constants.js";
import { DEFAULT_THRESHOLDS } from "../hooks/useIncubatorThresholds.js";

const units = [
  {
    id: "INC-ALPHA-01",
    batch: "BATCH PV-2026-001",
    temp: "37.5°C",
    humidity: "60%",
    turn: "Setiap 4 jam",
    nextTurn: "01:42:12",
    status: "Normal",
    level: "normal",
    progress: "72%",
    accent: "from-teal-500 to-emerald-500",
    active: true,
  },
  {
    id: "INC-BETA-04",
    batch: "BATCH PV-2026-008",
    temp: "37.6°C",
    humidity: "59%",
    turn: "Setiap 4 jam",
    nextTurn: "00:15:45",
    status: "Warning",
    level: "warning",
    progress: "88%",
    accent: "from-amber-400 to-orange-500",
    active: false,
  },
  {
    id: "INC-GAMMA-03",
    batch: "BATCH PV-2026-011",
    temp: "37.3°C",
    humidity: "61%",
    turn: "Setiap 4 jam",
    nextTurn: "03:05:30",
    status: "Critical",
    level: "critical",
    progress: "54%",
    accent: "from-slate-400 to-slate-600",
    active: false,
  },
];

const statusStyles = {
  normal: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

const statusIcons = {
  normal: "check_circle",
  warning: "warning",
  critical: "priority_high",
};

export default function IncubationPage({
  role,
  telemetry,
  connection,
  publish,
  alerts,
  setAlerts,
  temperatureTrend,
  humidityTrend,
  activeVariety,
  setActiveVariety,
  thresholds = DEFAULT_THRESHOLDS,
}) {
  if (!ROLES[role].allowed.includes("pengeraman")) {
    return <AccessDenied role={role} feature="Monitoring Pengeraman" />;
  }

  const profile = VARIETAS[activeVariety] || VARIETAS.hijau;
  // Badge presisi ikut ambang DB (tanpa margin di halaman ini).
  const isTempIdeal = telemetry.temperature >= thresholds.suhu_min && telemetry.temperature <= thresholds.suhu_max;
  const isHumIdeal = telemetry.humidity >= thresholds.kelembapan_min && telemetry.humidity <= thresholds.kelembapan_max;
  const theme = activeVariety === "biru"
    ? {
        hero: "from-slate-950 via-blue-950 to-slate-900",
        badge: "bg-sky-500/90 text-white",
        activeUnit: "border-sky-300 bg-gradient-to-br from-sky-50 via-white to-sky-100/80 ring-1 ring-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_18px_48px_rgba(14,165,233,0.16)]",
      }
    : {
        hero: "from-teal-950 via-forest-midnight to-teal-900",
        badge: "bg-emerald-500/90 text-white",
        activeUnit: "border-teal-300 bg-gradient-to-br from-teal-50 via-white to-teal-100/80 ring-1 ring-teal-200 shadow-[0_0_0_1px_rgba(45,212,191,0.18),0_18px_48px_rgba(20,184,166,0.16)]",
      };

  return (
    <div className="page-content space-y-6">
      <div
        className={`rounded-[32px] border border-white/20 bg-gradient-to-br ${theme.hero} p-6 text-white shadow-[0_20px_60px_rgba(2,44,34,0.24)] sm:p-8 transition-all duration-500 ease-out`}
        style={{ boxShadow: activeVariety === "biru" ? "0 24px 70px rgba(14, 116, 144, 0.28)" : "0 20px 60px rgba(2,44,34,0.24)" }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-teal-200">Operasional Inkubator</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Monitoring Pengeraman</h1>
            <p className="mt-3 text-sm leading-6 text-teal-50/80 sm:text-base">
              Profil aktif: <span className="font-semibold text-white">{profile.label}</span> · Batch {profile.batch} · {profile.suhuIdeal} · {profile.kelembabanIdeal}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2.5">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-teal-50">Online</span>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1.5 text-sm font-semibold text-emerald-200">Monitoring</span>
              <span className="rounded-full bg-amber-400/20 px-3 py-1.5 text-sm font-semibold text-amber-200">Alert Watch</span>
            </div>
            <VarietyToggle
              activeVariety={activeVariety}
              setActiveVariety={setActiveVariety}
              className="border-white/15 bg-white/10"
            />
          </div>
        </div>
      </div>

      <RoleNotice role={role} />

      <div className="grid gap-4 md:grid-cols-4">
        <SectionCard className="border border-teal-100/70 bg-gradient-to-br from-white to-teal-50/70 p-5 shadow-[0_16px_36px_rgba(0,107,88,0.08)]" title="Total Unit Aktif">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-3xl font-extrabold text-ink-primary">42</p>
              <p className="mt-1 text-sm text-ink-secondary">Telur dalam pengeraman</p>
            </div>
            <span className="rounded-2xl bg-teal-container/20 p-3 text-teal-iridescence">
              <Icon name="egg" className="text-[22px]" />
            </span>
          </div>
        </SectionCard>
        <SectionCard className="border border-sky-100/70 bg-gradient-to-br from-white to-sky-50/70 p-5 shadow-[0_16px_36px_rgba(37,99,235,0.08)]" title="Stabilitas Lingkungan">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-3xl font-extrabold text-ink-primary">{isTempIdeal && isHumIdeal ? "98%" : "84%"}</p>
              <p className="mt-1 text-sm text-ink-secondary">Dalam parameter ideal</p>
            </div>
            <span className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Icon name="thermostat" className="text-[22px]" />
            </span>
          </div>
        </SectionCard>
        <SectionCard className="border border-amber-100/70 bg-gradient-to-br from-white to-amber-50/70 p-5 shadow-[0_16px_36px_rgba(217,119,6,0.08)]" title="Estimasi Menetas 7 Hari">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-3xl font-extrabold text-ink-primary">12</p>
              <p className="mt-1 text-sm text-ink-secondary">Batch siap pemantauan</p>
            </div>
            <span className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Icon name="event" className="text-[22px]" />
            </span>
          </div>
        </SectionCard>
        <SectionCard className="border border-emerald-100/70 bg-gradient-to-br from-white to-emerald-50/70 p-5 shadow-[0_16px_36px_rgba(16,185,129,0.08)]" title="Konektivitas">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-3xl font-extrabold text-ink-primary">{connection.status === "connected" ? "Online" : "Offline"}</p>
              <p className="mt-1 text-sm text-ink-secondary">{connection.lastTelemetryAt ? "Sensor aktif" : "Menunggu data"}</p>
            </div>
            <span className={`rounded-2xl p-3 ${connection.status === "connected" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              <Icon name="wifi" className="text-[22px]" />
            </span>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <IncubationTrendChart
            trend={temperatureTrend}
            humidityTrend={humidityTrend}
            isConnected={connection.status === "connected" && telemetry.temperature != null}
          />

          <SectionCard title="Unit IoT Aktif" noPadding>
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {units.map((unit) => (
                <article key={unit.id} className={`rounded-[24px] border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(15,23,42,0.12)] ${unit.active ? theme.activeUnit : "border-alpine-high/80 bg-gradient-to-br from-white via-alpine-low to-white"}`}>
                  <div className={`h-2 rounded-full bg-gradient-to-r ${unit.accent}`} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink-primary">{unit.id}</h3>
                      <p className="mt-1 text-xs font-mono uppercase tracking-[0.14em] text-ink-secondary">{unit.batch}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${statusStyles[unit.level]}`}>
                      <Icon name={statusIcons[unit.level]} className="text-[12px]" />
                      <span>{unit.status}</span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/80 p-3 shadow-sm dark:bg-surface">
                      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-secondary">Suhu</p>
                      <p className="mt-1 font-display text-lg font-bold text-ink-primary">{unit.temp}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3 shadow-sm dark:bg-surface">
                      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-secondary">Kelembaban</p>
                      <p className="mt-1 font-display text-lg font-bold text-ink-primary">{unit.humidity}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-alpine-high bg-surface px-3 py-3 text-sm">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-secondary">Turner</p>
                      <p className="font-body font-semibold text-ink-primary">{unit.turn}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-secondary">Next</p>
                      <p className="font-body font-semibold text-teal-iridescence">{unit.nextTurn}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-ink-secondary">Progress</span>
                    <span className="font-display font-bold text-ink-primary">{unit.progress}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-alpine-container">
                    <div className={`h-full rounded-full bg-gradient-to-r ${unit.accent}`} style={{ width: unit.progress }} />
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Kondisi Terkini" className="border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-alpine-high bg-alpine-low/70 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-secondary">Suhu</p>
                <p className="mt-2 font-display text-2xl font-extrabold text-ink-primary">{telemetry.temperature?.toFixed(1) ?? "--"}°C</p>
                <p className={`mt-2 text-sm ${isTempIdeal ? "text-emerald-600" : "text-amber-600"}`}>{isTempIdeal ? "Ideal" : "Perlu perhatian"}</p>
              </div>
              <div className="rounded-2xl border border-alpine-high bg-alpine-low/70 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-secondary">Kelembaban</p>
                <p className="mt-2 font-display text-2xl font-extrabold text-ink-primary">{telemetry.humidity?.toFixed(0) ?? "--"}%</p>
                <p className={`mt-2 text-sm ${isHumIdeal ? "text-emerald-600" : "text-amber-600"}`}>{isHumIdeal ? "Ideal" : "Perlu perhatian"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <span className="rounded-full bg-teal-container/20 px-3 py-1 text-sm font-semibold text-teal-iridescence">Lampu: {telemetry.statusLamp}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Motor: {telemetry.statusMotor}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Mist: {telemetry.statusMist}</span>
              {telemetry.statusSensor && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">SHT30: {telemetry.statusSensor}</span>
              )}
            </div>
          </SectionCard>

          <MqttCommandPanel telemetry={telemetry} publish={publish} role={role} />
          <AlertPanel alerts={alerts} setAlerts={setAlerts} role={role} publish={publish} />
        </div>
      </div>
    </div>
  );
}
