import Icon from "./Icon.jsx";

/**
 * StatCard – sensor/metric card component
 * @param {string} icon - Material Symbol name
 * @param {string} title - metric label
 * @param {string|number} value - main value to display
 * @param {string} [unit] - unit suffix (°C, %, etc.)
 * @param {string} target - sub-label (range / target info)
 * @param {string} note - bottom note / MQTT topic / status
 * @param {string} [state] - "ideal" | "warning" | "perhatian" | "danger" | "waiting"
 * @param {string} [updatedAt] - timestamp string
 */
export default function StatCard({ icon, title, value, unit, target, note, state = "ideal", updatedAt }) {
  const stateConfig = {
    ideal: {
      badge: "km-badge km-badge-success",
      badgeLabel: "Normal",
      badgeIcon: "check_circle",
      iconBg: "bg-status-successBg",
      iconColor: "text-teal-iridescence",
    },
    waiting: {
      badge: "km-badge km-badge-warning",
      badgeLabel: "Pantau",
      badgeIcon: "warning",
      iconBg: "bg-status-warningBg",
      iconColor: "text-status-warningText",
    },
    warning: {
      badge: "km-badge km-badge-warning",
      badgeLabel: "Pantau",
      badgeIcon: "warning",
      iconBg: "bg-status-warningBg",
      iconColor: "text-status-warningText",
    },
    perhatian: {
      badge: "km-badge km-badge-danger",
      badgeLabel: "Perhatian",
      badgeIcon: "priority_high",
      iconBg: "bg-status-dangerBg",
      iconColor: "text-status-dangerText",
    },
    standby: {
      badge: "km-badge km-badge-neutral",
      badgeLabel: "Standby",
      badgeIcon: "hourglass_top",
      iconBg: "bg-alpine-mid",
      iconColor: "text-ink-secondary",
    },
    danger: {
      badge: "km-badge km-badge-danger",
      badgeLabel: "Kritis",
      badgeIcon: "error",
      iconBg: "bg-status-dangerBg",
      iconColor: "text-status-dangerText",
    },
    info: {
      badge: "km-badge km-badge-info",
      badgeLabel: "Info",
      badgeIcon: "info",
      iconBg: "bg-status-infoBg",
      iconColor: "text-status-infoText",
    },
  };

  const config = stateConfig[state] || stateConfig.ideal;

  return (
    <section className="km-card p-5 flex flex-col gap-4">
      {/* Header: icon + status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
          <Icon name={icon} className={`text-[22px] ${config.iconColor}`} />
        </div>
        <span className={config.badge}>
          <Icon name={config.badgeIcon} className="text-[13px]" />
          {config.badgeLabel}
        </span>
      </div>

      {/* Metric */}
      <div>
        <p className="font-body text-sm font-medium text-ink-secondary">{title}</p>
        <div className="mt-1.5 flex items-end gap-1.5">
          <span className="font-display text-4xl font-extrabold leading-none text-ink-primary tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="mb-0.5 font-body text-base font-semibold text-ink-secondary">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Footer: target & note */}
      <div className="mt-auto rounded-xl bg-alpine-low px-3 py-2.5 space-y-0.5">
        <p className="font-body text-xs text-ink-secondary leading-relaxed">{target}</p>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-teal-iridescence truncate">
          {note}
        </p>
        {updatedAt && (
          <p className="font-body text-[10px] text-ink-outline">Diperbarui: {updatedAt}</p>
        )}
      </div>
    </section>
  );
}
