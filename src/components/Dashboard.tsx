"use client";

import { usePolling } from "@/lib/usePolling";
import { useNetdata, seriesToPoints, latestValue } from "@/lib/useNetdata";
import type { BackupStatus, SummaryResp } from "@/lib/types";
import { Header } from "./Header";
import { HealthStrip } from "./HealthStrip";
import { SystemPanel } from "./SystemPanel";
import { ServicesPanel } from "./ServicesPanel";
import { SecurityPanel } from "./SecurityPanel";
import { AgentsPanel } from "./AgentsPanel";
import { QuickActions } from "./QuickActions";

export function Dashboard() {
  const summary = usePolling<SummaryResp>("/api/collector/summary", 30_000);
  const backup = usePolling<BackupStatus>("/api/collector/backup-status", 30_000);
  const load = useNetdata("system.load", 60, -3600, 30_000);

  const loadPoints = seriesToPoints(load.data, "load1");
  const load1 = latestValue(load.data, "load1");
  const load5 = latestValue(load.data, "load5");
  const load15 = latestValue(load.data, "load15");
  const loadTrend = loadPoints.slice(-12).map((p) => p.v);

  const failedLogins = summary.data?.failed_logins_24h ?? 0;
  const alerts = summary.data?.alerts_24h ?? 0;
  const overallStatus = failedLogins > 0 || backup.data?.status === "FAILURE" ? "warn" : alerts > 15 ? "warn" : "good";
  const overallLabel =
    overallStatus === "good" ? "SYSTEM NOMINAL" : failedLogins > 0 ? "AUTH ATTENTION" : "REVIEW ALERTS";

  return (
    <div className="frame">
      <Header status={overallStatus} statusLabel={overallLabel} />

      <HealthStrip
        summary={summary.data}
        backup={backup.data}
        load1={load1}
        load5={load5}
        load15={load15}
        loadTrend={loadTrend}
      />

      <div className="main">
        <SystemPanel loadPoints={loadPoints} loadUpdatedAt={load.updatedAt} />
        <ServicesPanel />
      </div>

      <SecurityPanel />

      <div className="foot">
        <AgentsPanel />
        <QuickActions />
      </div>
    </div>
  );
}
