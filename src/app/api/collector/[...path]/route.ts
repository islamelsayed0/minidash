import { NextRequest } from "next/server";
import { COLLECTOR_BASE } from "@/lib/config";

// Transparent read-only proxy to the security collector API so the browser
// only ever talks to this app's own origin (<MONITOR_HOST>:3020), never
// directly to the collector on :8090. Never modifies the collector.
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const target = `${COLLECTOR_BASE}/${path.join("/")}${request.nextUrl.search}`;

  try {
    const res = await fetch(target, { cache: "no-store" });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return Response.json({ error: "collector unreachable" }, { status: 502 });
  }
}
