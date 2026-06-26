# Ontology Design Guide

Reusable principles for modeling in Foundry. Reference during discovery and design phases.

---

## When to create an object type

Create an object type when **all** of these are true:

- Users think of it as a distinct "thing" in their workflow
- It has a stable identity (primary key) over time
- It will be searched, filtered, or acted upon in an application
- Multiple properties or relationships belong together semantically

**Don't** create object types for:

- Pure lookup tables with no user-facing identity
- Denormalized report rows
- Temporary staging artifacts

---

## Object type design checklist

- [ ] **Name matches customer vocabulary** — use their noun, not your database table name
- [ ] **Title property is human-readable** — what appears in lists and search results
- [ ] **Primary key is stable** — survives renames and merges; document merge strategy
- [ ] **Shared properties** — reuse platform-wide definitions (e.g., `createdAt`, `owner`)
- [ ] **Backing dataset is documented** — one canonical dataset per object type when possible
- [ ] **Writeback path is explicit** — separate read vs write datasets if needed

---

## Link type patterns

| Pattern | When to use | Example |
|---------|-------------|---------|
| Foreign key link | Clear parent-child ownership | Order → OrderLine |
| Association link | Peer relationship | Employee ↔ Project |
| Hierarchical link | Tree structures | OrgUnit → OrgUnit |
| Temporal link | Relationship changes over time | Use link dataset with valid-from/to |

**Cardinality decisions:**

- Default to the simplest cardinality that matches reality
- N:N links always need a backing dataset
- Document cascade behavior on delete/archive

---

## Action type patterns

| Pattern | Use when | Example |
|---------|----------|---------|
| State transition | Object moves between statuses | Approve, Reject, Escalate |
| Create child | User spawns related object | Create Task on Case |
| Edit property | Controlled field update | Assign Owner |
| External side effect | Triggers webhook / notification | Send to ERP |

**Action design rules:**

- Submission criteria should be visible to users (not surprise failures)
- Validate in the action, not just in Workshop widgets
- Every writeback action needs an audit story

---

## Interface usage

Use interfaces when multiple object types share:

- A common set of properties users filter on
- The same action (e.g., "Assign Owner" on any `Assignable` type)
- Workshop modules that should work polymorphically

Avoid interfaces as a way to avoid proper modeling — if types aren't truly polymorphic, don't force it.

---

## Common anti-patterns

| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| God object | One type with 80 properties | Split by workflow or use links |
| Mirror of source system | Ontology matches ERP schema 1:1 | Model business concepts, not tables |
| Logic in Workshop only | Business rules hidden in widget config | Move to Functions / Actions |
| Duplicate properties | Same semantic field on 5 types, not shared | Create shared property |
| Premature granularity | 20 object types before validating one workflow | Start with core path, expand |

---

## Design review questions

Ask these in every ontology review:

1. Can an end user explain what this object type represents in one sentence?
2. Is there exactly one place where this property's value is authoritative?
3. Does every action correspond to a real business decision someone is accountable for?
4. Will this model survive a 10x increase in data volume?
5. Can the customer admin this without calling you?
