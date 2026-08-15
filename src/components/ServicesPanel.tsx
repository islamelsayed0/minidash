"use client";

import { usePolling } from "@/lib/usePolling";
import type { ServiceState } from "@/lib/types";

// Keyed by the last dot-segment of the launchd label, so this map holds no host-specific
// prefix. The prefix itself comes from SERVICE_PREFIX in the services route.
const DISPLAY_NAME: Record<string, string> = {
  ttyd: "ttyd",
  homepage: "Homepage",
  "uptime-kuma": "Uptime Kuma",
  collector: "Collector",
  "collector-api": "Collector API",
  "collector-retention": "Collector retention",
  "restic-backup": "Restic backup",
  deadman: "Dead man switch",
  "update-check": "Update check",
  netdata: "Netdata",
  gateway: "Open Claw",
};

function displayName(label: string): string {
  return DISPLAY_NAME[label.slice(label.lastIndexOf(".") + 1)] ?? label;
}

function stamp(d: Date | null): string {
  if (!d) return "—";
  return `updated ${d.toLocaleTimeString("en-US", { hour12: false })}`;
}

export function ServicesPanel() {
  const services = usePolling<{ services: ServiceState[] }>("/api/services", 30_000);

  return (
    <div className="card">
      <div className="panel-head">
        <div className="label">Services</div>
        <span className="stamp">{stamp(services.updatedAt)}</span>
      </div>
      {services.error && <div className="error-note">{services.error}</div>}
      <div className="svc-list">
        {(services.data?.services ?? []).map((s) => (
          <div className="svc-row" key={s.label}>
            <span className={`svc-dot ${s.status}`} />
            <span className="name">{displayName(s.label)}</span>
            <span className="pid">{s.pid ? `pid ${s.pid}` : s.status}</span>
          </div>
        ))}
        {!services.data && !services.error && <div className="empty-row">Loading…</div>}
      </div>
    </div>
  );
}
