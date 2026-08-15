export interface HealthResp {
  ok: boolean;
  last_collector_run: string;
}

export interface SummaryResp {
  failed_logins_24h: number;
  logins_24h: number;
  sessions_now: number;
  devices_online: number;
  alerts_24h: number;
  last_collector_run: string;
}

export interface AuthEvent {
  ts: string;
  service: string;
  result: "success" | "failure";
  user: string | null;
  source_ip: string | null;
  message: string;
}

export interface SessionRow {
  collected_at: string;
  kind: string;
  line: string;
}

export interface OverlayDevice {
  hostname: string;
  ts_ip: string;
  os: string;
  online: 0 | 1;
  first_seen: string;
  last_seen: string;
}

export interface ListenPort {
  command: string;
  pid: number | null;
  address: string;
  port: number;
  new_since_yesterday: boolean;
}

export interface PortsResp {
  listening: ListenPort[];
}

export interface AlertRow {
  ts: string;
  rule: string;
  message: string;
}

export interface AgentAuditRow {
  ts: string;
  agent: string;
  tool: string;
  action: string;
  success: 0 | 1;
  duration_ms: number;
}

export interface AgentSummary {
  agent: string;
  last_active: string;
  calls_today: number;
  errors_today: number;
}

export interface BackupStatus {
  status: "SUCCESS" | "FAILURE" | string;
  time: string;
  snapshot: string;
}

export interface UpdatesResp {
  checked_at: string;
  macos: string[];
  brew: string[];
  total: number;
}

export interface NetdataSeries {
  labels: string[];
  data: number[][];
}

export interface ServiceState {
  label: string;
  pid: number | null;
  status: "running" | "scheduled" | "stopped" | "unknown";
}
