"use client";

import { usePolling } from "@/lib/usePolling";
import type { AlertRow, AuthEvent, ListenPort, SessionRow, OverlayDevice } from "@/lib/types";
import { extractScreenSharingWho, formatTime, timeAgo } from "@/lib/format";

function stamp(d: Date | null): string {
  if (!d) return "—";
  return `updated ${d.toLocaleTimeString("en-US", { hour12: false })}`;
}

function isLiveSession(line: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith("system boot") || t.startsWith(".")) return false;
  if (t.includes("run-level")) return false;
  if (t.includes("exit=")) return false;
  return true;
}

export function SecurityPanel() {
  const auth = usePolling<AuthEvent[]>("/api/collector/auth-events", 60_000);
  const sessions = usePolling<SessionRow[]>("/api/collector/sessions", 60_000);
  const overlay = usePolling<OverlayDevice[]>("/api/collector/tailnet", 60_000);
  const ports = usePolling<{ listening: ListenPort[] }>("/api/collector/ports", 60_000);
  const alerts = usePolling<AlertRow[]>("/api/collector/alerts", 60_000);

  const liveSessions = (sessions.data ?? []).filter((s) => s.kind === "who" && isLiveSession(s.line));

  return (
    <div className="security-grid">
      <div className="stack">
        <div className="card">
          <div className="panel-head">
            <div className="label">Auth events</div>
            <span className="stamp">{stamp(auth.updatedAt)}</span>
          </div>
          <div className="scroll-y">
            <table>
              <thead>
                <tr>
                  <th>time</th>
                  <th>svc</th>
                  <th>user @ source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(auth.data ?? []).slice(0, 10).map((e, i) => {
                  const isScreen = e.service === "screensharingd";
                  const who = isScreen ? extractScreenSharingWho(e.message) : { user: e.user, ip: e.source_ip };
                  return (
                    <tr key={i}>
                      <td>{formatTime(e.ts)}</td>
                      <td>{e.service === "sshd" ? "ssh" : e.service === "screensharingd" ? "vnc" : e.service}</td>
                      <td className="who">
                        {who.user ?? "?"} @ {who.ip ?? "?"}
                      </td>
                      <td>
                        {e.result === "success" ? (
                          <span className="badge ok">✓ OK</span>
                        ) : (
                          <span className="badge bad">✕ FAIL</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {auth.data?.length === 0 && <div className="empty-row">No auth events recorded</div>}
          </div>
        </div>

        <div className="card">
          <div className="panel-head">
            <div className="label">Alerts feed</div>
            <span className="stamp">{stamp(alerts.updatedAt)}</span>
          </div>
          <div className="scroll-y">
            <table>
              <tbody>
                {(alerts.data ?? []).slice(0, 8).map((a, i) => (
                  <tr key={i}>
                    <td>{formatTime(a.ts)}</td>
                    <td className="who">{a.rule}</td>
                    <td>{a.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {alerts.data?.length === 0 && <div className="empty-row">No alerts in range</div>}
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="panel-head">
            <div className="label">Active sessions</div>
            <span className="stamp">{stamp(sessions.updatedAt)}</span>
          </div>
          <div className="scroll-y">
            <table>
              <tbody>
                {liveSessions.map((s, i) => (
                  <tr key={i}>
                    <td className="who">{s.line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {liveSessions.length === 0 && <div className="empty-row">No active sessions</div>}
          </div>
        </div>

        <div className="card">
          <div className="panel-head">
            <div className="label">Overlay devices</div>
            <span className="stamp">{stamp(overlay.updatedAt)}</span>
          </div>
          <div className="svc-list">
            {(overlay.data ?? []).map((d) => (
              <div className="svc-row" key={d.ts_ip}>
                <span className={`svc-dot ${d.online ? "running" : "stopped"}`} />
                <span className="name">{d.hostname}</span>
                <span className="pid">{d.online ? d.ts_ip : timeAgo(d.last_seen)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="panel-head">
            <div className="label">Listening ports</div>
            <span className="stamp">{stamp(ports.updatedAt)}</span>
          </div>
          <div className="scroll-y">
            <table>
              <tbody>
                {(ports.data?.listening ?? []).map((p, i) => (
                  <tr key={i}>
                    <td className="who">{p.command}</td>
                    <td>
                      {p.address}:{p.port}
                    </td>
                    <td>{p.new_since_yesterday && <span className="badge new">NEW</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
