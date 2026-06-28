# ORB Residential Source Catalogue Audit

**Date:** 2026-06-28  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Scope:** Standalone ORB Residential only — **not** IndiCare OS  
**Phase:** Mapping and behaviour catalogue only (no ingestion, no scraping, no route rewiring)

---

## Executive summary

This audit introduces a **tiered ORB Residential source catalogue** that maps official and practice sources to ORB behaviours across the full child journey in Ofsted-regulated children's homes in England. Sources are **not** treated as flat uploads — each entry carries statutory status, citation authority, workflow domain links, escalation triggers, recording behaviours, and professional judgement boundaries.

| Question | Answer |
|----------|--------|
| Full-text ingestion performed? | **No** |
| Documents scraped or downloaded? | **No** |
| Route behaviour changed? | **No** |
| Frontend / Voice / Dictate / Write / Chat UI changed? | **No** |
| OS assistant routes touched? | **No** |
| NR-1 governance weakened? | **No** |
| Public promise drafted or published? | **No** — remains blocked |

**NR-1:** Remains open.  
**Public promise:** Remains blocked.

---

## Why a separate catalogue (not only `trusted_sources_registry.json`)

| Artefact | Purpose |
|----------|---------|
| `assistant/knowledge/trusted_sources_registry.json` | Runtime citation governance for sources already wired into ORB knowledge flows |
| `data/orb_source_catalogue/catalogue.json` | **Mapping-only** tiered catalogue with behaviour fields (escalation, child voice, oversight, `not_to_be_used_for`) across the full child journey |
| `services/orb_residential_source_catalogue_audit_service.py` | Read-only audit API + guard constants for tests |

The registry answers *"may ORB cite this source?"* The catalogue answers *"how should this source shape ORB behaviour in each workflow domain?"* Keeping them separate avoids bloating the runtime registry with mapping metadata that is not yet wired to retrieval.

---

## Source tiers

| Tier | Label | Source count (approx.) |
|------|-------|------------------------|
| 1 | Core statutory and inspection spine | 12 |
| 2 | Safeguarding, risk and child protection | 14 |
| 3 | Whole-child development, health, education and SEND | 13 |
| 4 | Rights, identity, advocacy, family and journey through care | 18 |
| 5 | Data protection, records, workforce and ethical AI | 18 |

**Total catalogued sources:** 75 (see `catalogue.json` for authoritative count).

### Tier 1 minimum coverage (confirmed)

- Children's Homes Regulations 2015  
- Guide to the Children's Homes Regulations including the Quality Standards  
- SCCIF children's homes  
- Children Act 1989 Volume 2: Care Planning, Placement and Case Review  
- Care Planning, Placement and Case Review Regulations 2010  
- Working Together to Safeguard Children  
- Children's social care national framework  
- IRO Handbook  
- Ofsted serious incident notification guidance  
- Regulation 40, 44 and 45 (dedicated entries + parent SI)

---

## Source types represented

| `source_type` | Role in ORB |
|---------------|-------------|
| `legislation` | Authoritative statute — cite regulation numbers; curated quotes until full ingest |
| `statutory_guidance` | Authoritative guidance — frame practice; local policy may add detail |
| `inspection_framework` | SCCIF / Ofsted — evidence preparation; **never predict grades** |
| `government_practice_guidance` | Informative practice — verify against statutory spine |
| `clinical_guidance` | NICE — health framing; **no diagnosis** |
| `data_protection_guidance` | ICO — records, DPIA, AI safety framing |
| `professional_guidance` | CEOP, Ofcom, EHRC, etc. — supplementary |
| `third_sector` | Reflective practice and voice — **not statutory authority** |
| `lived_experience` | Lived experience resources — **reflective only** |

---

## Workflow domains mapped (28)

