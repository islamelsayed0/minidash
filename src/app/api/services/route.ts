import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ServiceState } from "@/lib/types";

const execFileAsync = promisify(execFile);

// Launchd label prefix for the locally managed jobs. It is read from the environment
// rather than written here because the real prefix names its owner, and a name committed
// once stays in history after it is edited out. Set SERVICE_PREFIX in a local env file.
const PREFIX = process.env.SERVICE_PREFIX ?? "com.example";

// KeepAlive services — expected to hold a PID at all times; a null PID here
// means the service is actually down.
const PERSISTENT = [
  `${PREFIX}.ttyd`,
  `${PREFIX}.homepage`,
  `${PREFIX}.uptime-kuma`,
  `${PREFIX}.collector-api`,
  "homebrew.mxcl.netdata",
  "ai.openclaw.gateway", // watched read-only; never restarted/managed (house rule)
];

// Interval/calendar launchd jobs — a null PID between runs is normal, not down.
const SCHEDULED = [
  `${PREFIX}.collector`,
  `${PREFIX}.collector-retention`,
  `${PREFIX}.restic-backup`,
  `${PREFIX}.deadman`,
  `${PREFIX}.update-check`,
];

const WATCHED = [...PERSISTENT, ...SCHEDULED];

// Read-only `launchctl list` — no collector or service state is modified.
export async function GET() {
  try {
    const { stdout } = await execFileAsync("launchctl", ["list"]);
    const pidByLabel = new Map<string, number | null>();
    for (const line of stdout.split("\n")) {
      const [pidRaw, , label] = line.split("\t");
      if (!label || !WATCHED.includes(label.trim())) continue;
      pidByLabel.set(label.trim(), pidRaw === "-" ? null : Number(pidRaw));
    }

    const services: ServiceState[] = WATCHED.map((label) => {
      if (!pidByLabel.has(label)) return { label, pid: null, status: "unknown" };
      const pid = pidByLabel.get(label) ?? null;
      if (pid) return { label, pid, status: "running" };
      return { label, pid: null, status: SCHEDULED.includes(label) ? "scheduled" : "stopped" };
    });

    return Response.json({ services });
  } catch {
    return Response.json({ error: "launchctl unavailable" }, { status: 502 });
  }
}
