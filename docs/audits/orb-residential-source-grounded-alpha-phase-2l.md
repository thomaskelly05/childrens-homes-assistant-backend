# ORB Residential Founder-Only Source-Grounded Alpha — Phase 2l

**Date:** 2026-06-29  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** Founder/admin-only internal alpha for source-grounded assembly evaluation  
**Phase:** Phase 2l — not public live enablement

## Executive summary

This phase adds a tightly controlled founder/admin-only internal alpha path for evaluating source-grounded answer assembly. It does **not** enable public live source-grounded answers, does not create completed sign-off records, does not bypass NR-1 or public-promise controls, and does not call the LLM.

| Question | Answer |
|---|---|
| Public live source-grounded answers enabled? | **No** |
| Normal ORB chat behaviour changed? | **No** |
| Founder alpha enabled by default? | **No** — `ORB_SOURCE_GROUNDED_ALPHA_ENABLED=false` |
| LLM called in alpha path? | **No** — evaluation only |
| Phase 2j hard public block removed? | **No** |
| Named sign-off artefact created? | **No** |
| NR-1 weakened? | **No** |
| Public promise drafted/published? | **No** |

## Public vs founder-only alpha

| Mode | Source-grounded | LLM chunks | Citations to users | Access |
|---|---|---|---|---|
| Public/user-facing | Blocked | No | No | Everyone — unchanged |
| Founder internal alpha | Evaluation only | No | Internal refs only | Founder/admin + flag |

## Feature flags

| Env var | Default | Purpose |
|---|---|---|
| `ORB_SOURCE_GROUNDED_ALPHA_ENABLED` | `false` | Founder alpha master switch |
| `ORB_SOURCE_GROUNDED_ALPHA_ALLOWED_ROLES` | `founder,admin` | Role allowlist |
| `ORB_SOURCE_GROUNDED_PUBLIC_ENABLED` | `false` | Must remain false |

## Routes

| Method | Path | Auth |
|---|---|---|
| GET | `/orb/admin/source-grounded-alpha/status` | Authenticated (shows blocked access for others) |
| POST | `/orb/admin/source-grounded-alpha/evaluate` | Founder/admin + alpha flag |

Not wired into ORB chat, Voice, Dictate, Write, Communicate or standalone public flows.

## Artefacts

| File | Purpose |
|---|---|
| `services/orb_residential_source_grounded_alpha_service.py` | Alpha access control and evaluation |
| `routers/orb_source_grounded_alpha_routes.py` | Internal admin routes |
| `schemas/orb_source_grounded_alpha.py` | Request models |
| `tests/test_orb_residential_source_grounded_alpha_phase_2l.py` | Phase 2l tests |

## Future work

1. Optional governed LLM assembly behind alpha flag with capped verified chunks
2. Commit validated `named_source_signoffs.json` after human review
3. Separate explicit phase before any public live enablement
