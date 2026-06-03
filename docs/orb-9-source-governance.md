# ORB 9 — Source governance (developer guide)

## Registry

- **File:** `assistant/knowledge/trusted_sources_registry.json`
- **Loader:** `services/trusted_source_registry_service.py`

Only `source_id` values in this file may be cited or summarised. `orb_source_citation_service` blocks unknown IDs for governed answers.

## Trust tiers

| Tier | Use |
|------|-----|
| gold | Statutory / Ofsted / legislation |
| silver | NICE and clinical |
| bronze | Sector learning |
| local | Uploaded LSCP / provider policy |
| user_provided | Session context only |

## Change control

1. `source_update_watcher_service.check_source()` — supply `fetched_content`; never scrapes automatically.
2. On hash change → `source_change_review_service.create_pending_review()`.
3. `auto_apply_allowed` is **always false** for statutory/safeguarding/medical/legal types.
4. Human approves via `approve(review_id)` before any knowledge JSON update.

## Wiring

```python
from services.trusted_source_registry_service import trusted_source_registry_service
from services.orb_source_citation_service import orb_source_citation_service

basis = orb_source_citation_service.build_citation_basis(
    ["working_together_safeguarding", "missing_from_care_guidance"]
)
```

## Tests

`tests/test_orb_9_expert_brain.py::test_trusted_registry_validates`
