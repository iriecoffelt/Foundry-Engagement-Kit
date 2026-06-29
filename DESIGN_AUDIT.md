# Foundry Engagement Kit — Design Audit

**Audit Date:** June 2026  
**Perspective:** Forward Deployed Engineer (FDE) at Foxtrot services, Palantir Foundry  
**Scope:** Usability, Flow, Visuals, FDE-specific needs

---

## Executive Summary

The Foundry Engagement Kit is a well-architected desktop application designed specifically for FDEs managing Palantir Foundry engagements. The application demonstrates strong domain understanding and addresses real FDE pain points. The codebase shows thoughtful React/TypeScript patterns with Tauri for native desktop integration.

**Overall Assessment:** Strong foundation with room for targeted improvements

| Area | Score | Summary |
|------|-------|---------|
| Usability | 8/10 | Excellent wizard-driven workflows; minor discoverability gaps |
| Flow | 8.5/10 | Well-structured information hierarchy; clear task paths |
| Visuals | 7.5/10 | Modern dark theme; some contrast and spacing refinements needed |
| FDE Fit | 9/10 | Deeply aligned with FDE workflows; missing some integration points |

---

## 1. Usability Analysis

### Strengths

#### 1.1 Wizard-Driven Task Completion
The standup, weekly review, and customer sync wizards (`StandupWizard.tsx`, `WeeklyReviewWizard.tsx`, `CustomerSyncWizard.tsx`) follow a stepped approach that:
- Reduces cognitive load by breaking tasks into digestible steps
- Provides clear progress indicators
- Saves to consistent file locations automatically

```tsx
// Effective step structure in StandupWizard
const steps = [
  { label: "Project" },
  { label: "Yesterday" },
  { label: "Today" },
  { label: "Blockers" },
  { label: "Done" },
];
```

#### 1.2 Command Palette (`⌘K`)
The command palette is a power-user feature that FDEs will appreciate:
- Fast navigation between sections
- Project search with customer name context
- File search integration
- Keyboard-first workflow support

#### 1.3 Engagement-Centric Organization
The folder structure (`00-discovery` → `05-handoff`) maps directly to the FDE engagement lifecycle, reducing the friction of "where does this go?"

### Issues & Recommendations

#### 1.4 Discoverability of Secondary Actions
**Issue:** Many powerful features are hidden behind overflow menus (⋮) or require prior knowledge.

**Examples:**
- Clone engagement (hidden in project card menu)
- Copy customer summary (not immediately visible)
- Export PDF/DOCX capabilities

**Recommendation:** Add contextual hints for new users:
```tsx
// Suggestion: Add tooltip hints on first use
<Tooltip 
  content="Tip: Click ⋮ to clone this engagement"
  showOnce="clone-engagement-hint"
>
  <ProjectCard ... />
</Tooltip>
```

#### 1.5 Keyboard Shortcut Documentation
**Issue:** While `⌘K` is shown in the sidebar, other shortcuts (`⌘S`, `⌘[` for back navigation) are undocumented in-app.

**Recommendation:** Add a keyboard shortcuts modal accessible from Settings or Help menu:
- `⌘K` — Command palette
- `⌘S` — Save current document
- `⌘[` — Navigate back
- `Space` — Start/pause focus timer (when in focus mode)
- `Escape` — Close modals/panels

#### 1.6 Error State Handling
**Issue:** Error messages appear in banners but don't provide actionable recovery steps.

**Current pattern:**
```tsx
{error && (
  <div className="... text-red-300">
    <span>{error}</span>
    <button onClick={() => setError("")}>Dismiss</button>
  </div>
)}
```

**Recommendation:** Enhance with contextual recovery actions:
```tsx
<ErrorBanner 
  message={error}
  action={{ label: "Retry", onClick: refresh }}
  helpLink="/docs/troubleshooting"
/>
```

---

## 2. Flow Analysis

### Strengths

#### 2.1 Information Architecture
The navigation structure is well-organized around FDE mental models:

```
Work
├── Home (dashboard + quick actions)
├── Portfolio (cross-engagement health)
├── Projects (engagement workspaces)
├── Daily (standups)
└── Weekly (reviews + customer syncs)

Tools
├── Library (reference guides)
├── Search (workspace-wide)
└── Focus (pomodoro timer)
```

