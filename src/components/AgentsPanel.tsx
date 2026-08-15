"use client";

import { useState } from "react";
import { usePolling } from "@/lib/usePolling";
import type { AgentSummary } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { AgentAuditModal } from "./AgentAuditModal";

function AgentCard({ agent, onOpen }: { agent: string; onOpen: (agent: string) => void }) {
  const s = usePolling<AgentSummary>(`/api/collector/agent-summary?agent=${agent}`, 60_000);
  const d = s.data;
  const idle = !d || d.last_active === "never";
  const errorRate = d && d.calls_today > 0 ? d.errors_today / d.calls_today : 0;

  return (
    <button type="button" className="agent-card" onClick={() => onOpen(agent)}>
      <div className="name">{agent}</div>
      {idle ? (
        <div className="idle">never active</div>
      ) : (
        <>
          <div className="stats">
            <span>
              calls <b>{d?.calls_today}</b>
            </span>
            <span className={errorRate > 0.2 ? "wrn" : ""}>
              errors <b>{d?.errors_today}</b>
            </span>
          </div>
          <div className="idle">last active {d ? timeAgo(d.last_active) : "—"}</div>
        </>
      )}
      <span className="expand-hint">view audit log →</span>
    </button>
  );
}

export function AgentsPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="panel-head">
        <div className="label">Agents</div>
      </div>
      <div className="agent-grid">
        <AgentCard agent="personal" onOpen={setExpanded} />
        <AgentCard agent="business" onOpen={setExpanded} />
      </div>
      {expanded && <AgentAuditModal agent={expanded} onClose={() => setExpanded(null)} />}
    </div>
  );
}
