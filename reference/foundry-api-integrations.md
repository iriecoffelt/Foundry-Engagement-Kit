# Foundry API Integrations Guide

Best APIs for each engagement phase, organized by use case. Use this reference when building integrations between your engagement workflows and Palantir Foundry.

---

## SDK Options

| SDK | Package | Use Case |
|-----|---------|----------|
| **TypeScript OSDK** | `@osdk/client`, `@osdk/oauth` | Frontend apps, React integration, type-safe ontology access |
| **Platform TypeScript** | `@osdk/foundry` | Direct platform API access without generated SDK |
| **Python SDK** | `foundry-platform-sdk` | Backend scripts, data pipelines, automation |
| **Java SDK** | Maven artifact | Enterprise Java applications |
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

### Data Source Inventory APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **List Datasets** | `GET /v2/datasets` | Inventory existing datasets in Foundry |
| **Get Dataset** | `GET /v2/datasets/{datasetRid}` | Get dataset metadata and schema |
| **List Sources** | Data Connection API | Enumerate configured data sources |
| **Get Schedules** | `GET /v2/datasets/{datasetRid}/getSchedules` | Check existing refresh schedules |

### Ontology Discovery APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **List Ontologies** | `GET /v2/ontologies` | Discover available ontologies |
| **Get Full Metadata** | `GET /v2/ontologies/{ontology}/fullMetadata` | Get complete ontology schema (objects, links, actions) |
| **List Object Types** | `GET /v2/ontologies/{ontology}/objectTypes` | Enumerate existing object types |
| **List Link Types** | `GET /v2/ontologies/{ontology}/linkTypes` | Discover existing relationships |
| **List Action Types** | `GET /v2/ontologies/{ontology}/actionTypes` | Review existing actions |

### User & Access Discovery

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Get Access Requirements** | `GET /v2/filesystem/resources/{resourceRid}/getAccessRequirements` | Understand security requirements |
| **List Resource Roles** | `GET /v2/filesystem/resources/{resourceRid}/roles` | Check current permissions |
| **List Organizations** | `GET /v2/filesystem/projects/{projectRid}/organizations` | Review organizational access |

---

## Phase 1: Scoping

### Project & Filesystem APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Create Project** | `POST /v2/filesystem/projects/create` | Provision Foundry project for engagement |
| **Create Folder** | `POST /v2/filesystem/folders` | Structure project folders |
| **Get Resource by Path** | `GET /v2/filesystem/resources/getByPath` | Locate resources by path |
| **Add Organizations** | `POST /v2/filesystem/projects/{projectRid}/addOrganizations` | Configure project access |

### Dataset Planning APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Create Dataset** | `POST /v2/datasets` | Provision placeholder datasets |
| **Get Dataset Schema** | `GET /v2/datasets/{datasetRid}/schema` | Review source schemas |
| **Read Table Sample** | `GET /v2/datasets/{datasetRid}/readTable` | Preview source data |

---

## Phase 2: Design

### Ontology Design APIs (Read-Only)

> **Note:** As of 2026, ontology schema creation (object types, link types, action types) must be done in Ontology Manager UI. Read APIs help validate and document designs.

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Get Object Type** | `GET /v2/ontologies/{ontology}/objectTypes/{objectType}` | Document object type details |
| **Get Link Type** | `GET /v2/ontologies/{ontology}/linkTypes/{linkType}` | Document link specifications |
| **Get Action Type** | `GET /v2/ontologies/{ontology}/actionTypes/{actionType}` | Document action configurations |
| **Get Interface Type** | `GET /v2/ontologies/{ontology}/interfaceTypes/{interfaceType}` | Document interfaces |
| **Load Metadata** | `POST /v2/ontologies/{ontology}/metadata` | Bulk fetch specific type definitions |

### Dataset Design APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Create Branch** | `POST /v2/datasets/{datasetRid}/branches` | Create dev/staging branches |
| **Get Branch** | `GET /v2/datasets/{datasetRid}/branches/{branchId}` | Check branch status |
| **List Files** | `GET /v2/datasets/{datasetRid}/files` | Review dataset structure |

### Webhook Design APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Data Connection REST Source** | Data Connection API | Configure external API connections |
| **Create Webhook** | Data Connection UI + API | Define outbound webhooks |
| **Outbound Application** | OAuth 2.0 config | Configure OAuth for webhooks |

---

## Phase 3: Build