This mirrors how FDEs think: daily rhythms, weekly cadences, and project-centric deep work.

#### 2.2 Project Workspace Tab System
The project workspace tabs (`overview`, `delivery`, `register`, `uat`, `decisions`, `stakeholders`, `ontology`, `architecture`, `documents`, `library`, `users`) provide comprehensive coverage without overwhelming:

- **Overview** — high-level health (phase stepper, milestones, handoff readiness)
- **Delivery** — Kanban board for component tracking
- **Architecture** — Visual diagram with Foundry deep links

The tab history with `⌘[` back navigation is a thoughtful touch.

#### 2.3 Cadence Alert System
The `CadenceAlerts` component surfaces timely reminders:
- Missed standup detection
- Weekly review due dates
- Customer sync prep needs

This addresses a real FDE pain point: staying on rhythm across multiple engagements.

### Issues & Recommendations

#### 2.4 Deep Linking Between Related Views
**Issue:** Navigating from one concept to related data requires multiple clicks.

**Example:** When viewing a delivery card, there's no direct link to the associated architecture node, ADR, or ontology element.

**Recommendation:** Add bidirectional links:
```tsx
// In DeliveryCardDetail
{card.architectureNodeId && (
  <button onClick={() => navigateToArchitecture(card.architectureNodeId)}>
    View in Architecture →
  </button>
)}
{card.designRef && (
  <button onClick={() => openDoc(card.designRef)}>
    Open design doc →
  </button>
)}
```

#### 2.5 Onboarding Flow Completeness
**Issue:** The onboarding checklist covers workspace setup and first standup, but misses:
- Importing an existing engagement
- Configuring Foundry stack URL
- Setting up reference library customization

**Recommendation:** Extend onboarding to include optional "advanced setup" steps:
```tsx
const ADVANCED_STEPS = [
  { key: "foundryStackConfigured", label: "Connect to Foundry stack", hint: "Enable deep links to your Foundry instance" },
  { key: "customReferenceAdded", label: "Customize reference library", hint: "Add team-specific guides" },
];
```

#### 2.6 State Persistence on Navigation
**Issue:** Some transient state (e.g., selected delivery card, architecture node selection) is lost when navigating away and returning.

**Recommendation:** Persist UI state in localStorage or extend navigation state:
```tsx
// Example: remember last selected card in delivery board
useEffect(() => {
  const saved = localStorage.getItem(`delivery-selected-${projectPath}`);
  if (saved) setSelectedId(saved);
}, [projectPath]);
```

---

## 3. Visual Design Analysis

### Strengths

#### 3.1 Cohesive Design System
The application maintains visual consistency through well-defined CSS classes:
- `.card-kit` / `.card-kit-interactive` for containers
- `.nav-item` / `.nav-item-active` for navigation
- `.hub-layout` pattern for list+detail views
- Semantic color tokens (`--fg-primary`, `--surface-raised`, etc.)

