# ORB Residential Source Freshness and Local Policy Gap Audit

**Date:** 2026-06-28  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** ORB Residential source catalogue metadata only  
**Phase:** Readiness for governed ingestion and future source-backed answers

## Executive summary

This audit strengthens `data/orb_source_catalogue/catalogue.json` with freshness, review, source ownership, and local-policy gap metadata for all 113 catalogued sources across 52 workflow domains.

| Question | Answer |
|---|---|
| Full-text ingestion performed? | **No** |
| Documents scraped or downloaded? | **No** |
| Route behaviour changed? | **No** |
| Frontend / Voice / Dictate / Write / Communicate / Chat UI changed? | **No** |
| OS assistant routes touched? | **No** |
| NR-1 governance weakened? | **No** - NR-1 remains open |
| Public promise drafted or published? | **No** - public promise remains blocked |

## Freshness metadata added

Every source now carries:

- `last_verified_date`
- `review_frequency`
- `source_owner`
- `freshness_status`
- `update_check_required`
- `official_url`
- `publisher`
- `jurisdiction`
- `source_type`
- `statutory_status`
- `citation_authority`
- `should_cite`
- `quote_allowed_default`
- `requires_local_policy`
- `local_policy_gap_reason`
- `professional_judgement_boundary`
- `not_to_be_used_for`

## Freshness categories

| Category | Catalogue rule |
|---|---|
| `stable_legislation` | Stable source, but amendment/version awareness is still required before source-backed use. |
| `statutory_guidance_periodic_review` | Periodic publisher review and update awareness required. |
| `annual_or_live_guidance` | Annual/live publisher review; used for KCSIE, school guidance, ICO, and fast-moving practice guidance. |
| `inspection_framework_live_guidance` | Live Ofsted/inspection framework review; SCCIF is in this category. |
| `clinical_guidance_review_required` | NICE/clinical guidance requires periodic review and professional boundary. |
| `local_policy_required` | Local upload and local verification required before operational use or citation. |
| `third_sector_periodic_review` | Reflective/practice context only; not statutory. |
| `lived_experience_context` | Lived-experience context only; not statutory or determinative. |

## Local policy gap audit

The catalogue now identifies 21 local-policy-dependent areas, mapped onto 20 existing workflow domains. Each area defines:

- local document needed;
- what ORB can safely say without it;
- what ORB must not decide without it;
- escalation prompt;
- manager oversight prompt.

Covered areas:

Safeguarding procedures; LADO/allegations; missing from care protocols; behaviour management; restraint/restrictive practice; search/confiscation/CCTV/surveillance; medication; complaints; whistleblowing; fire/emergency evacuation; health and safety; transport/community activities; internet/device use; pocket money/possessions; family time/contact; risk assessment; business continuity; staff supervision; lone working; visitors/contractors; data protection/SARs.

## Citation and local-policy boundary

Provider/local-policy sources remain non-citable by default unless uploaded locally and verified:

- `statement_of_purpose_provider_document`
- `childrens_guide_provider_document`

Both retain `requires_local_policy: true`, `citation_authority: local_policy_required`, `should_cite: false`, and `quote_allowed_default: false`.

## Files in this audit

| File | Role |
|---|---|
| `data/orb_source_catalogue/catalogue.json` | Authoritative metadata-only source and workflow catalogue |
| `scripts/build_orb_source_catalogue.py` | Reproducible catalogue builder with freshness and local-policy metadata |
| `services/orb_residential_source_freshness_audit_service.py` | Read-only freshness/local-policy audit helpers |
| `tests/test_orb_residential_source_freshness_audit.py` | Non-invasive metadata guard tests |
| `docs/audits/orb-residential-source-freshness-local-policy-audit.md` | This report |

## Verification notes

- Source count checked: **113**.
- Sources with freshness metadata: **113**.
- Local-policy-required sources: **2**.
- Local-policy-dependent workflow domains: **20**.
- Local-policy gap audit areas: **21**.
- Missing freshness data: **none found**.
- Missing local policy boundaries: **none found**.

This remains a catalogue-readiness audit only. It does not ingest source text, scrape documents, alter routes, alter UI, change ORB Voice/Dictate/Write/Communicate/Chat, touch OS assistant routes, weaken NR-1, or draft the public promise.
