# Foundry Engagement Kit — Desktop App

Native macOS UI for the [Foundry Engagement Kit](../README.md) template workspace.

## Requirements

- Node.js 18+
- Rust (for Tauri builds) — [install guide](https://v2.tauri.app/start/prerequisites/)

## Development

```bash
cd app
npm install
npm run tauri dev
```

## Build (macOS)

**Build only** — produces `.app` and `.dmg` without opening the installer:

```bash
npm run tauri build
```

**Build and install** — builds, then opens the DMG in Finder:

```bash
npm run tauri:install
```

### Output paths

| Artifact | Path |
|----------|------|
| Application | `src-tauri/target/release/bundle/macos/Foundry Engagement Kit.app` |
| DMG installer | `src-tauri/target/release/bundle/dmg/Foundry Engagement Kit_0.1.0_aarch64.dmg` |

If the installer window closes immediately, eject any mounted copy of the DMG and run `npm run tauri:install` again.

## First launch

1. The app auto-detects the workspace when run from within the repo.
2. Otherwise: **Settings → Change folder** → select the repo root (must contain `daily/`, `weekly/`, `project/`, `reference/`).
3. Create projects via **New engagement** — not by copying `project/_template/` manually.

## Features

- **Home** — standup, weekly review, customer sync; cadence alerts; recent activity
- **Projects** — engagement overview, phase stepper, milestones, handoff readiness, ontology quick-add, architecture diagram (with PNG export), clone project, PDF/DOCX report export
- **Daily / Weekly** — guided wizards; double-click standup entries to edit after saving
- **Library** — editable reference guides and file uploads
- **Focus** — Pomodoro timer with full-screen and floating modes
- **Command palette** — `⌘K` to jump anywhere or start wizards
- **Save** — `⌘S` while editing any document

## Data layout

All data is plain files on disk under the workspace root you select in Settings:

```
daily/{project}/       — standups
weekly/{project}/      — reviews and customer sync prep
project/{slug}/        — engagement folders
reference/             — shared guides (editable in Library)
reference/uploads/     — uploaded reference files
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run tauri dev` | Run app in development mode |
| `npm run tauri build` | Production build |
| `npm run tauri:install` | Build + open DMG installer |
