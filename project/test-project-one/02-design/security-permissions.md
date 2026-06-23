# Security & Permissions — {{ENGAGEMENT_NAME}}

---

## Data classification

| Dataset / Object type | Marking | PII? | Export restrictions |
|-----------------------|---------|------|---------------------|
| | | Yes / No | |

## Foundry groups & roles

| Group | Members | Purpose |
|-------|---------|---------|
| `{{customer}}-operators` | | Day-to-day app users |
| `{{customer}}-admins` | | Ontology / pipeline editors |
| `{{customer}}-viewers` | | Read-only stakeholders |

## Permission matrix

| Resource | Operators | Admins | Viewers | Notes |
|----------|-----------|--------|---------|-------|
| Workshop app | View + actions | Edit | View | |
| Ontology object types | Use | Edit | Discover | |
| Pipelines | — | Edit + run | — | |
| Raw source datasets | — | View | — | |

## Writeback & audit

- Writeback datasets:
- Audit log requirements:
- Who can approve action submissions:

## Network & integration

| Integration | Direction | Auth method | Egress required? |
|-------------|-----------|-------------|------------------|
| | Inbound / Outbound | OAuth / API key / mTLS | |

## Security review checklist

- [ ] Markings applied to all datasets
- [ ] Least-privilege groups provisioned
- [ ] No service user credentials in repo
- [ ] External egress documented and approved
- [ ] Customer security review completed