Daily recording · Incident recording · Physical intervention · Missing from care · Safeguarding concern · Allegation · Exploitation concern · Family time · Education · Health · Medication · Mental health and self-harm · SEND / disability / autism · Online safety · Equality / identity / culture · Key-work · Risk assessment · Behaviour support · Supervision · Management oversight · Reg 40 notification consideration · Reg 44 preparation · Reg 45 preparation · Inspection readiness · Report writing · Leaving care · Life story / records the child may read later · Data protection / AI safety

Each domain entry in `workflow_domain_behaviours` defines:

- primary source tier  
- relevant sources  
- Quality Standards  
- SCCIF judgement area  
- regulation/guidance links  
- evidence prompts  
- safer recording prompts  
- child voice prompts  
- escalation prompts  
- manager oversight prompts  
- citation expectations  
- uncertainty behaviour  
- answer style  

---

## Safeguards for non-statutory sources

1. **Third-sector and lived-experience** entries use `citation_authority: reflective_only` or `informative_practice` and `statutory_status: third_sector_resource` / `lived_experience_resource`.  
2. Every third-sector source includes `not_to_be_used_for` entries explicitly forbidding treatment as statutory authority or compliance guarantees.  
3. NICE sources include `not_to_be_used_for: diagnosis` and professional judgement boundaries stating ORB does not diagnose.  
4. SCCIF and inspection sources forbid grade prediction in `not_to_be_used_for`.  
5. Reg 40 / serious incident sources require manager confirmation before notification decisions.  
6. No catalogue text claims guaranteed compliance, safeguarding threshold decisions, or inspection outcomes.

---

## ORB behaviour mapping (per source)

Every source includes structured fields for:

| Field | Purpose |
|-------|---------|
| `escalation_triggers` | When to prompt DSL, manager, police, Ofsted, health |
| `safer_recording_behaviours` | Observation vs interpretation, chronology, therapeutic language |
| `manager_oversight_triggers` | Notification, review, sign-off prompts |
| `child_voice_prompts` | What to ask about the child's views and communication |
| `professional_judgement_boundary` | ORB supports; adults decide |
| `not_to_be_used_for` | Explicit prohibitions (compliance guarantees, threshold decisions, etc.) |

---

## Missing or uncertain sources

| Gap | Notes |
|-----|-------|
| Full-text ingest | All sources are metadata-only in this phase; URLs verified at catalogue build date |
| Local LSCP / provider policy | Referenced as `local_policy_check_required` behaviour; upload path unchanged |
| Wales / Scotland / NI | Catalogue jurisdiction is **England** only |
| URL drift | `update_check_required: true` on all entries; governed refresh not enabled in this PR |
| Some third-sector URLs | Organisation home pages used where no single statutory document exists |

---

## Files in this audit

| File | Role |
|------|------|
| `data/orb_source_catalogue/catalogue.json` | Authoritative tiered source + workflow behaviour data |
| `services/orb_residential_source_catalogue_audit_service.py` | Read-only audit service |
| `tests/test_orb_residential_source_catalogue_audit.py` | Non-invasive guard tests |
| `scripts/build_orb_source_catalogue.py` | Regenerate catalogue JSON (not run in CI ingest) |
| `docs/audits/orb-residential-source-catalogue-audit.md` | This document |

---

## Relationship to Knowledge Spine Audit (PR #1798)

PR #1798 correctly merged the knowledge spine audit (3 files on `main`). This catalogue **extends** that work with tiered sources across the full child journey and per-domain behaviour mapping. It does **not** replace or modify the knowledge spine audit artefacts.

---

## Verification checklist

- [x] Five tiers defined  
- [x] Tier 1 minimum sources present  
- [x] Reg 40, 44, 45 represented  
- [x] Nine Quality Standards referenced in workflow mappings  
- [x] Three SCCIF judgement areas referenced  
- [x] Third-sector sources not marked authoritative  
- [x] Professional judgement boundaries on every source  
- [x] `not_to_be_used_for` on every source  
- [x] No compliance guarantee claims  
- [x] No route, frontend, or ingestion changes  
- [x] NR-1 remains open  
- [x] Public promise remains blocked  

---

*Mapping-only audit. ORB supports professional judgement; it does not replace it.*
