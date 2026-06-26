# Go-Live Checklist — {{ENGAGEMENT_NAME}}

**Target go-live date:** {{DATE}}
**Rollback owner:** {{NAME}}

---

## Pre-flight (T-7 days)

- [ ] UAT sign-off documented
- [ ] Production datasets / ontology resources identified
- [ ] Permissions verified in production environment
- [ ] Pipeline schedules set for production cadence
- [ ] Monitoring & alerting configured
- [ ] Runbook reviewed by customer ops contact
- [ ] Rollback plan documented and agreed
- [ ] Customer comms drafted (launch announcement, training)

## Cutover plan (T-0)

| Step | Time | Action | Owner | Verified |
|------|------|--------|-------|----------|
| 1 | | Freeze non-critical changes | | ☐ |
| 2 | | Run final pipeline backfill | | ☐ |
| 3 | | Promote ontology changes | | ☐ |
| 4 | | Publish Workshop app to production | | ☐ |
| 5 | | Smoke test primary workflows | | ☐ |
| 6 | | Enable user access (groups) | | ☐ |
| 7 | | Send launch comms | | ☐ |

## Smoke tests (production)

| # | Scenario | Result | Tester | Time |
|---|----------|--------|--------|------|
| 1 | User can log in and see app | | | |
| 2 | Primary object list loads | | | |
| 3 | Core action submits successfully | | | |
| 4 | Pipeline schedule triggered | | | |

## Rollback plan

**Trigger conditions:**
- P0 bug blocking primary workflow
- Data integrity issue affecting > X% of records

**Rollback steps:**
1.
2.
3.

**Recovery time objective (RTO):**

## Post go-live (T+1 to T+7)

- [ ] Monitor pipeline runs daily
- [ ] Review user feedback channel
- [ ] Triage bugs (P0 within 4h, P1 within 24h)
- [ ] Daily standup with customer ops (if agreed)
- [ ] Hypercare period end date: {{DATE}}

## Go-live sign-off

| Name | Role | Date | Signature |
|------|------|------|-----------|
| | Customer sponsor | | |
| | FDE lead | | |
