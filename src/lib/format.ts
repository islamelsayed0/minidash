// Two formats appear in collector timestamps: ISO with offset
// ("2026-07-05T23:50:15-04:00") from wtmp/tailscale, and a space-separated
// unified-log style ("2026-07-06 07:46:38.532063-0400"). Both parse fine
// once the space is swapped for "T".
export function parseTs(ts: string): Date {
  const normalized = ts.includes("T") ? ts : ts.replace(" ", "T");
  return new Date(normalized);
}

export function formatTime(ts: string): string {
  const d = parseTs(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString("en-US", { hour12: false });
}

export function formatClock(d: Date): string {
  return (
    d.toLocaleTimeString("en-US", { hour12: false }) +
    " " +
    d.toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop()
  );
}

export function timeAgo(ts: string): string {
  const d = parseTs(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const secs = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${Math.floor(secs)}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// Screen Sharing rows carry no top-level user/source_ip — parse them out of
// the raw Authentication message instead.
export function extractScreenSharingWho(message: string): {
  user: string | null;
  ip: string | null;
} {
  const user = /User Name:\s*([^:]+?)\s*::/.exec(message)?.[1] ?? null;
  const ip = /Viewer Address:\s*([^:]+?)\s*::/.exec(message)?.[1] ?? null;
  return { user, ip };
}

export function gib(n: number): string {
  return `${n.toFixed(1)} GB`;
}
