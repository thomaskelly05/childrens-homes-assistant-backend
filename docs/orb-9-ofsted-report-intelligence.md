# ORB 9 — Ofsted report intelligence

## Purpose

Learn **patterns** from public Ofsted children's home reports — not predict grades for a user's home.

## Services

| Service | Role |
|---------|------|
| `ofsted_report_registry_service` | Metadata store (URL, date, rating, hash) |
| `ofsted_report_ingestion_service` | Ingest text from official URLs only |
| `ofsted_report_analysis_service` | Themes, boilerplate vs findings |
| `ofsted_practice_pattern_service` | Anonymised practice/risk marker IDs |
| `ofsted_report_citation_service` | Citation payload for answers |
| `orb_ofsted_learning_adapter` | End-to-end learning packet |

## Safety rules

- Only `reports.ofsted.gov.uk` / `gov.uk` URLs accepted for ingestion.
- Never name children; never expose non-public detail.
- `human_approval_required: true` on learning packets.
- Do not claim a home will receive a grade.

## Practice markers (sample)

- child_voice_changes_plans
- leaders_know_home
- safeguarding_timely
- records_show_impact

## Risk markers (sample)

- missing_child_voice
- weak_manager_review
- restraint_no_debrief

## Example

```python
from services.orb_ofsted_learning_adapter import orb_ofsted_learning_adapter

packet = orb_ofsted_learning_adapter.learn_from_report_text(
    provider_name="Example Provider",
    report_url="https://reports.ofsted.gov.uk/provider/...",
    report_text="... public report text ...",
    rating="Good",
)
```
