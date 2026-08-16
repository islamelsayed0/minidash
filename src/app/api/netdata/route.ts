import { NextRequest } from "next/server";
import { NETDATA_BASE } from "@/lib/config";

// Every value below is interpolated into the upstream URL, so each one is either
// encoded or parsed before it gets there. A numeric param forwarded as raw text can
// carry an "&" and append arbitrary Netdata params after this allowlist, which
// defeats the point of having one.
function intParam(raw: string | null, fallback: number): number | null {
  if (raw === null) return fallback;
  return /^-?\d+$/.test(raw) ? Number(raw) : null;
}

// Read-only proxy to the local Netdata data API. Only forwards the query
// params this dashboard actually uses (chart/points/after) — never a config
// or control endpoint.
export async function GET(request: NextRequest) {
  const chart = request.nextUrl.searchParams.get("chart");
  if (!chart) {
    return Response.json({ error: "chart is required" }, { status: 400 });
  }

  const points = intParam(request.nextUrl.searchParams.get("points"), 60);
  const after = intParam(request.nextUrl.searchParams.get("after"), -3600);
  if (points === null || after === null) {
    return Response.json(
      { error: "points and after must be integers" },
      { status: 400 }
    );
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
