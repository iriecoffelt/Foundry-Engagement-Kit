# Foundry API Integrations Guide

Safe APIs for FDEs working in customer Foundry environments. These APIs expose **metadata only** — no customer business data leaves the Foundry boundary.

---

## SDK Options

| SDK | Package | Use Case |
|-----|---------|----------|
| **TypeScript OSDK** | `@osdk/client`, `@osdk/oauth` | Frontend apps, type-safe ontology metadata access |
| **Platform TypeScript** | `@osdk/foundry` | Direct platform API access |
| **Python SDK** | `foundry-platform-sdk` | Backend scripts, automation |
| **REST API** | Direct HTTP | Any language, custom integrations |

### Quick Setup (TypeScript)

```typescript
import { createClient } from "@osdk/client";
import { createPublicOauthClient } from "@osdk/oauth";

const auth = createPublicOauthClient(clientId, foundryUrl, redirectUrl);
const client = createClient(foundryUrl, ontologyRid, auth);
```

---

## Phase 0: Discovery

### Ontology Schema Discovery

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **List Ontologies** | `GET /v2/ontologies` | Ontology names and RIDs |
| **Get Full Metadata** | `GET /v2/ontologies/{ontology}/fullMetadata` | Complete schema (types, links, actions) — no object instances |
| **List Object Types** | `GET /v2/ontologies/{ontology}/objectTypes` | Object type definitions, properties, primary keys |
| **List Link Types** | `GET /v2/ontologies/{ontology}/linkTypes` | Relationship definitions |
| **List Action Types** | `GET /v2/ontologies/{ontology}/actionTypes` | Action configurations |
| **List Interface Types** | `GET /v2/ontologies/{ontology}/interfaceTypes` | Interface definitions |
| **List Query Types** | `GET /v2/ontologies/{ontology}/queryTypes` | Function signatures |

### Project Structure Discovery

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **Get Resource** | `GET /v2/filesystem/resources/{resourceRid}` | Resource name, type, path |
| **Get Resource by Path** | `GET /v2/filesystem/resources/getByPath` | Resource metadata by path |
| **List Folder Children** | `GET /v2/filesystem/folders/{folderRid}/children` | Folder contents (names, types) |
| **Get Project** | `GET /v2/filesystem/projects/{projectRid}` | Project metadata |

---

## Phase 1: Scoping

### Dataset Metadata (Schema Only)

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **Get Dataset** | `GET /v2/datasets/{datasetRid}` | Dataset name, RID, branch info — no data |
| **Get Schema** | `GET /v2/datasets/{datasetRid}/schema` | Column names and types — no row data |
| **List Branches** | `GET /v2/datasets/{datasetRid}/branches` | Branch names |

### Schedule Discovery

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **Get Schedules** | `GET /v2/datasets/{datasetRid}/getSchedules` | Schedule RIDs targeting a dataset |

---

## Phase 2: Design

### Ontology Type Details

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **Get Object Type** | `GET /v2/ontologies/{ontology}/objectTypes/{objectType}` | Full type definition (properties, icons, backing datasets) |
| **Get Link Type** | `GET /v2/ontologies/{ontology}/linkTypes/{linkType}` | Link cardinality, endpoints |
| **Get Action Type** | `GET /v2/ontologies/{ontology}/actionTypes/{actionType}` | Parameters, rules, side effects |
| **Get Interface Type** | `GET /v2/ontologies/{ontology}/interfaceTypes/{interfaceType}` | Shared properties |
| **Load Metadata** | `POST /v2/ontologies/{ontology}/metadata` | Bulk fetch specific type definitions |

---

## Phase 3: Build

### Health Check Status

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **Get Health Checks** | `GET /v2/datasets/{datasetRid}/getHealthChecks` | Check RIDs configured on dataset |
| **Get Health Reports** | `GET /v2/datasets/{datasetRid}/getHealthCheckReports` | Pass/fail status per check — no data content |
| **Get Check** | `GET /v2/dataHealth/checks/{checkRid}` | Check configuration |
| **Get Latest Report** | `GET /v2/dataHealth/checks/{checkRid}/checkReports/getLatest` | Latest status |

### Build Status

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **Get Build Status** | `GET /v2/orchestration/builds/{buildRid}` | Build state, duration, success/failure |

---

## Phase 4: Deploy