### Object Operations APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Search Objects** | `POST /v2/ontologies/{ontology}/objects/{objectType}/search` | Query objects with filters |
| **Get Object** | `GET /v2/ontologies/{ontology}/objects/{objectType}/{primaryKey}` | Fetch specific object |
| **List Objects** | `GET /v2/ontologies/{ontology}/objects/{objectType}` | Paginated object listing |
| **Aggregate Objects** | `POST /v2/ontologies/{ontology}/objects/{objectType}/aggregate` | Compute aggregations |
| **Count Objects** | `POST /v2/ontologies/{ontology}/objects/{objectType}/count` | Get object counts |

### Action Execution APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Apply Action** | `POST /v2/ontologies/{ontology}/actions/{actionType}/apply` | Execute ontology actions |
| **Validate Action** | `POST /v2/ontologies/{ontology}/actions/{actionType}/validate` | Pre-validate action parameters |
| **Apply Batch Action** | `POST /v2/ontologies/{ontology}/actions/{actionType}/applyBatch` | Bulk action execution |

### Function Execution APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Execute Query** | `POST /v2/ontologies/{ontology}/queries/{queryApiName}/execute` | Run ontology functions |
| **List Query Types** | `GET /v2/ontologies/{ontology}/queryTypes` | Discover available functions |

### Dataset Operations APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Upload File** | `POST /v2/datasets/{datasetRid}/files:upload` | Upload data files |
| **Create Transaction** | `POST /v2/datasets/{datasetRid}/transactions` | Start data transaction |
| **Commit Transaction** | `POST /v2/datasets/{datasetRid}/transactions/{transactionRid}/commit` | Commit changes |
| **Read Table** | `GET /v2/datasets/{datasetRid}/readTable` | Read dataset content |

### Pipeline APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Create Schedule** | `POST /v2/orchestration/schedules` | Schedule pipeline builds |
| **Trigger Build** | `POST /v2/orchestration/builds` | Manual build trigger |
| **Get Build Status** | `GET /v2/orchestration/builds/{buildRid}` | Check build progress |

### External Functions APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Call Webhook** | External Functions in code | Execute webhooks from Functions |
| **Writeback Webhook** | Action side effect | Write to external systems |
| **Side Effect Webhook** | Action notification | Non-blocking external calls |

---

## Phase 4: Deploy

### Health Check APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Create Check** | `POST /v2/dataHealth/checks` | Configure health checks |
| **Get Check** | `GET /v2/dataHealth/checks/{checkRid}` | Review check configuration |
| **Get Health Reports** | `GET /v2/datasets/{datasetRid}/getHealthCheckReports` | Get dataset health status |
| **Get Latest Report** | `GET /v2/dataHealth/checks/{checkRid}/checkReports/getLatest` | Latest check result |
| **Replace Check** | `PUT /v2/dataHealth/checks/{checkRid}` | Update check configuration |

### Schedule Management APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Get Schedules** | `GET /v2/datasets/{datasetRid}/getSchedules` | List dataset schedules |
| **Update Schedule** | `PUT /v2/orchestration/schedules/{scheduleRid}` | Modify schedule |
| **Pause Schedule** | Schedule API | Pause pipeline runs |
| **Resume Schedule** | Schedule API | Resume pipeline runs |

### Permissions APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Add Roles** | `POST /v2/filesystem/resources/{resourceRid}/roles/add` | Grant access |
| **Remove Roles** | `POST /v2/filesystem/resources/{resourceRid}/roles/remove` | Revoke access |
| **Add Markings** | `POST /v2/filesystem/resources/{resourceRid}/addMarkings` | Apply security markings |
| **Remove Markings** | `POST /v2/filesystem/resources/{resourceRid}/removeMarkings` | Remove markings |
| **List Roles** | `GET /v2/filesystem/resources/{resourceRid}/roles` | Audit permissions |

---

## Phase 5: Handoff

### Documentation & Audit APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Get Full Metadata** | `GET /v2/ontologies/{ontology}/fullMetadata` | Export complete ontology spec |
| **List Object Types** | `GET /v2/ontologies/{ontology}/objectTypes` | Generate ontology inventory |
| **Get Health Checks** | `GET /v2/datasets/{datasetRid}/getHealthChecks` | Document monitoring setup |
| **Get Schedules** | `GET /v2/datasets/{datasetRid}/getSchedules` | Document automation |
| **Audit Logs** | Audit API | Export activity history |

### Knowledge Transfer APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Export Dataset** | `GET /v2/datasets/{datasetRid}/readTable` | Export data samples |
| **List Resources** | `GET /v2/filesystem/folders/{folderRid}/children` | Generate resource inventory |
| **Get Resource** | `GET /v2/filesystem/resources/{resourceRid}` | Get resource metadata |

