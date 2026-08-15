interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ values, width = 76, height = 24, color = "var(--accent)" }: Props) {
  if (values.length < 2) {
    return <svg className="spark" width={width} height={height} aria-hidden="true" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return [x, y] as const;
  });
  const trail = pts.slice(0, -1);
  const head = pts.slice(-2);

  return (
    <svg className="spark" width={width} height={height} aria-hidden="true">
      <polyline
        points={trail.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="var(--spark)"
        strokeWidth={1.5}
      />
      <polyline
        points={head.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={color} />
    </svg>
  );
}
