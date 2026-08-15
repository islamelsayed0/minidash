# Findings

This file records the current gaps in the MiniDash stack and the parts that still need verification.

## F1. Dead man switch is host level, not service level

Severity: high

The heartbeat currently proves that the host can still run the scheduled job. It does not prove that the collectors are healthy.

If Netdata crashes, Uptime Kuma hangs, or the Python collector exits, the heartbeat can still continue and the external service will stay quiet.

Status: identified, not fixed.

## F2. The alarm path has not been tested end to end

The stack still needs a deliberate outage test:

- stop the scheduled heartbeat
- wait past the grace window
- confirm the alert arrives
- restart the job

Until that is done, the switch is assumed rather than verified.

Status: not tested.

## F3. Alert delivery depends on internet access

The dead man switch can detect silence, but Telegram delivery still needs connectivity. That is normal for a homelab, but it should be stated plainly.

Status: accepted limitation.

## F4. Detection latency is not documented

The report references a heartbeat interval and grace window, but the exact values still need to be written down in one place.

Status: needs documentation.

## F5. Reboot recovery is unverified

The repo still needs a real reboot or power loss test that confirms which services return automatically and which require intervention.

Status: untested.

## Open gaps

- heartbeat interval and grace window
- collector categories parsed by the Python event collector
- Uptime Kuma check categories and count
- MiniDash implementation details worth documenting at a higher level
- retention policy for metrics and events
- whether Obsidian export is automatic or manual
