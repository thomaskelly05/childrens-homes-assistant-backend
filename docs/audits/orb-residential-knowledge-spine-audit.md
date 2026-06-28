# ORB Residential Knowledge Spine Audit

**Date:** 2026-06-28  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Scope:** Standalone ORB Residential only — **not** IndiCare OS  
**Phase:** 1 — mapping and gap analysis only (no ingestion, no route rewiring)

---

## Executive summary

ORB Residential has a **mature knowledge architecture** — trusted source registry, nine Quality Standards brain, SCCIF alignment, citation honesty, answer policy, and 40+ workflow domains. However, **none of the three required statutory "bible" documents are ingested as full text**. All three exist as **registry metadata + short summaries and/or curated quotes**.

| Question | Answer |
|----------|--------|
| Are the three core sources ingested as full text? | **No** |
| Can ORB cite them? | **Yes** — honestly, as summary or curated quote (`basis_type: summary`) |
| Does chunking exist? | **Partial** — infrastructure ready; seeds are 1-chunk summaries |
| Nine Quality Standards mapped? | **Yes** — `orb_quality_standards_brain.json` |
| SCCIF judgement areas mapped? | **Yes** — 3 areas in `sccif_alignment_registry_service.py` |
| Regulation mapping? | **Partial** — Regs 12, 13, 14, 40, 44, 45 + guide + SCCIF quotes |
| Answer policy exists? | **Yes** — operating brain + legal service + SCCIF disclaimer |
| Workflow-to-standard mapping? | **Yes** — gap audit (40 domains) + domain map (55 domains) + this audit's workflow table |

**NR-1:** Remains open.  
**Public promise:** Remains blocked.

---

## Required core sources — presence audit

### 1. Guide to the Children's Homes Regulations including the Quality Standards (v1.17)

| Field | Status |
|-------|--------|
| In registry | Yes — `dfe_childrens_homes_regulations_guide` |
| Official URL | Yes — PDF v1.17 in `sccif_alignment_registry_service.py` |
| Full text ingested | **No** — `full_text_allowed: false` |
| Summary seed | Yes — `data/orb_knowledge_seed/quality_standards_overview.md` (~3 paragraphs) |
| Chunked | 1 summary chunk in `orb_knowledge_library_cache.json` |
| Section headings preserved | **No** |
| Regulation numbers in chunks | **No** |
| Citable | Yes — summary basis; `quote_allowed: false` |

### 2. The Children's Homes (England) Regulations 2015 (SI 2015/541)

| Field | Status |
|-------|--------|
| In registry | Yes — `childrens_homes_regulations_2015` |
| Official URL | Yes — `legislation.gov.uk/uksi/2015/541` |
| Full text ingested | **No** |
| Summary seed | **No** — not in `SEED_FILE_MAP` |
| Curated quotes | Yes — Regs 12, 13, 14, 40, 44, 45 in `regulation_quote_registry.py` |
| Chunked | **No** |
| Citable | Yes — curated quotes with regulation URLs |

### 3. SCCIF children's homes

| Field | Status |
|-------|--------|
| In registry | Yes — `ofsted_sccif_childrens_homes` |
| Official URL | Yes — gov.uk SCCIF publication |
| Full text ingested | **No** |
| Summary seed | Yes — `data/orb_knowledge_seed/ofsted_sccif_overview.md` (~3 sentences) |
| Chunked | 1 summary chunk |
| SCCIF judgement descriptors | **No** — only high-level summary |
| Citable | Yes — summary basis |

---

## Audit questions — answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Three sources ingested anywhere? | Registry + summaries/quotes — **not full text** |
| 2 | Chunked for accurate retrieval? | Infrastructure yes; statutory docs **no** (1-chunk summaries) |
| 3 | Titles, version, sections, reg numbers preserved? | Titles/URLs yes; sections/regs in chunks **no** |
| 4 | Can ORB cite sources? | Yes — honest `basis_type`; no invented citations |
| 5 | Distinguishes law / guidance / inspection / ORB / policy? | **Yes** — source types in registry + citation decision service |
| 6 | Knows nine Quality Standards? | **Yes** — complete brain JSON |
| 7 | Maps answers to regulations? | **Partial** — 6 regs + mapper; not full SI |
| 8 | Maps to SCCIF judgement areas? | **Yes** — 3 areas + recording alignment |
| 9 | Says "follow local policy / escalate"? | **Yes** — operating brain hedging |
| 10 | Avoids compliance guarantees? | **Yes** — explicit must-not rules |
| 11 | Avoids safeguarding decisions? | **Yes** — must-not + escalation prompts |
| 12 | Supports professional judgement? | **Yes** — SCCIF disclaimer + operating brain |
| 13 | Child-centred, therapeutic, evidence-aware? | **Partial** — modules exist; therapeutic readiness 14.4% |
| 14 | Observation vs interpretation? | **Yes** — recording framework + safe_recording module |
| 15 | Avoids punitive wording? | **Yes** — gap audit: no shaming domains detected |
| 16 | Child voice central? | **Yes** — QS2 brain + child_voice_checks on record types |
| 17 | Reflective prompts when info missing? | **Yes** — "what am I missing" action + gap detection |
| 18 | Evidence gaps for managers? | **Yes** — manager oversight questions in QS brain |
| 19 | Reg 44 / Reg 45 support? | **Yes** — reg44_reg45 module + quote registry + modes |
| 20 | Safer life-story records? | **Yes** — recording framework + therapeutic language |

