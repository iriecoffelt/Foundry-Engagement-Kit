# Foundry Engagement Kit

A personal template system and desktop app for Forward Deployed Engineers working in Foundry. Copy what you need per engagement; keep what works, prune what doesn't.

## How to use this

## Desktop app

A native UI is available in [`app/`](app/) — guided wizards, visual architecture editor, file uploads, and **project report export (PDF / Word)**.

```bash
cd app
npm install
npm run tauri dev      # development
npm run tauri build    # produces .app + .dmg in src-tauri/target/release/bundle/
```

### App highlights

- **New engagement wizard** — step-by-step setup; writes markdown behind the scenes
- **Daily / weekly wizards** — pick a project first; entries saved under `daily/{project}/` and `weekly/{project}/`
- **Architecture tab** — drag-and-drop data flow diagram (React Flow)
- **Reference uploads** — attach files per project or in the Library
- **Export report** — from any project workspace, compile docs into PDF or `.docx` for sharing

### Starting a new engagement (CLI)

```bash
cp -r project/_template my-engagement-name
```

Then work through the numbered folders in order. Each folder has a `README.md` explaining when to use it and what "done" looks like.

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

## Folder structure

```
foundry-engagement-kit/
├── daily/                  # Day-to-day templates
├── weekly/                 # Week-to-week templates
├── project/_template/      # Full engagement scaffold (copy per project)
│   ├── 00-discovery/
│   ├── 01-scoping/
│   ├── 02-design/
│   ├── 03-build/
│   ├── 04-deploy/
│   └── 05-handoff/
└── reference/              # Reusable Foundry design guidance
```

## Principles

1. **Write decisions, not just code** — Foundry engagements outlive individual contributors. ADRs and design docs are deliverables.
2. **Ontology first, pipelines second** — Model the business before wiring data. Pipelines serve the ontology, not the other way around.
3. **One source of truth per concept** — Avoid duplicating logic across transforms, Functions, and Workshop. Document where truth lives.
4. **Design for handoff on day one** — Every template ends with "what does the customer own after you leave?"
5. **Keep templates thin** — Fill in tables and checklists; delete sections that don't apply.
