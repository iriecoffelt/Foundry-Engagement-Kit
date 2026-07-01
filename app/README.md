# Foundry Engagement Kit — Desktop App

Native desktop UI (macOS, Windows, Linux) for the [Foundry Engagement Kit](../README.md) template workspace.

## Requirements

- Node.js 20+ (CI uses 24)
- Rust 1.85+ — [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
  - **macOS** — Xcode command line tools; Rust 1.85+ required for native calendar integration (EventKit)
  - **Windows** — Microsoft Edge WebView2 (usually pre-installed on Windows 10/11)
  - **Linux** — `webkit2gtk` and related packages (see Tauri docs)

## Development

```bash
cd app
npm install
npm run tauri dev
```

## Build (local)

Build an installer for **your current platform**:

```bash
cd app
npm run tauri:build
```

Artifacts appear under `src-tauri/target/release/bundle/`:

| Platform | Installers |
|----------|------------|
| **macOS** | `bundle/macos/*.app`, `bundle/dmg/*.dmg` |
| **Windows** | `bundle/msi/*.msi`, `bundle/nsis/*-setup.exe` |
| **Linux** | `bundle/deb/*.deb`, `bundle/appimage/*.AppImage`, `bundle/rpm/*.rpm` |

**macOS only** — build and open the DMG in Finder:

```bash
npm run tauri:install
```

(`tauri:install:mac` is the same on macOS.) If the installer window closes immediately, eject any mounted copy and run `npm run tauri:install` again.

## GitHub Releases (all platforms)

CI builds macOS (Apple Silicon + Intel), Windows, and Linux installers when you push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The [Release workflow](../.github/workflows/release.yml) creates a **draft** GitHub Release with attached installers. Publish the draft when ready.

## First launch

1. On first open, pick where your workspace should live (Documents, a network drive, etc.). The app creates `daily/`, `weekly/`, `project/`, `reference/`, and `project/_template/` automatically.
2. Otherwise: **Settings → Create new workspace** or **Use existing folder**.
3. Create projects via **New engagement** — not by copying `project/_template/` manually.

## Features

- **Home** — standup, weekly review, customer sync; cadence alerts; insights; recent activity; today's meetings (macOS)
- **Portfolio** — cross-engagement health and phase counts
- **Projects** — engagement workspace, stakeholders, phase stepper, milestones, handoff readiness, ontology, architecture (with Foundry deep links), documents, library
- **Daily / Weekly** — guided wizards; double-click standup entries to edit after saving
- **Library** — editable reference guides and file uploads
- **Search** — full-text search across the workspace
- **Focus** — Pomodoro timer with full-screen and floating modes
- **Command palette** — `Ctrl+K` / `⌘K` to jump anywhere or start wizards
- **Save** — `Ctrl+S` / `⌘S` while editing any document

## Data layout

All data is plain files on disk under the workspace root you select in Settings — the same layout on every OS:

```
daily/{project}/       — standups
weekly/{project}/      — reviews and customer sync prep
project/{slug}/        — engagement folders
reference/             — shared guides (editable in Library)
reference/uploads/     — uploaded reference files
```

Share the workspace via Git, sync folder, or backup zip (Settings → Backup & restore).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run tauri dev` | Run app in development mode |
| `npm run tauri:build` | Production build for current OS + path hint |
| `npm run tauri:install` | Build + open DMG (macOS; alias for `tauri:install:mac`) |
| `npm run tauri:install:mac` | Same as above |

## CI

- **Pull requests** — frontend TypeScript build + `cargo check` on Ubuntu, Windows, and macOS
- **Tags `v*`** — full Tauri bundle for all platforms uploaded to GitHub Releases