---

## AIP Integration APIs

### AIP Chatbot (Agent) APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Create Session** | `POST /v2/aipAgents/agents/{agentRid}/sessions` | Start chatbot conversation |
| **Blocking Continue** | `POST /v2/aipAgents/agents/{agentRid}/sessions/{sessionRid}/blockingContinue` | Send message, get response |
| **Streaming Continue** | `POST /v2/aipAgents/agents/{agentRid}/sessions/{sessionRid}/streamingContinue` | Stream response |
| **Get RAG Context** | `PUT /v2/aipAgents/agents/{agentRid}/sessions/{sessionRid}/ragContext` | Get relevant context |
| **List Sessions** | `GET /v2/aipAgents/agents/{agentRid}/sessions` | List conversation sessions |
| **Get Agent** | `GET /v2/aipAgents/agents/{agentRid}` | Get agent configuration |

### Use Cases by Phase

| Phase | AIP Use Case |
|-------|--------------|
| Discovery | Use chatbot to query existing ontology documentation |
| Design | Generate ontology design suggestions |
| Build | Code generation assistance for Functions |
| Deploy | Automated runbook generation |
| Handoff | Generate training materials |

---

## Supported LLMs (as of June 2026)

| Provider | Models |
|----------|--------|
| **xAI** | Grok-4, Grok 4.1 Fast |
| **OpenAI/Azure** | GPT-5.1, GPT-5.1 Codex, GPT-5, GPT-4.1, GPT-4o |
| **Anthropic** | Claude Opus 4.7, Claude Sonnet |
| **Google** | Gemini models |
| **Meta** | Llama models (Palantir-hosted) |

---

## Integration Patterns

### Pattern 1: Sync Engagement Data to Foundry

Sync stakeholder, milestone, and risk data from engagement.json to Foundry objects.

```typescript
// Pseudo-code for syncing engagement data
const engagement = await readEngagementJson(projectPath);
await client(Stakeholder).create({
  name: engagement.stakeholders[0].name,
  role: engagement.stakeholders[0].role,
  influence: engagement.stakeholders[0].influence
});
```

### Pattern 2: Pull Ontology Schema into App

Populate the Ontology tab with live data from Foundry.

```typescript
const objectTypes = await client.ontologies.ObjectType.list(ontologyRid);
const linkTypes = await client.ontologies.LinkType.list(ontologyRid);
// Map to app's OntologyElement format
```

### Pattern 3: Link Architecture Nodes to Foundry Resources

Store Foundry RIDs in architecture.json nodes for deep linking.

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

### Pattern 4: Monitor Pipeline Health in Dashboard

Display real-time health status for engagement pipelines.

```typescript
const healthReports = await client.datasets.Dataset.getHealthCheckReports(datasetRid);
// Display status badges in delivery board
```

### Pattern 5: Trigger Actions from Delivery Board

Execute Foundry actions when delivery cards change status.

```typescript
await client(UpdateDeliveryStatus).apply({
  deliveryId: card.resourceId,
  newStatus: "deployed"
});
```

---

## Authentication Best Practices

1. **Development:** Use personal access tokens for local testing
2. **Production apps:** Use OAuth 2.0 client credentials flow
3. **User-facing apps:** Use OAuth 2.0 authorization code flow with PKCE
4. **Service accounts:** Use confidential OAuth clients

### Token Scopes

| Scope | APIs |
|-------|------|
| `api:ontologies-read` | Read ontology objects, types |
| `api:ontologies-write` | Execute actions |
| `api:datasets-read` | Read dataset content |
| `api:datasets-write` | Upload/modify datasets |
| `api:filesystem-read` | Read project structure |
| `api:filesystem-write` | Modify permissions |
| `api:aip-agents-read` | Query AIP chatbots |
| `api:aip-agents-write` | Create sessions, send messages |

---

## Rate Limits & Best Practices

- Default rate limit: ~100 requests/second per token
- Use pagination for large result sets
- Implement exponential backoff for retries
- Cache ontology metadata (changes infrequently)
- Batch operations where possible (applyBatch)
- Use streaming for AIP chatbot responses

---

## Related References

- [Ontology Design Guide](ontology-design-guide.md)
- [Pipeline Patterns](pipeline-patterns.md)
- [Workshop Module Map](workshop-module-map.md)
- [Naming Conventions](naming-conventions.md)
