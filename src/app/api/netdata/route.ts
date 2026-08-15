import { NextRequest } from "next/server";
import { NETDATA_BASE } from "@/lib/config";

// Read-only proxy to the local Netdata data API. Only forwards the query
// params this dashboard actually uses (chart/points/after) — never a config
// or control endpoint.
export async function GET(request: NextRequest) {
  const chart = request.nextUrl.searchParams.get("chart");
  const points = request.nextUrl.searchParams.get("points") ?? "60";
  const after = request.nextUrl.searchParams.get("after") ?? "-3600";
  if (!chart) {
    return Response.json({ error: "chart is required" }, { status: 400 });
  }

  const target = `${NETDATA_BASE}/api/v1/data?chart=${encodeURIComponent(chart)}&points=${points}&after=${after}&format=json`;

  try {
    const res = await fetch(target, { cache: "no-store" });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return Response.json({ error: "netdata unreachable" }, { status: 502 });
  }
}
