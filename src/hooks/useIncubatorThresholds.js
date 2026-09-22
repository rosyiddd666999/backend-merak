import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../utils/api.js";

// WAJIB SINKRON dengan ALERT_SUHU_MARGIN / ALERT_HUMIDITY_MARGIN
// di fastapi-backend/app/routers/incubator.py.
// Badge UI presisi ikut DB; record notifikasi Alert baru dibuat
// bila nilai melewati ambang + margin ini.
export const ALERT_SUHU_MARGIN = 0.2;
export const ALERT_HUMIDITY_MARGIN = 2.0;

// Default bila API tidak terjangkau (mode luring).
export const DEFAULT_THRESHOLDS = {
  suhu_min: 37.5,
  suhu_max: 38.5,
  kelembapan_min: 55,
  kelembapan_max: 65,
  interval_rotasi_menit: 240,
};

/**
 * Ambil ambang inkubator dari database (GET /api/incubator/settings).
 * Mengembalikan range + helper status 3-state:
 * - "ideal"     : nilai di dalam [min, max] DB  -> badge Normal
 * - "warning"   : di luar range tapi dalam margin -> badge kuning, TANPA notifikasi
 * - "perhatian" : melewati margin -> badge Perhatian + backend membuat record Alert
 */
export function classifyTemp(value, t = DEFAULT_THRESHOLDS) {
  if (value == null || Number.isNaN(Number(value))) return "waiting";
  const v = Number(value);
  if (v >= t.suhu_min && v <= t.suhu_max) return "ideal";
  if (v >= t.suhu_min - ALERT_SUHU_MARGIN && v <= t.suhu_max + ALERT_SUHU_MARGIN) return "warning";
  return "perhatian";
}

export function classifyHumidity(value, t = DEFAULT_THRESHOLDS) {
  if (value == null || Number.isNaN(Number(value))) return "waiting";
  const v = Number(value);
  if (v >= t.kelembapan_min && v <= t.kelembapan_max) return "ideal";
  if (v >= t.kelembapan_min - ALERT_HUMIDITY_MARGIN && v <= t.kelembapan_max + ALERT_HUMIDITY_MARGIN) return "warning";
  return "perhatian";
}

export function formatRange(min, max, unit) {
  return `${min} - ${max} ${unit}`;
}

export default function useIncubatorThresholds() {
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchApi("/api/incubator/settings");
      setThresholds({
        suhu_min: Number(s.suhu_min),
        suhu_max: Number(s.suhu_max),
        kelembapan_min: Number(s.kelembapan_min),
        kelembapan_max: Number(s.kelembapan_max),
        interval_rotasi_menit: Number(s.interval_rotasi_menit ?? 240),
      });
    } catch (err) {
      console.warn("Ambang inkubator API gagal, pakai default:", err.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { thresholds, loaded, refreshThresholds: refresh };
}
