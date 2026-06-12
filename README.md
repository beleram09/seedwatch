# Seedwatch

A modern web UI for [Transmission](https://transmissionbt.com/) with built-in **Hit & Run tracking** for private trackers.

![Transmission](https://img.shields.io/badge/Transmission-4.0%2B-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![License](https://img.shields.io/badge/license-MIT-green)

## Installation

### Option 1 — Download the latest release (recommended)

1. Download the latest release from the [Releases page](https://github.com/beleram09/seedwatch/releases)
2. Extract the archive to a folder on your server (e.g. `/opt/seedwatch`)
3. Point Transmission to that folder:

**If you run Transmission directly:**
```bash
transmission-daemon --web-home /opt/seedwatch
```
Or set it permanently in `settings.json`:
```json
"web-home": "/opt/seedwatch"
```

**If you use Docker (`haugene/transmission-openvpn` or similar):**
```yaml
volumes:
  - /opt/seedwatch:/opt/seedwatch
environment:
  - TRANSMISSION_WEB_HOME=/opt/seedwatch
```

4. Open `http://<your-host>:9091/transmission/web/` — done.

---

### Option 2 — Build from source

Requirements: [Node.js](https://nodejs.org/) 18+ (or [Bun](https://bun.sh/))

```bash
git clone https://github.com/beleram09/seedwatch.git
cd seedwatch
npm install
npm run build
```

Copy the output to your server:
```bash
scp -r dist/* user@yourserver:/opt/seedwatch/
```

Then follow step 3 above to point Transmission to `/opt/seedwatch`.

---

## Features

- **Torrent list** — sortable, filterable, with per-torrent progress and status
- **Torrent detail** — files, trackers, peers, and transfer stats
- **Hit & Run tracking** — per-tracker rules (ratio, seed time, combine mode) with danger/warn/ok status
- **HnR Triage view** — dedicated screen to quickly act on at-risk torrents
- **Transmission settings** — manage speed limits, download paths, and global session config
- **Stats dashboard** — cumulative and session transfer statistics
- **i18n** — English and French built-in
- **Add torrents** — by magnet link or `.torrent` file upload

## Hit & Run Tracking

Seedwatch lets you define per-tracker rules to avoid H&R violations on private trackers.

Go to **Settings → H&R Rules** and add a rule for each tracker:

| Field | Description |
|---|---|
| **Min ratio** | Minimum upload/download ratio required |
| **Min seed time** | Minimum seeding duration (hours) |
| **Combine mode** | `OR` (either condition), `AND` (both), `RATIO_ONLY`, `TIME_ONLY` |
| **Fail action** | What to do when at risk: `flag`, `pause`, `delete`, `delete-files` |
| **Freeleech** | Mark all torrents from this tracker as always safe |

Torrent H&R status is shown inline in the list and in the dedicated **HnR Triage** screen.

## Development

```bash
git clone https://github.com/beleram09/seedwatch.git
cd seedwatch
npm install

# Proxy to your local Transmission instance
VITE_PROXY_TARGET=http://192.168.1.x:9091 npm run dev
```

## Compatibility

Targets **Transmission 4.0+** (RPC version 17).

## License

MIT
