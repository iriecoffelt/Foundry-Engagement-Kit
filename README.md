# Foundry Engagement Kit

A personal template system and desktop app for Forward Deployed Engineers working in Foundry. Copy what you need per engagement; keep what works, prune what doesn't.

Everything lives as plain markdown and JSON on disk — no cloud sync, no database.

## Desktop app

A native desktop app in [`app/`](app/) (macOS, Windows, Linux) — guided wizards, visual architecture editor, editable reference guides, focus timer, and **project report export (PDF / Word)**.

### Install & run

**From source (development):**

```bash
cd app
npm install
npm run tauri dev
```

**Build a standalone installer** (for your OS):

```bash
cd app
npm run tauri:build
```

| Platform | Output (under `app/src-tauri/target/release/bundle/`) |
|----------|------------------------------------------------------|
| macOS | `.app`, `.dmg` — or `npm run tauri:install` to build and open the DMG |
| Windows | `.msi`, NSIS `-setup.exe` |
| Linux | `.deb`, `.AppImage`, `.rpm` |

**Download pre-built installers** from [GitHub Releases](https://github.com/iriecoffelt/Foundry-Engagement-Kit/releases) (push a `v*` tag to build all platforms — see [`app/README.md`](app/README.md#github-releases-all-platforms)).
**macOS first launch:** Releases from GitHub are code-signed and notarized — they should open without extra steps. If you built locally without signing and see a “damaged” error, clear the download quarantine: `xattr -cr "/Applications/Foundry Engagement Kit.app"`

### First launch

1. Open the app and choose where your workspace should live — the app creates all required folders automatically.
2. When run from source inside this repo, the workspace auto-detects.
3. Create engagements with **Projects → New engagement**. Do not copy `project/_template/` by hand.

### App highlights

| Area | What it does |
|------|----------------|
| **Home** | Quick-create standup, weekly review, customer sync; cadence reminders; recent files |
| **Projects** | Engagement workspace, phase stepper, milestones, handoff readiness, ontology quick-add, architecture diagram, clone project, export PDF/DOCX |
| **Daily / Weekly** | Guided wizards; entries saved under `daily/{project}/` and `weekly/{project}/`; edit standups after saving |
| **Library** | Editable reference guides (`reference/*.md`) and file uploads |
| **Focus** | Pomodoro-style timer (full-screen or floating pill) |
| **Settings** | Workspace folder, shortcuts, build instructions |

**Keyboard shortcuts:** `Ctrl+K` / `⌘K` command palette · `Ctrl+S` / `⌘S` save while editing

See [`app/README.md`](app/README.md) for more detail on development and build.

---

## Starting a new engagement

**Recommended (app):** Use **New engagement** in the desktop app. The wizard writes `engagement.json`, fills the overview, and scaffolds the project folder.

**Manual (CLI):** Copy the template if you prefer the command line:

```bash
cp -r project/_template project/my-engagement-name
```

Then work through the numbered folders in order. Each folder has a `README.md` explaining when to use it and what "done" looks like. You will need to fill in placeholders yourself.

### Daily / weekly rhythm

| Cadence | Template | Purpose |
|---------|----------|---------|
| Daily | [`daily/standup.md`](daily/standup.md) | Blockers, priorities, customer touchpoints |
| Weekly | [`weekly/weekly-review.md`](weekly/weekly-review.md) | Progress, risks, next-week plan |
| Weekly | [`weekly/customer-sync.md`](weekly/customer-sync.md) | Prep for stakeholder meetings |

### Quick reference

| Topic | Location |
|-------|----------|
| Ontology design | [`reference/ontology-design-guide.md`](reference/ontology-design-guide.md) |
| Pipeline patterns | [`reference/pipeline-patterns.md`](reference/pipeline-patterns.md) |
| Workshop module map | [`reference/workshop-module-map.md`](reference/workshop-module-map.md) |
| Naming conventions | [`reference/naming-conventions.md`](reference/naming-conventions.md) |
| ADRs | [`project/_template/02-design/adr-template.md`](project/_template/02-design/adr-template.md) |

Guides are editable in the app under **Library**, or directly as markdown in `reference/`.

## Folder structure

```
foundry-engagement-kit/
├── app/                    # Desktop app (Tauri + React)
├── daily/                  # Day-to-day templates and standups
├── weekly/                 # Week-to-week templates
├── project/
│   └── _template/          # Full engagement scaffold (copy per project)
│       ├── 00-discovery/
│       ├── 01-scoping/
│       ├── 02-design/
│       ├── 03-build/
│       ├── 04-deploy/
│       └── 05-handoff/
└── reference/              # Reusable Foundry design guidance
    └── uploads/            # Library file uploads (created by app)
```

## Collaboration

For engagements with multiple FDEs, you can share the workspace via Git.

### Setting up a shared workspace

1. Initialize Git in your workspace folder (if not already done):
   ```bash
   cd your-workspace
   git init
   git remote add origin <your-repo-url>
   ```

2. The included `.gitignore` excludes personal files automatically:
   - Focus timer state
   - Local UI preferences (file tree expanded state, search history)
   - Editor temp files
   - Uploaded reference files (in `reference/uploads/`)

### What's shared vs. personal

| Shared (committed) | Personal (gitignored) |
|-------------------|----------------------|
| Project folders and documents | Focus timer sessions |
| Daily standup notes | File tree expansion state |
| Weekly reviews and customer syncs | Last search query |
| Architecture diagrams | Library panel selection |
| Reference guides | Editor swap files |
| Engagement metadata | OS-specific files (.DS_Store) |

### Recommended workflow

1. **Pull before starting work**: `git pull --rebase` to get latest changes
2. **Commit frequently**: Small, focused commits for each completed task
3. **Use descriptive commit messages**: Include project name and what changed
4. **Push at end of day**: Share your progress with teammates
5. **Review conflicts carefully**: Engagement JSON and delivery boards may need manual merge

### Tips for multiple FDEs

- Coordinate on delivery board changes to avoid merge conflicts
- Use separate daily standup files (each FDE's notes are date-stamped)
- Assign clear ownership of architecture diagram sections
- Add your name to decisions (ADRs) you author

## Principles

1. **Write decisions, not just code** — Foundry engagements outlive individual contributors. ADRs and design docs are deliverables.
2. **Ontology first, pipelines second** — Model the business before wiring data. Pipelines serve the ontology, not the other way around.
3. **One source of truth per concept** — Avoid duplicating logic across transforms, Functions, and Workshop. Document where truth lives.
4. **Design for handoff on day one** — Every template ends with "what does the customer own after you leave?"
5. **Keep templates thin** — Fill in tables and checklists; delete sections that don't apply.
