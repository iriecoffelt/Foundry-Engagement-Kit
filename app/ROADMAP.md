# Foundry Engagement Kit — Feature Roadmap

Top 10 FDE-driven features implemented in this release:

| # | Feature | Why (FDE perspective) | Where in UI |
|---|---------|----------------------|-------------|
| 1 | **Cmd+K Command Palette** | Jump anywhere fast between engagements, wizards, and docs | `⌘K` anywhere; search bar in palette |
| 2 | **Customer Sync Wizard** | Prep stakeholder meetings with agenda, demo script, decisions | Home quick action · Weekly hub · `⌘K` → Customer sync |
| 3 | **Phase Progress Stepper** | See discovery→handoff completion at a glance | Project → Overview tab |
| 4 | **Handoff Readiness Score** | Know if you're ready to leave the customer | Project → Overview tab |
| 5 | **Ontology Quick-Add** | Model object types without touching markdown | Project → Ontology tab |
| 6 | **Milestone Tracker** | Track M0–M5 with dates and sign-off | Project → Overview tab |
| 7 | **Clone Engagement** | Fork a prior engagement as starting point | Projects list → ⋮ menu on card |
| 8 | **Copy Customer Summary** | One-click plain-language status for Slack/email | Project → Overview → Copy summary |
| 9 | **Cadence Alerts** | Never miss standup or weekly review | Home dashboard banner |
| 10 | **Recent Activity** | Resume where you left off | Home dashboard sidebar |

Storage: phase checklists → `phase-checklist.json`; ontology → `ontology-objects.json`; milestones → `engagement.json`; customer syncs → `weekly/{project}/{date}-customer-sync.md`.

## Focus timer (Pomodoro)

| Feature | Details |
|---------|---------|
| **Where** | Sidebar → **Focus** · `⌘K` → "Start focus timer" |
| **Default durations** | 25 min focus · 5 min short break · 15 min long break (every 4 sessions) |
| **Full-screen** | Immersive mode with breathing gradients, progress ring, calm animations |
| **Minimize** | Esc or Minimize — timer keeps running; floating pill bottom-right |
| **Settings** | Gear icon — customize durations, auto-start, sound |
| **Logging** | Completed focus sessions stored in localStorage |

## Focus timer (Pomodoro)

| Feature | Details |
|---------|---------|
| **Where** | Sidebar → **Focus** · `⌘K` → "Start focus timer" |
| **Default durations** | 25 min focus · 5 min short break · 15 min long break (every 4 sessions) |
| **Full-screen** | Immersive mode with breathing gradients, progress ring, calm animations |
| **Minimize** | Esc or Minimize — timer keeps running; floating pill bottom-right |
| **Settings** | Gear icon — customize durations, auto-start, sound |
| **Logging** | Completed focus sessions stored in localStorage |
