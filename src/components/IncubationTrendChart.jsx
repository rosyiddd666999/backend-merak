import { DEFAULT_TREND, DEFAULT_HUMIDITY_TREND } from "../data/constants.js";

function renderCompactChart({ title, data, fallbackSeries, idealRange, unit, color, gradientId, isLive, currentValue }) {
  const width = 640;
  const height = 180;
  const padding = { top: 16, right: 10, bottom: 28, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const safeData = (data || []).filter((value) => typeof value === "number" && !Number.isNaN(value));
  const fallback = fallbackSeries || DEFAULT_TREND;
  let series = safeData.length > 1 ? safeData.slice(-24) : fallback;

  if (currentValue != null) {
    series = [...series];
    series[series.length - 1] = currentValue;
  }

  const min = Math.min(...series, idealRange[0] - 0.5) - 0.1;
  const max = Math.max(...series, idealRange[1] + 0.5) + 0.1;
  const toX = (index) => padding.left + (index / (series.length - 1)) * chartW;
  const toY = (value) => padding.top + chartH - ((value - min) / (max - min)) * chartH;
  const pathD = series.map((value, index) => `${index === 0 ? "M" : "L"} ${toX(index).toFixed(1)} ${toY(value).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${toX(series.length - 1)} ${padding.top + chartH} L ${toX(0)} ${padding.top + chartH} Z`;
  const lastValue = series[series.length - 1];
  const isIdeal = lastValue >= idealRange[0] && lastValue <= idealRange[1];
  const timeLabels = ["00.00", "04.00", "08.00", "12.00", "16.00", "20.00", "24.00"];

  return (
    <div className="rounded-2xl border border-alpine-high bg-alpine-low/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-secondary">{title}</p>
            {isLive ? (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Live
              </span>
            ) : (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                Standby
              </span>
            )}
          </div>
          <p className="mt-1 font-display text-lg font-bold text-ink-primary">
            {lastValue?.toFixed(1)}{unit}
          </p>
        </div>
        <span className={`flex h-2.5 w-2.5 rounded-full ${isIdeal ? "bg-emerald-500" : "bg-amber-400"}`} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-alpine-high bg-white/70 dark:bg-surface">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: "150px" }} role="img" aria-label={`${title} ${lastValue?.toFixed(1)}${unit}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, index) => (
            <line
              key={index}
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + fraction * chartH}
              y2={padding.top + fraction * chartH}
              stroke="#e5e7eb"
              strokeDasharray="3 5"
              strokeWidth="1"
            />
          ))}
          <rect x={padding.left} y={toY(idealRange[1])} width={chartW} height={toY(idealRange[0]) - toY(idealRange[1])} fill="rgba(108, 250, 215, 0.08)" />
          <line x1={padding.left} x2={width - padding.right} y1={toY(idealRange[0])} y2={toY(idealRange[0])} stroke="#4addbb" strokeDasharray="4 4" strokeWidth="1" opacity="0.7" />
          <line x1={padding.left} x2={width - padding.right} y1={toY(idealRange[1])} y2={toY(idealRange[1])} stroke="#4addbb" strokeDasharray="4 4" strokeWidth="1" opacity="0.7" />
          <path d={areaD} fill={`url(#${gradientId})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {series.map((value, index) => {
            if (index % 4 !== 0 && index !== series.length - 1) return null;
            return <circle key={index} cx={toX(index)} cy={toY(value)} r={index === series.length - 1 ? 4.5 : 3} fill={color} stroke="#ffffff" strokeWidth="1.2" />;
          })}
        </svg>
        <div className="flex justify-between px-3 pb-1 font-mono text-[10px] font-semibold text-ink-outline">
          {timeLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
      </div>
    </div>
  );
}

export default function IncubationTrendChart({ trend, humidityTrend, isConnected, currentTemp, currentHum, suhuRange = [37.5, 38.5], humRange = [55, 65] }) {
  const isLive = Boolean(isConnected);

  return (
    <section className="km-card p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-teal-iridescence">Tren Kondisi</p>
          <h2 className="mt-1 font-display text-xl font-extrabold text-ink-primary">Suhu & Kelembaban 24 Jam</h2>
          <p className="mt-1 font-body text-xs text-ink-secondary">Visual pemantauan parameter inkubator untuk mendeteksi drift fluktuasi.</p>
        </div>
        {isLive ? (
          <span className="km-badge km-badge-success font-mono text-[10px] flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            REAL-TIME MQTT
          </span>
        ) : (
          <span className="km-badge km-badge-neutral font-mono text-[10px] flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            STANDBY / BASELINE
          </span>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {renderCompactChart({
          title: "Suhu",
          data: trend,
          fallbackSeries: DEFAULT_TREND,
          idealRange: suhuRange,
          unit: "°C",
          color: "#006b58",
          gradientId: "tempTrend",
          isLive,
          currentValue: currentTemp,
        })}
        {renderCompactChart({
          title: "Kelembaban",
          data: humidityTrend,
          fallbackSeries: DEFAULT_HUMIDITY_TREND,
          idealRange: humRange,
          unit: "%",
          color: "#2563eb",
          gradientId: "humidityTrend",
          isLive,
          currentValue: currentHum,
        })}
      </div>
    </section>
  );
}
