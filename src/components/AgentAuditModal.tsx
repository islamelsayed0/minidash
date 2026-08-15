"use client";

import { useEffect } from "react";
import { usePolling } from "@/lib/usePolling";
import type { AgentAuditRow } from "@/lib/types";
import { formatTime } from "@/lib/format";

export function AgentAuditModal({ agent, onClose }: { agent: string; onClose: () => void }) {
  const audit = usePolling<AgentAuditRow[]>(`/api/collector/agent-audit?agent=${agent}&limit=20`, 15_000);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = audit.data ?? [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div className="label">{agent} — recent audit log</div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="scroll-y modal-scroll">
          <table>
            <thead>
              <tr>
                <th>time</th>
                <th>tool</th>
                <th>action</th>
                <th></th>
                <th>ms</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{formatTime(r.ts)}</td>
                  <td className="who">{r.tool}</td>
                  <td>{r.action}</td>
                  <td>
                    {r.success ? <span className="badge ok">✓ OK</span> : <span className="badge bad">✕ FAIL</span>}
                  </td>
                  <td>{r.duration_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {audit.loading && rows.length === 0 && <div className="empty-row">Loading…</div>}
          {!audit.loading && rows.length === 0 && (
            <div className="empty-row">No audit rows for this agent yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