### Pipeline Monitoring

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **Get Schedules** | `GET /v2/datasets/{datasetRid}/getSchedules` | Schedule configurations |
| **Get Health Reports** | `GET /v2/datasets/{datasetRid}/getHealthCheckReports` | Current health status |

### Permission Documentation (Read-Only)

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **List Roles** | `GET /v2/filesystem/resources/{resourceRid}/roles` | Who has access (for documentation) |
| **Get Access Requirements** | `GET /v2/filesystem/resources/{resourceRid}/getAccessRequirements` | Required orgs/markings |
| **List Organizations** | `GET /v2/filesystem/projects/{projectRid}/organizations` | Org associations |

---

## Phase 5: Handoff

### Documentation Export

| API | Endpoint | What It Returns |
|-----|----------|-----------------|
| **Get Full Metadata** | `GET /v2/ontologies/{ontology}/fullMetadata` | Complete ontology schema for documentation |
| **List Object Types** | `GET /v2/ontologies/{ontology}/objectTypes` | Object inventory |
| **Get Health Checks** | `GET /v2/datasets/{datasetRid}/getHealthChecks` | Monitoring configuration |
| **Get Schedules** | `GET /v2/datasets/{datasetRid}/getSchedules` | Automation setup |
| **List Folder Children** | `GET /v2/filesystem/folders/{folderRid}/children` | Project structure |

---

## What These APIs Do NOT Include

The following are intentionally excluded — they expose customer business data or require elevated privileges:

| Excluded | Reason |
|----------|--------|
| Object search/list/get | Returns actual customer data |
| `readTable` / dataset export | Pulls row-level data out of Foundry |
| Action execution | Modifies customer data |
| Audit logs | Sensitive access patterns |
| Permission modifications | Customer admin domain |
| User/group management | Customer admin domain |
| AIP with customer context | Data flows to LLM providers |

**Rule of thumb:** If it returns business entities (customers, orders, cases, etc.) or modifies data, don't use it from external tools.

---

## Integration Patterns for the Engagement Kit

### Pattern 1: Populate Ontology Tab from Foundry Schema

Pull object type and link type definitions to auto-fill the design documentation.

```typescript
const objectTypes = await client.ontologies.ObjectType.list(ontologyRid);
// Returns: { apiName, displayName, primaryKey, properties: [...] }
// Does NOT return: actual object instances
```

### Pattern 2: Link Architecture Nodes to Foundry Resources

Store Foundry RIDs in architecture.json for reference links (opens in browser).

```json
{
  "nodes": [{
    "id": "node-1",
    "type": "objectType",
    "data": {
      "label": "Customer",
      "foundryLink": "ri.ontology.main.object-type.abc123"
    }
  }]
}
```

### Pattern 3: Display Pipeline Health Status

Show pass/fail badges for engagement pipelines without exposing data.

```typescript
const healthReports = await client.datasets.Dataset.getHealthCheckReports(datasetRid);
// Returns: [{ checkRid, status: "PASSING" | "FAILING", ... }]
// Does NOT return: the actual data being checked
```

### Pattern 4: Generate Project Structure Documentation

List resources for handoff documentation.

```typescript
const children = await client.filesystem.Folder.children(folderRid);
// Returns: [{ rid, name, type: "dataset" | "folder" | ... }]
// Does NOT return: dataset contents
```

---

## Authentication

| Method | Use Case | Notes |
|--------|----------|-------|
| **Personal Access Token** | Development, testing | Your permissions, short-lived |
| **Public OAuth** | Desktop app integration | User grants access, scoped |

### Required Scopes (Minimal)

```
api:ontologies-read      # Schema metadata
api:filesystem-read      # Project structure
api:datasets-read        # Dataset metadata (not content)
api:orchestration-read   # Build/schedule status
api:data-health-read     # Health check status
```

---

## Best Practices for FDEs

1. **Never sync customer data to local tools** — metadata only
2. **Use read-only scopes** — don't request write permissions you don't need
3. **Document what you access** — customer security teams may review
4. **Prefer in-Foundry tools** — Workshop, Slate, Notepad for anything involving data
5. **Ask before automating** — get customer approval for any API integrations

---

## Related References

- [Ontology Design Guide](ontology-design-guide.md)
- [Pipeline Patterns](pipeline-patterns.md)
- [Workshop Module Map](workshop-module-map.md)
- [Naming Conventions](naming-conventions.md)
