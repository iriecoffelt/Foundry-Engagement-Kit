# Build Tracker — {{ENGAGEMENT_NAME}}

**Goal:** Implement ontology, pipelines, and applications per approved design.

**Done when:** All UAT scenarios pass in staging; documentation updated.

---

## Implementation status

| Component | Design ref | Resource / RID | Owner | Status | Notes |
|-----------|------------|----------------|-------|--------|-------|
| Object type: {{}} | ontology-design.md | | | Not started / WIP / Done | |
| Pipeline: {{}} | pipeline-design.md | | | | |
| Workshop module: {{}} | workshop-spec.md | | | | |
| Function: {{}} | ontology-design.md | | | | |

## Build order (recommended)

1. **Data layer** — source sync, staging datasets, data quality checks
2. **Ontology backing** — datasets wired to object/link types
3. **Actions & Functions** — writeback paths, business logic
4. **Workshop** — modules wired to ontology, permissions applied
5. **Polish** — empty states, error handling, performance tuning

## Code repository conventions

| Repo | Branch strategy | Review required |
|------|-----------------|-----------------|
| `{{engagement}}-pipelines` | `main` + feature branches | Yes |
| `{{engagement}}-functions` | `main` + feature branches | Yes |

## Testing checklist

### Pipelines

- [ ] Unit tests for transform logic
- [ ] Integration test on sample data
- [ ] Schedule runs successfully in dev
- [ ] Data quality checks fire correctly on bad data
- [ ] Backfill tested (if applicable)

### Ontology

- [ ] Object types render with correct properties
- [ ] Links resolve correctly
- [ ] Actions submit and write back as expected
- [ ] Permissions verified per role (positive and negative tests)

### Workshop

- [ ] All UAT scenarios from workshop-spec.md pass
- [ ] Empty states handled gracefully
- [ ] Performance acceptable at expected data volume
- [ ] Mobile / browser requirements met (if any)

## Known issues / deferrals

| Issue | Severity | Workaround | Target fix |
|-------|----------|------------|------------|
| | P0 / P1 / P2 | | |

## Dev → staging promotion log

| Date | Components promoted | Promoted by | Notes |
|------|---------------------|-------------|-------|
| | | | |
