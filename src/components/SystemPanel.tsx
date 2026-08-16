"use client";

import { useNetdata, seriesToPoints, latestValue } from "@/lib/useNetdata";
import { TimeSeriesChart, type Point } from "./TimeSeriesChart";
import { Sparkline } from "./Sparkline";
import { DiskUsage } from "./DiskUsage";

// Volume labels are host-specific the same way the infrastructure addresses are, so
// they come from the environment rather than from source. Unset means the tile is not
// rendered at all, which is the right behaviour for a clone on a machine that has no
// such volume attached.
const BACKUP_VOLUME = process.env.NEXT_PUBLIC_BACKUP_VOLUME;
const ARCHIVE_VOLUME = process.env.NEXT_PUBLIC_ARCHIVE_VOLUME;

function volumeChart(label: string | undefined): string | null {
  return label ? `disk_space./Volumes/${label}` : null;
}

function stamp(d: Date | null): string {
  if (!d) return "—";
  return `updated ${d.toLocaleTimeString("en-US", { hour12: false })}`;
}

export function SystemPanel({ loadPoints, loadUpdatedAt }: { loadPoints: Point[]; loadUpdatedAt: Date | null }) {
  const swap = useNetdata("mem.swap", 20, -1200, 30_000);
  const net = useNetdata("net.en0", 20, -1200, 30_000);
  const diskRoot = useNetdata("disk_space./", 1, -10, 60_000);
  const diskBackup = useNetdata(volumeChart(BACKUP_VOLUME), 1, -10, 60_000);
  const diskArchive = useNetdata(volumeChart(ARCHIVE_VOLUME), 1, -10, 60_000);

  const swapUsedPoints = seriesToPoints(swap.data, "used");
  const swapUsedNow = latestValue(swap.data, "used");
  const netRecvPoints = seriesToPoints(net.data, "received");
  const netRecvNow = latestValue(net.data, "received");

  const volumes = [
    diskRoot.data && {
      name: "Root",
      usedGiB: latestValue(diskRoot.data, "used") ?? 0,
      availGiB: latestValue(diskRoot.data, "avail") ?? 0,
    },
    diskBackup.data &&
      BACKUP_VOLUME && {
        name: BACKUP_VOLUME,
        usedGiB: latestValue(diskBackup.data, "used") ?? 0,
        availGiB: latestValue(diskBackup.data, "avail") ?? 0,
      },
    diskArchive.data &&
      ARCHIVE_VOLUME && {
        name: ARCHIVE_VOLUME,
        usedGiB: latestValue(diskArchive.data, "used") ?? 0,
        availGiB: latestValue(diskArchive.data, "avail") ?? 0,
      },
  ].filter((v): v is { name: string; usedGiB: number; availGiB: number } => Boolean(v));

  return (
    <div className="stack">
      <div className="card">
        <div className="panel-head">
          <div className="label">Load average — last hour</div>
          <span className="legend-free">1-minute</span>
          <span className="stamp">{stamp(loadUpdatedAt)}</span>
        </div>
        {loadPoints.length > 1 ? (
          <TimeSeriesChart data={loadPoints} color="var(--series-1)" formatValue={(v) => v.toFixed(2)} />
        ) : (
          <div className="empty-row">Loading…</div>
        )}
      </div>

      <div className="card">
        <div className="panel-head">
          <div className="label">Swap &amp; network</div>
          <span className="stamp">{stamp(swap.updatedAt)}</span>
        </div>
        <div className="mini-row">
          <div className="mini-stat">
            <div className="label">Swap used</div>
            <div className="val">
              {swapUsedNow !== null ? `${swapUsedNow.toFixed(0)}` : "—"}
              <small>MiB</small>
            </div>
            {swapUsedPoints.length > 1 && (
              <Sparkline values={swapUsedPoints.slice(-16).map((p) => p.v)} color="var(--series-2)" />
            )}
          </div>
          <div className="mini-stat">
            <div className="label">Network in (en0)</div>
            <div className="val">
              {netRecvNow !== null ? netRecvNow.toFixed(0) : "—"}
              <small>KiB/s</small>
            </div>
            {netRecvPoints.length > 1 && (
              <Sparkline values={netRecvPoints.slice(-16).map((p) => p.v)} color="var(--series-3)" />
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="panel-head">
          <div className="label">Disk usage</div>
          <span className="stamp">{stamp(diskRoot.updatedAt)}</span>
        </div>
        {volumes.length > 0 ? <DiskUsage volumes={volumes} /> : <div className="empty-row">Loading…</div>}
      </div>
    </div>
  );
}