---

## ORB Residential surfaces audited (standalone only)

All routes use `orb_knowledge_retrieval_service.prepare_request_bundle` and/or convergence orchestrator knowledge vaults on generative paths:

| Surface | Knowledge spine attachment |
|---------|---------------------------|
| `/orb/standalone/conversation` (+ stream) | Full OKR bundle + source packs + QS brain |
| `/orb/residential/conversation` | Same via converged assistant |
| `/orb/standalone/brain-route` | Route map + vault metadata |
| `/orb/standalone/actions/run` | Action-specific + convergence vaults |
| `/orb/dictate/generate|finalise|edit` | Gateway → convergence vaults |
| `/orb/dictate/prepare-write` | Write brain context metadata |
| `/orb/voice/respond` (+ v2) | Tiered — specialist attaches packs |
| `/orb/communicate/converge|support-pack` | Convergence source chips |
| `/orb/standalone/documents/intelligence` | Document lens + brain metadata |
| `/orb/standalone/templates/{id}/generate` | Template + metadata |
| `/orb/standalone/shift-builder/generate` | Partial retrieval |
| `/orb/standalone/agents/run|deep-research` | RAG + source packs |

**Out of scope:** `/assistant/os/*`, `/assistant-api/*`, OS young-people/home/quality assistants.

---

## Nine Quality Standards map

Authoritative: `assistant/knowledge/orb_quality_standards_brain.json`  
Runtime: `services/orb_quality_standards_brain_service.py`

| ID | Standard | Regulation |
|----|----------|------------|
| qs1_quality_and_purpose | Quality and purpose of care | Reg 6 |
| qs2_child_voice | Children's views, wishes and feelings | Reg 7 |
| qs3_education | Education | Reg 8 |
| qs4_enjoyment_achievement | Enjoyment and achievement | Reg 9 |
| qs5_health_wellbeing | Health and well-being | Reg 10 |
| qs6_positive_relationships | Positive relationships | Reg 11 |
| qs7_protection | Protection of children | Reg 12 |
| qs8_leadership | Leadership and management | Reg 13 |
| qs9_care_planning | Care planning | Reg 14 |

Also mirrored in `services/sccif_alignment_registry_service.py` `QUALITY_STANDARDS`.

---

## SCCIF judgement areas

| ID | Title |
|----|-------|
| overall_experiences_progress | Overall experiences and progress of children |
| helped_and_protected | How well children are helped and protected |
| leadership_management | Effectiveness of leaders and managers |

Recording-type alignment in `RECORDING_TYPE_ALIGNMENT` (e.g. daily-note → experiences + QS purpose/voice).

---

## Source type distinction

| Type | Label | Citation rule |
|------|-------|---------------|
| legislation | Law / regulation | Regulation numbers; curated quotes unless full ingest |
| statutory_guidance | Statutory guidance | Guide; summary unless uploaded |
| inspection_framework | Ofsted SCCIF | Judgement areas; never predict grades |
| internal_practice | ORB practice guidance | Answer standard; not statutory |
| user_policy | Home/provider policy | Prompt to check; ORB does not override |

---

## Workflow domain knowledge map (sample)

Full machine-readable map: `services/orb_residential_knowledge_spine_audit_service.py`  
Extended coverage: `services/orb_knowledge_gap_audit_service.py` (40 domains), `assistant/knowledge/indicare_registered_home_domain_map.json` (55 domains)

| Domain | Quality Standards | Key regulations | SCCIF | Escalation |
|--------|-------------------|-----------------|-------|------------|
| Daily recording | QS1, QS2 | Reg 6, 7 | Experiences | Manager if safeguarding |
| Incident recording | QS7, QS2 | Reg 12, 40 | Helped & protected | DSL, Reg 40 review |
| Physical intervention | QS7 | Reg 12 | Helped & protected | Manager, restraint policy |
| Missing from care | QS7 | Reg 12, 40 | Helped & protected | Police per local policy |
| Safeguarding reflection | QS7 | Reg 12 | Helped & protected | DSL — no threshold alone |
| Reg 44 preparation | QS8 | Reg 44 | Leadership | Registered manager |
| Reg 45 preparation | QS8, QS9 | Reg 45 | Leadership | RM sign-off |
| Inspection readiness | QS1, QS8 | Reg 6, 13 | Experiences | Never predict grade |
| Supervision prep | QS8, QS6 | Reg 13 | Leadership | Line manager |
| Key-work prep | QS2, QS9 | Reg 7, 14 | Experiences | Social worker if drift |

