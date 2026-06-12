# Seedwatch

A modern web UI for [Transmission](https://transmissionbt.com/) with built-in **Hit & Run tracking** for private trackers.

Built with React, TypeScript, and Vite. Designed to be served directly from Transmission's web interface directory (`TRANSMISSION_WEB_HOME`).

![Transmission](https://img.shields.io/badge/Transmission-4.0%2B-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Torrent list** — sortable, filterable, with per-torrent progress and status
- **Torrent detail** — files, trackers, peers, and transfer stats
- **Hit & Run tracking** — per-tracker rules (ratio, seed time, combine mode) with danger/warn/ok status
- **HnR Triage view** — dedicated screen to quickly act on at-risk torrents
- **Transmission settings** — manage speed limits, download paths, and global session config
- **Stats dashboard** — cumulative and session transfer statistics
- **i18n** — English and French built-in
- **Add torrents** — by magnet link or `.torrent` file upload

## Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [TanStack Query](https://tanstack.com/query) — data fetching and auto-polling
- [Zustand](https://zustand-demo.pmnd.rs/) — settings persistence
- [Vite](https://vitejs.dev/) — build tooling

## Getting Started

### Development

```bash
# Install dependencies
bun install   # or npm install

# Start dev server (proxies /transmission to your Transmission instance)
VITE_PROXY_TARGET=http://192.168.1.x:9091 bun run dev
```

### Production build

```bash
bun run build
```

Copy the `dist/` output to your `TRANSMISSION_WEB_HOME` directory:

```bash
cp -r dist/* /path/to/transmission/web/
```

Transmission will then serve the UI at `http://<host>:9091/transmission/web/`.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_PROXY_TARGET` | `http://localhost:9091` | Transmission RPC endpoint (dev only) |
| `VITE_HOST` | `127.0.0.1` | Dev server bind address |
| `VITE_ALLOWED_HOSTS` | — | Comma-separated list of allowed hostnames |

## Hit & Run Tracking

Seedwatch lets you define per-tracker rules to avoid H&R violations on private trackers.

Each rule specifies:
- **Min ratio** — minimum upload/download ratio required
- **Min seed time** — minimum seeding duration (in hours)
- **Combine mode** — `OR` (either condition satisfied), `AND` (both required), `RATIO_ONLY`, or `TIME_ONLY`
- **Fail action** — what to do when a torrent is at risk: `flag`, `pause`, `delete`, or `delete-files`
- **Freeleech** — marks all torrents from this tracker as always safe

Torrent H&R status is shown inline in the torrent list and in a dedicated **HnR Triage** screen for bulk review.

## Compatibility

Targets **Transmission 4.0+** (RPC version 17). May work with older versions but is untested.

## License

MIT
