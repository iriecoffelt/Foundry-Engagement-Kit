# Foundry Engagement Kit

Desktop UI for managing your Foundry engagement template workspace.

## Development

```bash
cd app
npm install
npm run tauri dev
```

## Build executable (macOS)

```bash
cd app
npm install
npm run tauri build
```

The `.app` and `.dmg` will be in `app/src-tauri/target/release/bundle/`.

## First launch

The app auto-detects the workspace if run from within this repo. Otherwise, go to **Settings → Change folder** and select your template workspace root (the folder containing `daily/`, `weekly/`, `project/`, `reference/`).

## Features

- **Home** — quick-create standup, weekly review, or new project
- **Daily / Weekly / Projects / Reference** — browse, edit, create, delete markdown files
- **Markdown preview** — toggle preview while editing
- **Search** — find any `.md` file across the workspace
- **Keyboard shortcut** — Cmd+S to save
