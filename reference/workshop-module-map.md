# Workshop Module Map

Quick reference for mapping user workflows to Workshop building blocks.

---

## Module type selection

| User need | Module type | Notes |
|-----------|-------------|-------|
| Browse & filter records | Object Table | Set default sort and key columns |
| Record detail page | Object View | Primary workspace module |
| Take action on record | Object View + Action button | Or embedded Action Form |
| Compare metrics | Chart / Metric Card | Wire to object set or function |
| Geographic context | Map | Geopoint property required |
| Multi-step wizard | Multiple modules + variables | Use app-level variables for state |
| Dashboard landing | Layout + Metric Cards | Keep under 7±2 key metrics |
| Search-first UX | Object Table with search prominent | Consider default filters |

---

## Variable scoping

| Scope | Use for | Example |
|-------|---------|---------|
| App | Cross-module state | `selectedCaseId`, `currentUserRole` |
| Module | Module-local UI state | Table pagination, expanded panel |
| Object set | Filtered collection | "My open tasks" |

**Rule:** If two modules need the same object, use an app variable — don't duplicate filters.

---

## Layout patterns

### Operator workflow (high volume)

```
┌─────────────────────────────────────┐
│  Object Table (filterable list)     │
├──────────────────┬──────────────────┤
│  Object View     │  Related objects │
│  (detail)        │  or timeline     │
└──────────────────┴──────────────────┘
```

### Manager dashboard

```
┌────────┬────────┬────────┐
│ Metric │ Metric │ Metric │
├────────┴────────┴────────┤
│  Chart (trend)           │
├──────────────────────────┤
│  Object Table (exceptions)│
└──────────────────────────┘
```

### Action-centric (low volume, high stakes)

```
┌─────────────────────────────────────┐
│  Object View (context)              │
├─────────────────────────────────────┤
│  Action Form (prominent CTA)        │
└─────────────────────────────────────┘
```

---

## UX checklist

- [ ] Default filters match primary persona's daily view
- [ ] Empty state explains what to do next (not just "no data")
- [ ] Loading states on slow object sets
- [ ] Action errors surface clearly with remediation hint
- [ ] Column headers use customer vocabulary
- [ ] Mobile requirements addressed (if any)

---

## When NOT to use Workshop

| Scenario | Better surface |
|----------|----------------|
| Static report for executives | Slate / Notepad |
| Ad-hoc analysis | Quiver |
| Document collaboration | Notepad |
| Complex multi-page app with custom UI | Foundry Frontend (OSDK) |
| LLM-powered workflow | AIP Agent / AIP Logic |

Document the choice in an ADR if Workshop was considered and rejected.
