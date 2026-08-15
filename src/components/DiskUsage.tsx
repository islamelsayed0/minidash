export interface DiskVolume {
  name: string;
  usedGiB: number;
  availGiB: number;
}

function fmtGb(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(1)} TB` : `${g.toFixed(0)} GB`;
}

export function DiskUsage({ volumes }: { volumes: DiskVolume[] }) {
  return (
    <div className="disk-list">
      {volumes.map((v) => {
        const total = v.usedGiB + v.availGiB || 1;
        const pct = (v.usedGiB / total) * 100;
        const cls = pct > 90 ? "crit" : pct > 75 ? "warn" : "";
        return (
          <div className="disk-row" key={v.name}>
            <div className="disk-head">
              <span className="name">{v.name}</span>
              <span>
                {fmtGb(v.usedGiB)} / {fmtGb(total)} ({pct.toFixed(0)}%)
              </span>
            </div>
            <div className="disk-track">
              <div className={`disk-fill ${cls}`} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
