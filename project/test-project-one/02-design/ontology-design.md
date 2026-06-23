# Ontology Design — {{ENGAGEMENT_NAME}}

**Version:** 0.1
**Last updated:** {{DATE}}
**Status:** Draft / In Review / Approved

---

## Design principles for this engagement

- [ ] Object types represent business nouns users already use
- [ ] Shared properties reused across types where semantics match
- [ ] Actions encode business decisions, not CRUD for its own sake
- [ ] Interfaces used for polymorphism, not as a shortcut around modeling
- [ ] Writeback paths are explicit and auditable

---

## Object types

### {{ObjectTypeName}}

| Attribute | Value |
|-----------|-------|
| Display name | |
| API name | |
| Primary key | |
| Title property | |
| Icon | |
| Backing dataset(s) | |
| Writeback dataset (if any) | |

**Properties:**

| Property | Type | Shared? | Source | Editable? | Notes |
|----------|------|---------|--------|-----------|-------|
| | String / Integer / ... | Yes / No | Pipeline / Action / Computed | | |

**Object permissions:**

| Group / Role | View | Edit | Discover |
|--------------|------|------|----------|
| | | | |

---

## Link types

| Link | From | To | Cardinality | Backing | Notes |
|------|------|----|-------------|---------|-------|
| | ObjectA | ObjectB | 1:1 / 1:N / N:N | Dataset / FK | |

---

## Action types

### {{ActionName}}

| Attribute | Value |
|-----------|-------|
| Applies to | {{ObjectType}} |
| Submission criteria | |
| Side effects | Writeback / Notification / Webhook |
| Permissions | |

**Form fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| | | | |

**Rules / side effects:**

1.

---

## Interfaces (if applicable)

| Interface | Implementing types | Purpose |
|-----------|-------------------|---------|
| | | |

---

## Functions on Objects

| Function | Input objects | Output | Used by |
|----------|---------------|--------|---------|
| | | | Workshop / Pipeline / Action |

---

## Ontology changelog

| Date | Change | Reason | ADR |
|------|--------|--------|-----|
| | | | |
