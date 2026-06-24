# Foundry Engagement Kit

A personal template system and desktop app for Forward Deployed Engineers working in Foundry. Copy what you need per engagement; keep what works, prune what doesn't.

Everything lives as plain markdown and JSON on disk — no cloud sync, no database.

## Desktop app

A native macOS UI in [`app/`](app/) — guided wizards, visual architecture editor, editable reference guides, focus timer, and **project report export (PDF / Word)**.

### Install & run

**From source (development):**

```bash
cd app
npm install
npm run tauri dev
```

**Build a standalone app:**

```bash
cd app
npm run tauri build
```

Output: `app/src-tauri/target/release/bundle/macos/Foundry Engagement Kit.app`

**Build and open the DMG installer:**

```bash
cd app
npm run tauri:install
```

Output: `app/src-tauri/target/release/bundle/dmg/Foundry Engagement Kit_0.1.0_aarch64.dmg`

### First launch

1. Open the app. It auto-detects the workspace if run from within this repo.
2. Otherwise go to **Settings → Change folder** and select this repo root — the folder containing `daily/`, `weekly/`, `project/`, and `reference/`.
3. Create engagements with **Projects → New engagement** (or **Home → New engagement**). Do not copy `project/_template/` by hand; that leaves `{{placeholders}}` in the overview.

### App highlights

| Area | What it does |
|------|----------------|
| **Home** | Quick-create standup, weekly review, customer sync; cadence reminders; recent files |
| **Projects** | Engagement workspace, phase stepper, milestones, handoff readiness, ontology quick-add, architecture diagram, clone project, export PDF/DOCX |
| **Daily / Weekly** | Guided wizards; entries saved under `daily/{project}/` and `weekly/{project}/`; edit standups after saving |
| **Library** | Editable reference guides (`reference/*.md`) and file uploads |
| **Focus** | Pomodoro-style timer (full-screen or floating pill) |
| **Settings** | Workspace folder, shortcuts, build instructions |

**Keyboard shortcuts:** `⌘K` command palette · `⌘S` save while editing

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

## Principles

1. **Write decisions, not just code** — Foundry engagements outlive individual contributors. ADRs and design docs are deliverables.
2. **Ontology first, pipelines second** — Model the business before wiring data. Pipelines serve the ontology, not the other way around.
3. **One source of truth per concept** — Avoid duplicating logic across transforms, Functions, and Workshop. Document where truth lives.
4. **Design for handoff on day one** — Every template ends with "what does the customer own after you leave?"
5. **Keep templates thin** — Fill in tables and checklists; delete sections that don't apply.
