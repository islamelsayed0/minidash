"use client";

import { useMemo, useRef, useState } from "react";

export interface Point {
  t: number; // unix seconds
  v: number;
}

interface Props {
  data: Point[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
  formatTime?: (t: number) => string;
  yTickCount?: number;
}

const W = 620;
const PAD_L = 38;
const PAD_R = 44;
const PAD_T = 14;
const PAD_B = 24;

export function TimeSeriesChart({
  data,
  color = "var(--series-1)",
  height = 170,
  formatValue = (v) => v.toFixed(1),
  formatTime = (t) =>
    new Date(t * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
  yTickCount = 4,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chart = useMemo(() => {
    if (data.length < 2) return null;
    const sorted = [...data].sort((a, b) => a.t - b.t);
    const values = sorted.map((p) => p.v);
    const min = Math.min(0, ...values);
    const max = Math.max(...values) * 1.08 || 1;
    const span = max - min || 1;
    const t0 = sorted[0].t;
    const t1 = sorted[sorted.length - 1].t;
    const tSpan = t1 - t0 || 1;
    const plotW = W - PAD_L - PAD_R;
    const plotH = height - PAD_T - PAD_B;

    const xy = sorted.map((p) => ({
      x: PAD_L + ((p.t - t0) / tSpan) * plotW,
      y: PAD_T + plotH - ((p.v - min) / span) * plotH,
      t: p.t,
      v: p.v,
    }));

    const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${xy[xy.length - 1].x.toFixed(1)},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`;

    const ticks = Array.from({ length: yTickCount + 1 }, (_, i) => {
      const v = min + (span * i) / yTickCount;
      return { v, y: PAD_T + plotH - (i / yTickCount) * plotH };
    });

    return { xy, line, area, ticks, plotW, plotH, t0, t1 };
  }, [data, height, yTickCount]);

  if (!chart) {
    return <div className="empty-row">Not enough data yet</div>;
  }

  const { xy, line, area, ticks, plotH, t0, t1 } = chart;
  const last = xy[xy.length - 1];

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;
    let nearest = 0;
    let bestDist = Infinity;
    xy.forEach((p, i) => {
      const d = Math.abs(p.x - localX);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  const hp = hover !== null ? xy[hover] : null;
  const ttW = 90;
  const ttX = hp ? Math.min(Math.max(hp.x - ttW / 2, PAD_L), W - PAD_R - ttW) : 0;

  return (
    <svg
      ref={svgRef}
      className="chart-svg"
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      role="img"
      aria-label={`Time series, current value ${formatValue(last.v)}`}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <g stroke="var(--grid)" strokeWidth={1}>
        {ticks.map((tk, i) => (
          <line key={i} x1={PAD_L} y1={tk.y} x2={W - PAD_R} y2={tk.y} />
        ))}
      </g>
      <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke="var(--axis)" strokeWidth={1} />
      <g fontFamily="var(--mono)" fontSize="10" fill="var(--ink-mute)">
        {ticks.map((tk, i) => (
          <text key={i} x={PAD_L - 8} y={tk.y + 3} textAnchor="end">
            {formatValue(tk.v)}
          </text>
        ))}
        <text x={PAD_L} y={height - 4}>
          {formatTime(t0)}
        </text>
        <text x={(PAD_L + (W - PAD_R)) / 2} y={height - 4} textAnchor="middle">
          {formatTime((t0 + t1) / 2)}
        </text>
        <text x={W - PAD_R} y={height - 4} textAnchor="end">
          {formatTime(t1)}
        </text>
      </g>
      <path d={area} fill={color} opacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {hp && (
        <>
          <line x1={hp.x} y1={PAD_T} x2={hp.x} y2={PAD_T + plotH} stroke="var(--ink-mute)" strokeWidth={1} strokeDasharray="1 3" />
          <circle cx={hp.x} cy={hp.y} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          <rect className="tt" x={ttX} y={PAD_T + 4} width={ttW} height={34} rx={6} />
          <text className="tt-text dim" x={ttX + 10} y={PAD_T + 18}>
            {formatTime(hp.t)}
          </text>
          <text className="tt-text" x={ttX + 10} y={PAD_T + 31}>
            {formatValue(hp.v)}
          </text>
        </>
      )}

      <circle cx={last.x} cy={last.y} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
      <text x={last.x + 8} y={last.y + 3} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-2)">
        {formatValue(last.v)}
      </text>
    </svg>
  );
}
