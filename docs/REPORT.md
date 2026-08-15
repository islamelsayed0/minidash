# MiniDash Report

MiniDash is the dashboard layer for a small homelab monitoring stack. The goal is simple: make the state of the lab visible at a glance, without turning the stack into a second production system.

The system is intentionally split across a few narrow parts:

- a local collector API that structures security and operational data
- Netdata for host and volume telemetry
- Uptime Kuma for reachability checks
- a read only dashboard that joins the pieces into one screen

## Why it exists

A homelab fails quietly more often than it fails loudly. The real risk is not a dramatic crash. It is the service that stopped last week and never said a word. MiniDash is built around that problem: keep the important signals visible, keep the surface area small, and avoid adding more machinery than the size of the environment can justify.

## What the dashboard shows

MiniDash groups the current state into a few practical views:

- overall health and recent alerts
- system load, swap, network, and disk pressure
- auth events, sessions, overlay presence, and listening ports
- service state from `launchctl`
- agent activity and audit history

The dashboard is read only. It does not try to manage the stack, restart services, or act as an admin console.

## Design choices

Several decisions are deliberate rather than accidental:

- Next.js App Router keeps the UI and the local proxy routes together.
- TypeScript keeps the data contracts explicit.
- The API routes are read only and only forward the fields the dashboard needs.
- The layout favors one dense but readable screen over a larger set of tabs.
- The styling is dark, compact, and information first.

## What is missing on purpose

This repo is not trying to become a general purpose observability platform. It does not include:

- Prometheus and Grafana
- centralized log shipping
- public exposure of the dashboard
- write access to the monitored systems

Those choices keep the stack easier to understand and easier to recover.

## Current gaps

The report is honest about the remaining weak spots:

- the dead man switch still needs service level verification
- the heartbeat and grace window should be documented clearly
- the alarm path depends on external connectivity for delivery
- reboot behavior still needs a real recovery test

Those are tracked in [Findings](FINDINGS.md).

## Implementation summary

The app is a Next.js dashboard that fetches live data from the local collector and Netdata, then renders a compact operational view. The collector endpoints are documented in [Upstream API shapes](api-shapes.md), and the dashboard code follows those shapes closely.

In practice, MiniDash is the front door for the homelab. It does not replace the underlying tools. It gives them one place to land.