---

## Proposed source spine design (smallest safe path)

Existing infrastructure can be extended — **no new brain required**.

### 1. Source registry

Extend `trusted_sources_registry.json` with per-document: `sections`, `regulation_numbers`, `quality_standard_ids`, `sccif_judgement`, `version`, `last_checked`.

### 2. Chunking

Use `orb_document_ingestion_service` (4000 char target, 900 overlap) to ingest:
1. Guide v1.17 PDF
2. SI 2015/541 (legislation.gov.uk export)
3. SCCIF publication

Preserve: section title, paragraph number, regulation number, QS, SCCIF area, page, `citation_anchor`.

### 3. Retrieval

Extend `orb_knowledge_retrieval_service` with:
- `regulation_lookup(reg_number)` → chunks or quote registry
- `quality_standard_lookup(qs_id)` → brain JSON + Guide chunks
- `sccif_lookup(judgement_id)` → SCCIF chunks

### 4. Citation

Keep `orb_citation_service` honesty rules; enable `basis_type: exact` when chunks have `exact_excerpt`.

### 5. Answer policy

Keep operating brain must-not list; add retrieval-layer uncertainty when zero chunks match regulatory query.

---

## Gap table

| Gap | Current evidence | Why it matters | Risk | Fix | Phase | Tests |
|-----|------------------|----------------|------|-----|-------|-------|
| Full text ingestion | `full_text_allowed: false` for all three | No exact statutory citations | **High** | Ingest via `ingest_official_source()` | 2_ingest | exact citation test |
| Regulations 2015 no seed | No SEED_FILE_MAP entry | Cannot retrieve most regulations | **High** | Ingest SI or expand quotes | 2_ingest | Reg 6/27 lookup |
| Summary-only chunks | 3-paragraph seeds | Weak section retrieval | Medium | Replace with chunked docs | 2_ingest | section metadata test |
| quality_standards.py incomplete | 4/9 standards | Legacy divergence risk | Low | Deprecate in favour of brain JSON | — | 9-standard assert |
| Citation exact text | basis_type=summary default | Limited regulatory depth | Medium | Full ingest | 2_ingest | basis_type test |
| Live retrieval disabled | Standalone note in retrieval service | Cannot auto-refresh | Medium | Governed refresh | 2_ingest | last_checked update |
| Therapeutic readiness 14.4% | gap audit report | Answer quality not pilot-ready | Medium | Therapeutic pass | 3_quality | wording tests |
| Voice fast path | Skips full retrieval | Thinner regulatory grounding | Medium | Specialist tier packs | 2_policy | voice metadata test |
| Refusal/uncertainty | Hedging in brain only | Must say when source missing | Medium | Retrieval uncertainty template | 2_policy | unknown reg query |
| Source versioning | Partial version tracking | Statutory drift | Medium | Unified version field | 2_ingest | version in registry |

---

## Recommended build sequence

1. **Phase 1 (this PR):** Audit matrix + guard tests — complete.
2. **Phase 2a ingest:** Guide v1.17 PDF → Knowledge Library with section chunks.
3. **Phase 2b ingest:** SI 2015/541 → regulation-number indexed chunks.
4. **Phase 2c ingest:** SCCIF publication → judgement-area tagged chunks.
5. **Phase 2d policy:** Retrieval uncertainty + voice specialist grounding parity.
6. **Phase 3 quality:** Therapeutic language pass on top 10 workflow domains.

---

## Missing pieces (summary)

1. Full-text ingest of all three bible documents
2. Regulation-number indexed retrieval (beyond 6 curated regs)
3. Section-level chunk metadata from real publications
4. Exact citation capability (`quote_allowed: true` for ingested chunks)
5. Governed source refresh in standalone mode
6. Therapeutic answer quality at scale (14.4% readiness)
7. Dedicated refusal/uncertainty tests for unknown regulations

---

## What exists and works well

- Trusted source registry with gold-tier governance
- Nine Quality Standards brain with practice questions per standard
- SCCIF alignment with safe disclaimer (no grade prediction)
- Honest citation stack (no fabricated retrieval)
- Operating brain answer standard and must-not rules
- 40-domain knowledge gap audit (100% structural pass)
- Recording framework with child voice checks on every type
- Reg 44/45 modes and quote registry entries
- Convergence orchestrator knowledge vault routing on standalone surfaces

---

## Safety statement

- No routes changed
- No OS assistant routes touched
- No frontend changes
- No source ingestion performed
- NR-1 governance not weakened
- Public promise not drafted

---

## Checks run

| Check | Result |
|-------|--------|
| `pytest tests/test_orb_residential_knowledge_spine_audit.py` | See PR |
| `pytest tests/test_orb_knowledge_retrieval.py tests/test_orb_knowledge_library.py -q` | See PR |
| `python3 scripts/ai_egress_audit.py` | Guard OK |
| `py_compile` on changed files | OK |

Machine-readable source: `services/orb_residential_knowledge_spine_audit_service.py`
