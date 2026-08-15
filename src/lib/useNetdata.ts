"use client";

import { usePolling } from "./usePolling";
import type { NetdataSeries } from "./types";

export function useNetdata(chart: string, points: number, after: number, intervalMs: number) {
  const url = `/api/netdata?chart=${encodeURIComponent(chart)}&points=${points}&after=${after}`;
  return usePolling<NetdataSeries>(url, intervalMs);
}

// Netdata rows come back newest-first; each row is [time, ...dimensions] per
// the chart's `labels`. This maps a named dimension to ascending {t, v} pairs.
export function seriesToPoints(series: NetdataSeries | null, dimension: string): { t: number; v: number }[] {
  if (!series) return [];
  const idx = series.labels.indexOf(dimension);
  if (idx === -1) return [];
  return series.data
    .map((row) => ({ t: row[0], v: row[idx] }))
    .sort((a, b) => a.t - b.t);
}

export function latestValue(series: NetdataSeries | null, dimension: string): number | null {
  if (!series || series.data.length === 0) return null;
  const idx = series.labels.indexOf(dimension);
  if (idx === -1) return null;
  return series.data[0][idx];
}
