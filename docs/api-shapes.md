# MiniDash — Upstream API Shapes (captured live 2026-07-06)

All shapes below were captured with curl against the running services on this
machine. Every MiniDash component is designed against these exact fields.

## Collector API — `http://<MONITOR_HOST>:8090` (GET only)

### `/health`
```json
{"ok": true, "last_collector_run": "2026-07-06T08:47:38-04:00"}
```

### `/summary`
```json
{
  "failed_logins_24h": 0,
  "logins_24h": 6,
  "sessions_now": 9,
  "devices_online": 4,
  "alerts_24h": 17,
  "last_collector_run": "2026-07-06T08:47:38-04:00"
}
```

### `/auth-events` — array, newest first
```json
{
  "ts": "2026-07-06 07:46:38.532063-0400",   // NOTE: two ts formats exist
  "service": "screensharingd" | "sshd",
  "result": "success" | "failure",
  "user": "<USER>" | null,                    // null for screensharingd rows
  "source_ip": "<PEER_HOST>" | null,         // null for screensharingd rows
  "message": "Authentication: SUCCEEDED :: User Name: <USER> :: Viewer Address: <PEER_HOST> :: Type: RSA-SRP"
}
```
Screen Sharing rows carry user/IP only inside `message`
(`User Name: X :: Viewer Address: Y`) — parse for display.
wtmp rows use ISO ts (`2026-07-05T23:50:15-04:00`), unified-log rows use
`YYYY-MM-DD HH:MM:SS.ffffff-0400`. Normalize both.

### `/sessions` — array of raw lines
```json
{
  "collected_at": "2026-07-06T08:47:38-04:00",
  "kind": "who" | "tcp5900" | "tcp22",
  "line": "<USER>           ttys000      Jul  5 14:11"
}
```
Raw `who -a` / netstat lines; includes noise rows (`system boot`,
`run-level 3`, exited ttys with `term=0 exit=0`). Filter + parse client side.

### `/tailnet` — array
```json
{
  "hostname": "Islam’s MacBook Pro",
  "ts_ip": "<PEER_HOST>",
  "os": "macOS" | "linux" | "windows",
  "online": 1 | 0,
  "first_seen": "2026-07-05T18:32:58-04:00",
  "last_seen": "2026-07-06T08:02:43-04:00"
}
```

### `/ports`
```json
{"listening": [{
  "command": "node" | "(root/system)",
  "pid": 50964 | null,
  "address": "<MONITOR_HOST>" | "*" | "127.0.0.1" | "::1" | "<OVERLAY_IPV6>",
  "port": 3001,
  "new_since_yesterday": false
}]}
```

### `/alerts` — array, newest first
```json
{
  "ts": "2026-07-06T07:47:23-04:00",
  "rule": "auth-failure" | "auth-new-ip" | "port-new" | ...,
  "message": "failed screensharingd login, user=? from ?"
}
```

### `/agent-audit` (`?agent=X&limit=N`) — array
```json
{
  "ts": "2026-07-06T08:02:12-04:00",
  "agent": "personal" | "business",
  "tool": "testsrv:read_file",
  "action": "path=/tmp/x",
  "success": 1 | 0,
  "duration_ms": 17
}
```

### `/agent-summary?agent=personal|business`
```json
{"agent": "personal", "last_active": "2026-07-06T08:02:12-04:00" | "never",
 "calls_today": 2, "errors_today": 1}
```

### `/backup-status`
```json
{"status": "SUCCESS", "time": "2026-07-06T08:03:30-04:00", "snapshot": "40c40524"}
```

### `/updates`
```json
{"checked_at": "2026-07-05T18:34:10-04:00", "macos": [],
 "brew": ["fontconfig", "..."], "total": 15}
```

## Netdata — `http://127.0.0.1:19999/api/v1`

**CRITICAL LIMITATION:** `system.cpu` and `system.ram` DO NOT EXIST on this
box — the mach SMI collector is deliberately disabled (netdata 2.10.3 crashes
on this M4 without that workaround; see ~/services/README.md). Available
system charts: `system.load`, `system.uptime`, `system.io`, `system.ipv4`,
`system.idlejitter`, `mem.swap`, `disk_space./` (+ per-volume, incl.
`disk_space./Volumes/Restic-Repo`, `disk_space./Volumes/TM-Backup 1`),
`net.<iface>`, `disk_util.<disk>`, per-process `app.<name>_cpu_utilization` /
`app.<name>_mem_usage`.

Query form (verified):
```
GET /api/v1/data?chart=disk_space./&points=1&after=-10&format=json
→ {"labels":["time","avail","used","reserved for root"],
   "data":[[1783342160,139.902454,88.371407,0]]}   // GiB
```
Historical series: `&points=90&after=-3600` for sparklines.

## Uptime Kuma — `http://<MONITOR_HOST>:3001`

No anonymous read path today: no status page configured
(`/api/status-page/list` → "Status Page Not Found"), `/metrics` requires
auth. Monitors existing: Netdata (1), Open Claw gateway (2), Homepage (3).

**v1 plan:** create a Kuma status page (additive, does not modify existing
monitors); its public heartbeat endpoint
`/api/status-page/heartbeat/<slug>` then feeds the Services panel.

## Gaps → proposals (NOT implemented in v1)

1. **Memory pressure current value** — the collector checks it every 5 min
   but only alerts; no endpoint exposes the current level. Propose adding
   `memory_pressure` to `/summary`. v1 shows load avg + swap instead.
2. **CPU %** — no whole-system CPU chart in Netdata (see above). v1 uses
   `system.load` (1/5/15 min load average). Alternative later: a tiny
   `host_metrics` collector field via `top -l 1`.
3. **launchd service states** — no API exposes them. v1: MiniDash's own
   Next.js route handler runs read-only `launchctl list` (same machine,
   no collector change).
