import type { BackupStatus, SummaryResp } from "@/lib/types";
import { Sparkline } from "./Sparkline";
import { timeAgo } from "@/lib/format";

interface Props {
  summary: SummaryResp | null;
  backup: BackupStatus | null;
  load1: number | null;
  load5: number | null;
  load15: number | null;
  loadTrend: number[];
}

export function HealthStrip({ summary, backup, load1, load5, load15, loadTrend }: Props) {
  const alerts = summary?.alerts_24h ?? 0;
  const alertsCls = alerts > 10 ? "wrn" : alerts > 0 ? "" : "ok";

  return (
    <div className="strip">
      <div className="card tile">
        <div className="label">Load 1m</div>
        <div className="val">{load1 !== null ? load1.toFixed(2) : "—"}</div>
        <div className="sub">
          {load5 !== null ? `5m ${load5.toFixed(2)}` : "—"} · {load15 !== null ? `15m ${load15.toFixed(2)}` : "—"}
        </div>
        {loadTrend.length > 1 && <Sparkline values={loadTrend} />}
      </div>

      <div className="card tile">
        <div className="label">Last backup</div>
        <div className={`val ${backup?.status === "SUCCESS" ? "ok" : "bad"}`}>
          {backup?.status ?? "—"}
        </div>
        <div className="sub">
          {backup ? `${timeAgo(backup.time)} · ${backup.snapshot}` : "no data"}
        </div>
      </div>

      <div className="card tile">
        <div className="label">Alerts 24h</div>
        <div className={`val ${alertsCls}`}>{summary ? alerts : "—"}</div>
        <div className="sub">
          {summary ? `${summary.failed_logins_24h} failed logins` : "—"}
        </div>
      </div>

      <div className="card tile">
        <div className="label">Sessions / devices</div>
        <div className="val">
          {summary?.sessions_now ?? "—"}
          <small>now</small>
        </div>
        <div className="sub">
          {summary ? `overlay ${summary.devices_online} online` : "—"}
        </div>
      </div>
    </div>
  );
}
