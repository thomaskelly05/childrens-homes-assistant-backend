# IndiCare Intelligence Spine

First-version decision-support layer connecting child journey, safeguarding, chronology, Reg 44/45, workforce and Ofsted readiness surfaces.

## What was built

- `services/indicare_intelligence_spine_service.py` — central orchestrator
- `services/pattern_detection_service.py` — deterministic early-pattern detection
- `services/ofsted_judgement_simulation_service.py` — SCCIF evidence-strength simulation (no grades)
- `services/record_quality_intelligence_service.py` — supportive recording quality guidance
- `services/evidence_graph_intelligence_service.py` — evidence nodes and links
- `schemas/indicare_intelligence.py` — typed request/response models
- `routers/indicare_intelligence_routes.py` — API routes under `/intelligence`
- `frontend-next/app/intelligence-spine/page.tsx` — manager-facing overview (demo data until live wiring)

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/intelligence/health` | Service health and guardrails |
| POST | `/intelligence/spine` | Full spine response |
| POST | `/intelligence/patterns` | Pattern detection only |
| POST | `/intelligence/ofsted-simulation` | Evidence-strength simulation |
| POST | `/intelligence/record-quality` | Record quality reviews |
| POST | `/intelligence/evidence-graph` | Evidence graph |

All routes use `get_current_user` authentication.

## Safety guardrails

- Uses cautious language: records indicate, evidence suggests, review recommended, manager oversight required.
- Does not return Ofsted grades or safeguarding decisions.
- `decision_support_notice` on every spine response.
- Integrates `safe_payload` from `risk_intelligence_language` where applicable.
- Optional services (`regulatory_ontology_service`, `ofsted_document_readiness_service`) are wrapped in try/except fallbacks.

## Connections to existing services

- **Regulatory ontology** — summary embedded in spine `regulatory_ontology`
- **Ofsted document readiness** — embedded in `ofsted_readiness`
- **Child journey / chronology / governance** — consume via passed `records` and `context` until DB selectors are wired

## Next steps

1. Wire spine POST to live care-hub / chronology record selectors per home and child.
2. Add projection snapshot caching (see `governance_intelligence_routes` pattern).
3. Link frontend page to `/intelligence/spine` with session auth.
4. Extend evidence graph with database-backed `linked_record_ids`.

## Tests

Run:

```bash
source .venv/bin/activate
python -m pytest tests/test_indicare_intelligence_spine.py -q
```
