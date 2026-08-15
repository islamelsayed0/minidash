# MiniDash

MiniDash is a read only dashboard for a self hosted homelab. It pulls data from the local collector API and Netdata, then presents the current state in one place: health, security, services, and agent activity.

This repository contains the dashboard app plus the docs that explain how the stack fits together.

## What is here

- `src/app/api/*` read only proxy routes for the local collector and Netdata
- `src/components/*` the dashboard panels and cards
- `docs/api-shapes.md` the captured upstream payload shapes
- `docs/REPORT.md` the polished project report
- `docs/FINDINGS.md` the known gaps and verification notes

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Local collector API
- Netdata

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configuration

Infrastructure addresses and the launchd label prefix are read from the environment, never
committed. A real host address in source is published the moment the repo is, and stays in
history after it is edited out. Defaults are loopback, so a fresh clone runs without
pointing at anyone's machine.

| Variable | Purpose | Default |
| --- | --- | --- |
| `COLLECTOR_BASE` | Collector API origin | `http://127.0.0.1:8090` |
| `NETDATA_BASE` | Netdata origin | `http://127.0.0.1:19999` |
| `NEXT_PUBLIC_HOMEPAGE_URL` | Target of the header's Homepage link | `http://127.0.0.1:3010` |
| `SERVICE_PREFIX` | Launchd label prefix for the locally managed jobs | `com.example` |

Set them in a local env file, which git ignores.

## Notes

- The app is read only.
- The collector and Netdata must be available on the local network for live data.
- The dashboard is designed for a single operator on the homelab machine, not for public exposure.

## Docs

- [Project report](docs/REPORT.md)
- [Infrastructure](docs/INFRASTRUCTURE.md) — the lab it runs on, and where the trust boundaries sit
- [Findings](docs/FINDINGS.md)
- [Upstream API shapes](docs/api-shapes.md)
