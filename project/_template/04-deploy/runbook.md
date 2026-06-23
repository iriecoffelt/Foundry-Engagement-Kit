# Runbook — {{ENGAGEMENT_NAME}}

**Last updated:** {{DATE}}
**On-call / support contact:** {{CONTACT}}

---

## System overview

> Two sentences: what this system does and who uses it.

| Component | Resource / RID | Owner |
|-----------|----------------|-------|
| Workshop app | | Customer |
| Primary pipeline | | |
| Ontology | | |

## Normal operations

### Pipeline schedules

| Pipeline | Schedule (UTC) | Expected duration | Alert if |
|----------|----------------|-------------------|----------|
| | | | Fails or > 2x normal duration |

### Expected data volumes

| Dataset | Typical row count | Growth rate |
|---------|-------------------|-------------|
| | | |

## Common tasks

### Re-run a failed pipeline

1. Navigate to Pipeline Builder → {{pipeline}}
2. Check error logs in run history
3. If transient: click "Run"
4. If data issue: see troubleshooting below

### Add a new user

1. Add user to SSO group `{{group-name}}`
2. Verify Workshop app access within 15 minutes
3. If no access: check ontology object permissions

### Onboard a new data source

1. See pipeline-design.md section {{}}
2. Contact: {{data owner}}

## Troubleshooting

| Symptom | Likely cause | Resolution | Escalate to |
|---------|--------------|------------|-------------|
| App shows empty list | Pipeline failed / permissions | Check pipeline run; verify group membership | |
| Action submission fails | Writeback dataset issue | Check action logs; verify writeback dataset schema | |
| Stale data | Schedule paused / source delay | Check schedule; verify upstream source | |

## Escalation

| Severity | Definition | Response time | Contact |
|----------|------------|---------------|---------|
| P0 | Production down, no workaround | 4 hours | |
| P1 | Degraded, workaround exists | 1 business day | |
| P2 | Minor issue | Next sprint | |

## Change management

- Ontology changes require approval from: {{name}}
- Production pipeline changes require: PR review + customer sign-off
- Workshop changes: {{process}}
