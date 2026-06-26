# Pipeline Patterns

Common patterns for Foundry data pipelines. Pick the simplest pattern that meets freshness and scale requirements.

---

## Pattern selection

| Requirement | Recommended pattern |
|-------------|---------------------|
| Daily/hourly batch from files or DB | Batch transform → output dataset |
| Near-real-time events | Streaming pipeline |
| Query external DB without landing | Virtual Table (with caution on load) |
| Incremental loads | Watermark / CDC column pattern |
| Ontology backing | Terminal dataset → object type mapping |

---

## Standard layering

```
raw/          # As-landed from source, minimal transformation
staging/      # Cleaned, typed, deduplicated
mart/         # Business logic applied, analytics-ready
ontology/     # Final backing datasets for object/link types
```

**Rules:**

- Never mutate `raw/` — append-only or full replace with history
- Business logic belongs in `mart/` or `ontology/`, not `raw/`
- Each layer has explicit contracts (schema tests)

---

## Incremental load template

```python
# Pseudocode — adapt to your transforms framework
from transforms.api import transform, Input, Output

@transform(
    output=Output("/path/to/ontology/dataset"),
    raw=Input("/path/to/raw/dataset"),
    watermark=Input("/path/to/watermark/dataset"),
)
def incremental_sync(raw, watermark, output):
  last_run = watermark.read().collect()[0]["max_ts"]
  new_rows = raw.filter(raw.ts > last_run)
  output.write_dataframe(new_rows)
  # Update watermark in separate transform
```

Document:
- Watermark column and timezone
- Backfill procedure if watermark resets
- Late-arriving data handling

---

## Data quality framework

| Layer | Checks |
|-------|--------|
| Raw | Schema match, file arrived, row count > 0 |
| Staging | PK uniqueness, null rates, referential integrity |
| Ontology | Row count within bounds, required fields populated |

**On failure:** define per-check whether to halt, alert, or quarantine.

---

## Scheduling guidance

| Data characteristic | Typical schedule |
|--------------------|------------------|
| Daily business data | Once after source ETL completes |
| Operational metrics | Hourly or every 15 min |
| Reference/master data | Daily or on-change webhook |
| Event streams | Continuous |

Align schedules to **downstream consumer SLAs**, not just source availability.

---

## Performance checklist

- [ ] Partition large datasets appropriately
- [ ] Avoid collect() on large DataFrames in Python transforms
- [ ] Push filters close to source reads
- [ ] Use incremental patterns above full-refresh when possible
- [ ] Profile compute on representative data volume before go-live

---

## Documentation minimum

Every production pipeline should have in Compass or your pipeline-design.md:

- Owner and escalation contact
- Schedule and expected runtime
- Input/output datasets with schema version
- Business logic summary (not line-by-line code)
- Backfill / rerun instructions
