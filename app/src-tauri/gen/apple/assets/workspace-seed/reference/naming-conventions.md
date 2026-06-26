# Naming Conventions

Consistent naming reduces confusion across engagements, especially during handoff.

---

## General rules

- **Customer vocabulary wins** for user-facing names (object display names, Workshop labels)
- **Technical names** use `kebab-case` for datasets/pipelines, `PascalCase` for object types, `camelCase` for properties
- **Prefix with engagement slug** for multi-tenant or shared enrollments: `acme-orders-backing`
- **Avoid abbreviations** unless the customer already uses them daily

---

## Datasets & pipelines

| Element | Convention | Example |
|---------|------------|---------|
| Raw dataset | `{slug}/raw/{source}` | `acme/raw/sap-orders` |
| Staging dataset | `{slug}/staging/{entity}` | `acme/staging/orders` |
| Ontology backing | `{slug}/ontology/{object-type}` | `acme/ontology/order` |
| Writeback dataset | `{slug}/writeback/{action}` | `acme/writeback/assign-owner` |
| Pipeline | `{slug}-{entity}-{verb}` | `acme-orders-sync` |
| Code repo | `{slug}-pipelines` | `acme-pipelines` |

---

## Ontology

| Element | Convention | Example |
|---------|------------|---------|
| Object type (API) | `PascalCase`, singular | `Order` |
| Link type | `{FromType}{Relationship}` | `OrderContainsLineItem` |
| Property | `camelCase` | `orderStatus` |
| Action type | Verb phrase, `PascalCase` | `ApproveOrder` |
| Interface | Adjective/noun | `Assignable` |
| Shared property | Platform standard or `{domain}{Property}` | `createdAt` |

---

## Workshop

| Element | Convention | Example |
|---------|------------|---------|
| Application | `{Customer} {Workflow}` | `Acme Order Management` |
| Module | `{Purpose}` (no jargon) | `Open Orders`, `Order Detail` |
| Variable | `camelCase`, descriptive | `selectedOrderId` |
| Object set variable | `{entity}Set` | `openOrdersSet` |

---

## Documentation

| Element | Convention | Example |
|---------|------------|---------|
| ADR | `adr-{NNN}-{short-title}.md` | `adr-001-incremental-sync.md` |
| Engagement folder | `{customer}-{year}-{short-name}` | `acme-2025-order-mgmt` |

---

## Foundry groups

| Pattern | Example |
|---------|---------|
| `{customer}-{role}` | `acme-operators`, `acme-pipeline-admins` |

---

## Git branches

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/{ticket}-{short-desc}` | `feat/ACME-42-order-sync` |
| Fix | `fix/{ticket}-{short-desc}` | `fix/ACME-51-null-status` |
| Release | `release/{version}` | `release/1.0.0` |
