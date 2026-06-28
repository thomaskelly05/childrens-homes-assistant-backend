# ORB Residential Governed Source Ingestion Preparation

**Date:** 2026-06-28  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** ORB Residential source ingestion preparation only  
**Phase:** Phase 1 — ingestion prep and tests

## Executive summary

This preparation layer defines how ORB Residential should move from metadata-only catalogue coverage to safe full-text retrieval and citation-backed answers. It does not ingest source text, scrape or download documents, wire live retrieval, change routes, alter frontend behaviour, change ORB Voice/Dictate/Write/Communicate/Chat UI, weaken NR-1, or draft the public promise.

| Question | Answer |
|---|---|
| Full-text ingestion performed? | **No** |
| Documents scraped or downloaded? | **No** |
| Runtime retrieval changed? | **No** |
| Route/frontend/OS assistant files changed? | **No** |
| NR-1 governance weakened? | **No** — NR-1 remains open |
| Public promise drafted or published? | **No** — public promise remains blocked |

## Ingestion eligibility

`services/orb_residential_governed_ingestion_prep_service.py` classifies all 113 catalogue sources from `data/orb_source_catalogue/catalogue.json`.

| Source category | Ingestion preparation status | Citation status |
|---|---|---|
| Legislation | Eligible for future full-text ingestion | Citation-eligible only after exact chunks or curated quote support |
| Statutory guidance | Eligible for future full-text ingestion | Citation-eligible only after section/paragraph-preserving chunks |
| Inspection framework | Eligible for future full-text ingestion | Citation-eligible for evidence framing, never grade prediction |
| Government practice guidance | Eligible for future full-text ingestion | Practice guidance only, not statutory certainty |
| Clinical guidance | Eligible for future full-text ingestion | Health-aware guidance only; clinical judgement stays with professionals |
| Data protection guidance | Eligible for future full-text ingestion | Records/privacy guidance only; legal/DPO judgement remains required |
| Professional guidance | Eligible for future full-text ingestion | Professional practice context, not statutory authority |
| Third-sector sources | Reflective-practice-only | Not statutory authority |
| Lived-experience sources | Reflective-practice-only | Not determinative authority |
| Provider/local policy | Local-policy-upload-required | Non-citable unless uploaded and verified locally |

Every source remains `metadata_only` in this PR.

## Tier 1 first ingestion sequence

1. `dfe_childrens_homes_regulations_guide` — Guide to the Children's Homes Regulations including the Quality Standards.
2. `childrens_homes_regulations_2015` — The Children's Homes (England) Regulations 2015.
3. `ofsted_sccif_childrens_homes` — SCCIF children's homes.

| Source | Official URL | Status | Why first | Chunking | Citation |
|---|---|---|---|---|---|
| Guide | `https://www.gov.uk/government/publications/childrens-homes-regulations-including-quality-standards-guide` | Statutory guidance | Links Quality Standards, regulation intent, recording and leadership expectations | Chunk by Quality Standard, section heading and paragraph | Exact citation only from ingested paragraphs |
| Regulations 2015 | `https://www.legislation.gov.uk/uksi/2015/541/contents` | Legislation | Legal spine for children's homes duties, Reg 40/44/45 and Quality Standards | Chunk by regulation number, title, schedule and sub-paragraph | Exact citation by regulation chunk or curated quote |
| SCCIF | `https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes` | Inspection framework | Organises evidence about children's experiences, protection and leadership | Chunk by judgement area and evaluation criteria | Cite evidence expectations only; never predict grades |

Freshness handling follows catalogue review metadata. Statutory guidance requires publisher review; legislation requires amendment-aware review; SCCIF requires live Ofsted framework review before inspection-facing use.

## Required chunk metadata

Future chunks must include:

`source_id`, `source_title`, `source_type`, `official_url`, `publisher`, `version`, `last_verified_date`, `section_heading`, `paragraph_reference`, `regulation_number`, `quality_standard`, `sccif_judgement_area`, `workflow_domains`, `citation_label`, `basis_type`, `quote_allowed`, `retrieval_priority`, `requires_local_policy`, `professional_judgement_boundary`, `not_to_be_used_for`.

## Citation policy

- Exact citation is allowed only when an exact ingested chunk supports it.
- Summary metadata must not be presented as exact citation.
- Local policy sources must not be cited unless uploaded and verified locally.
- Third-sector and lived-experience sources must not be cited as statutory authority.
- SCCIF references must not be used to predict grades.
- Regulations and Guide references must not be used to guarantee compliance.
- ORB must say when it does not have a reliable source.
- ORB must distinguish law, statutory guidance, inspection framework, practice guidance and local policy.

## Retrieval uncertainty policy

| Situation | ORB behaviour |
|---|---|
| No source matches | Do not invent citations; state no reliable source is available; give cautious general recording prompts only where safe. |
| Only metadata matches | Do not present catalogue metadata as exact source text; explain full text has not been ingested yet. |
| Only reflective-practice sources match | Use reflective wording only; prompt statutory/local policy review. |
| Local policy required but missing | State the local policy is required and unavailable; prompt manager/local policy review. |
| Legal/compliance judgement requested | Do not give legal certainty or guarantee compliance; distinguish law/guidance from judgement. |
| Safeguarding threshold decision requested | Do not decide threshold, referral route or outcome; prompt DSL/manager escalation. |
| Ofsted grade prediction requested | Refuse grade prediction; support evidence review against SCCIF areas only. |

## Workflow answer policy coverage

The preparation layer maps source-grounding expectations for: Daily recording; Incident recording; Physical intervention; Missing from care; Safeguarding concern; Allegation; Family time; Medication; Health; Education; SEND/disability/autism; Online safety; Search/confiscation/privacy/surveillance; Behaviour support; Reg 40 notification consideration; Reg 44 preparation; Reg 45 preparation; Inspection readiness; Case records / future reading; Local policy required workflows.

For each workflow, the service defines required source tier, when to cite, when not to cite, escalation prompt, manager oversight prompt, local policy dependency and answer boundary.

## Runtime wiring plan

| Phase | Scope | Runtime constraint |
|---|---|---|
| Phase 1 | Ingestion prep and tests | No runtime change |
| Phase 2a | Ingest Guide to Children's Homes Regulations | Governed retrieval only after tests |
| Phase 2b | Ingest Children's Homes Regulations 2015 with regulation index | Exact regulation citation tests required |
| Phase 2c | Ingest SCCIF children's homes with judgement-area tags | SCCIF retrieval must not predict grades |
| Phase 2d | Citation-backed retrieval | Exact citations only from exact chunks |
| Phase 2e | Workflow answer policy enforcement | Preserve professional judgement and escalation boundaries |
| Phase 2f | Voice/Dictate grounding parity | No UI behaviour change without separate governed PR |
| Phase 3 | Therapeutic language quality pass | Quality refinement after grounding is stable |

## Files in this prep layer

| File | Role |
|---|---|
| `services/orb_residential_governed_ingestion_prep_service.py` | Read-only policy helpers over catalogue metadata |
| `tests/test_orb_residential_governed_ingestion_prep.py` | Non-invasive guards for ingestion prep, citation honesty, uncertainty and workflow policy |
| `docs/audits/orb-residential-governed-source-ingestion-prep.md` | This report |

This PR prepares ingestion governance only. Full-text source retrieval remains a future governed phase.
