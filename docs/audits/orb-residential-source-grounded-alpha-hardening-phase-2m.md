# ORB Residential Founder Alpha Hardening — Phase 2m

**Date:** 2026-06-29  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** Hardening for Phase 2l founder/admin internal source-grounded alpha  
**Phase:** Phase 2m — not public live enablement

## Executive summary

Phase 2m hardens the founder-only internal alpha path introduced in Phase 2l. It strips nested chunk text from API responses, audit-logs denied evaluate attempts, and adds an explicit test for `ORB_SOURCE_GROUNDED_PUBLIC_ENABLED=true` blocking.

| Question | Answer |
|---|---|
| Public live source-grounded answers enabled? | **No** |
| LLM called in alpha path? | **No** |
| Full chunk text exposed in alpha API responses? | **No** — refs only |
| Denied evaluate attempts audit logged? | **Yes** |
| Named sign-off artefact created? | **No** |
| NR-1 weakened? | **No** |
| Public promise drafted/published? | **No** |
| Normal ORB chat / Voice / Dictate / Write / Communicate changed? | **No** |

## Changes

| Change | Detail |
|---|---|
| Chunk text stripping | `assembly_evaluation` and nested `retrieval_bundle_preview` return source IDs, chunk IDs, citation labels and short refs only |
| Denied audit logging | Unauthenticated, staff, manager, founder/admin with alpha disabled, and public-enabled blocks are audit logged with `outcome=denied` |
| Public flag test | `ORB_SOURCE_GROUNDED_PUBLIC_ENABLED=true` blocks founder/admin evaluate even when alpha flag is true |

## Artefacts

| File | Purpose |
|---|---|
| `services/orb_residential_source_grounded_alpha_service.py` | API response sanitization |
| `routers/orb_source_grounded_alpha_routes.py` | Denied-attempt audit logging |
| `tests/test_orb_residential_source_grounded_alpha_phase_2m.py` | Phase 2m tests |

## Governance unchanged

- `ORB_SOURCE_GROUNDED_ALPHA_ENABLED=false` by default
- `ORB_SOURCE_GROUNDED_PUBLIC_ENABLED=false` by default
- Phase 2j hard public block remains active
- All sources remain unsigned; `named_source_signoffs.json` remains absent
- Guide / Regulations / SCCIF chunk content unchanged
