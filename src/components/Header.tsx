"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/format";

type Status = "good" | "warn" | "crit";

export function Header({ status, statusLabel }: { status: Status; statusLabel: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="header">
      <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22D3EE" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="26" height="26" rx="7" fill="none" stroke="url(#brand-grad)" strokeWidth="1.6" />
        <polyline
          points="8,19 13,19 15,11 18,23 20,16 24,16"
          fill="none"
          stroke="url(#brand-grad)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="wordmark">
        <b>MINI</b>
        <span className="app">Dash</span>
      </div>
      <div className="head-status">
        <a
          className="home-link"
          href={process.env.NEXT_PUBLIC_HOMEPAGE_URL ?? "http://127.0.0.1:3010"}
          title="Back to Homepage"
        >
          <svg className="home-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M11.29 2.7a1 1 0 0 1 1.42 0l8 8a1 1 0 0 1-1.42 1.42L19 11.83V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-5h-2v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.17l-.29.3a1 1 0 1 1-1.42-1.42Z"
              fill="currentColor"
            />
          </svg>
          Homepage
        </a>
        <span className={`pill ${status}`}>
          <span className="dot" />
          {statusLabel}
        </span>
        <span className="clock">{now ? formatClock(now) : "—"}</span>
      </div>
    </header>
  );
}