#### 3.2 Dark Mode Optimized
The default dark theme is well-suited for long FDE work sessions:
- Low-contrast backgrounds reduce eye strain
- Brand blue accent (#1a82f5) provides clear affordances
- Gradients add depth without distraction

#### 3.3 Focus Timer Visual Polish
The focus timer demonstrates attention to detail:
- Animated background orbs create ambient atmosphere
- Progress ring with smooth transitions
- Session type color differentiation (blue for focus, green for breaks)

### Issues & Recommendations

#### 3.4 Text Contrast in Secondary States
**Issue:** Some text colors (`--fg-muted`, `--fg-faint`) may not meet WCAG AA contrast requirements, especially in the light theme.

**Current values:**
```css
--fg-muted: 100 116 139;  /* slate-500 */
--fg-faint: 71 85 105;    /* slate-600 */
```

**Recommendation:** Audit and adjust for 4.5:1 contrast ratio minimum:
```css
/* Light mode adjustments */
[data-color-mode="light"] {
  --fg-muted: 71 85 105;   /* darker for contrast */
  --fg-faint: 100 116 139;
}
```

#### 3.5 Touch Target Sizes
**Issue:** Some interactive elements are below the 44×44px recommended minimum for touch interfaces.

**Examples:**
- File tree items in documents view
- Delivery card remove button (13px icon)
- Tab segment items

**Recommendation:** Increase hit areas without changing visual size:
```css
.file-tree-item {
  @apply relative;
}
.file-tree-item::after {
  content: "";
  @apply absolute -inset-y-1 -inset-x-2;
}
```

#### 3.6 Visual Hierarchy in Dense Views
**Issue:** The delivery board and architecture editor can feel visually dense when populated.

**Recommendations:**
1. Add subtle separator lines between Kanban columns
2. Increase vertical spacing between delivery cards (currently `gap-2.5`)
3. Consider card grouping by owner or type when >10 cards exist

#### 3.7 Loading States
**Issue:** Loading states are minimal (`"Loading portfolio…"`, `"Saving…"`) without visual feedback.

**Recommendation:** Add skeleton loaders and spinners:
```tsx
function DeliveryBoardSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {DELIVERY_STATUSES.map((status) => (
        <div key={status} className="animate-pulse space-y-3 p-3">
          <div className="h-4 w-20 rounded bg-surface-elevated" />
          <div className="h-24 rounded bg-surface-elevated" />
          <div className="h-24 rounded bg-surface-elevated" />
        </div>
      ))}
    </div>
  );
}
```

---

## 4. FDE-Specific Considerations (Foxtrot Services / Palantir Foundry)

### Strengths

#### 4.1 Foundry-Native Terminology
The application speaks FDE language:
- Object types, datasets, pipelines, transforms
- Workshop, Quiver, Contour references
- RID-based resource linking
- Stack URL configuration for deep links

#### 4.2 Ontology-First Design Philosophy
The README principle "Ontology first, pipelines second" is reflected in the UI:
- Ontology tab before architecture
- Object type nodes prominent in architecture editor
- Ontology quick-add for rapid modeling

#### 4.3 Handoff-Centric Metrics
The handoff readiness score addresses a critical FDE concern: "Can the customer own this after I leave?"

Tracked items:
- Design phase completion
- Runbook existence
- Handoff document
- Reference material uploads

#### 4.4 ADR (Architecture Decision Record) Integration
The ADR wizard and decision index view support the "write decisions, not just code" principle essential for Foundry engagements.

### Gaps & Recommendations

#### 4.5 Foundry API Integration
**Gap:** The app is fully offline with no Foundry API integration.

**FDE Need:** Real-time visibility into:
- Pipeline health / sync status
- Object type row counts
- Action definitions and permissions
- Workshop app configurations

**Recommendation (Phase 2):** Add optional Foundry integration layer:
```typescript
// lib/foundryApi.ts
export async function fetchObjectTypeStats(stackUrl: string, objectTypeId: string): Promise<ObjectTypeStats> {
  // Use Foundry's REST API with OSDK token
  const response = await fetch(`${stackUrl}/api/v1/objectTypes/${objectTypeId}/stats`);
  return response.json();
}
```

This would enable:
- Architecture diagram nodes showing live row counts
- Pipeline status badges on delivery cards
- Automatic RID resolution from object type names

#### 4.6 Multi-FDE Collaboration
**Gap:** The workspace is single-user focused (local files, no sync).

**FDE Need:** Many engagements have multiple FDEs. Current workaround (Git sync) works but adds friction.

**Recommendations:**
1. Add `.gitignore` template for personal files (e.g., focus timer state)
2. Document recommended Git workflow in README
3. Consider future: CRDTs for real-time collaboration without server

#### 4.7 Customer Data Sensitivity
**Gap:** No explicit guidance on handling customer data vs. generic patterns.

**FDE Need:** Clear separation between:
- Reusable patterns (safe to share across engagements)
- Customer-specific configurations (must not leak)

**Recommendation:** Add data classification hints:
```tsx
<Field 
  label="Customer-specific configuration"
  classification="sensitive"
  hint="This data should not be copied to other engagements"
>
```

#### 4.8 Palantir Jira / Internal Tools
**Gap:** Export to Jira exists but no import from internal Palantir systems.

**FDE Need:** 
- Import blockers from Palantir's internal issue tracker
- Sync with Quartz (if applicable to Foxtrot)
- Calendar integration for customer sync prep

**Recommendation:** Create plugin architecture for internal tools:
```typescript
// plugins/palantir-jira/index.ts
export const PalantirJiraPlugin: EngagementPlugin = {
  name: "Palantir Jira",
  importBlockers: async (projectId) => { /* ... */ },
  exportDeliveryItems: async (items) => { /* ... */ },
};
```

#### 4.9 Workshop App Prototyping
**Gap:** Architecture editor shows Workshop as an endpoint but no prototyping support.

**FDE Need:** Many FDEs sketch Workshop layouts before building. Current workflow: external tools (Figma, paper).

**Recommendation (Future):** Add Workshop wireframe mode to architecture editor:
- Drag-and-drop widget placeholders
- Link to object types and actions
- Export as Workshop configuration starter

#### 4.10 Engagement Playbook Templates
**Gap:** Template is generic across all engagement types.

**FDE Need:** Different engagement patterns require different emphases:
- Greenfield (heavy discovery, ontology design)
- Migration (data mapping, parallel run validation)
- Enhancement (smaller scope, faster iterations)
- Training/enablement (workshop focus, documentation heavy)

**Recommendation:** Add engagement type selector in project wizard:
```tsx
<Field label="Engagement type">
  <SelectInput
    value={engagementType}
    onChange={setEngagementType}
    options={[
      { value: "greenfield", label: "Greenfield implementation" },
      { value: "migration", label: "Data migration" },
      { value: "enhancement", label: "Enhancement / add-on" },
      { value: "enablement", label: "Training & enablement" },
    ]}
  />
</Field>
```

Each type would pre-populate relevant checklist items and skip irrelevant phases.

---

## 5. Prioritized Action Items

### High Priority (Address in Next Release)

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 1 | Improve text contrast for WCAG compliance | Accessibility | Low |
| 2 | Add keyboard shortcuts modal | Discoverability | Low |
| 3 | Implement skeleton loaders for async views | Perceived performance | Medium |
| 4 | Add bidirectional links between delivery/architecture/docs | Flow efficiency | Medium |

### Medium Priority (Roadmap Items)

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 5 | Engagement type templates | FDE productivity | Medium |
| 6 | Persist UI state across navigation | UX polish | Low |
| 7 | Increase touch targets to 44px minimum | Accessibility | Low |
| 8 | Advanced onboarding steps | New user success | Low |

### Lower Priority (Future Considerations)

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 9 | Foundry API integration (optional) | Real-time visibility | High |
| 10 | Plugin architecture for internal tools | Enterprise adoption | High |
| 11 | Workshop wireframe mode | Design workflow | High |
| 12 | Multi-FDE collaboration (CRDTs) | Team workflows | Very High |

---

## 6. Summary

The Foundry Engagement Kit is a thoughtfully designed tool that demonstrates deep understanding of FDE workflows. The application successfully balances power-user features (command palette, keyboard shortcuts, deep linking) with approachable guided wizards.

**Key Strengths:**
- Engagement lifecycle maps directly to UI structure
- Wizard-driven daily/weekly cadences reduce friction
- Architecture editor with Foundry deep links bridges planning and execution
- Handoff readiness score quantifies exit criteria

**Primary Improvement Areas:**
- Accessibility refinements (contrast, touch targets)
- Enhanced discoverability of secondary features
- Deeper Foundry integration for live data visibility
- Engagement-type-specific templates

For an FDE at Foxtrot services, this tool would significantly improve:
1. Daily standup discipline across multiple engagements
2. Customer communication prep (sync wizard + summary export)
3. Handoff documentation completeness
4. Architecture decisions traceability

The offline-first, plain-files approach is both a strength (no vendor lock-in, works anywhere) and a limitation (no real-time Foundry visibility). Future iterations could add opt-in API integration while preserving the core offline capability.

---

*Audit conducted using static code analysis and component review. Recommend supplementing with user testing sessions with 3-5 active FDEs.*
