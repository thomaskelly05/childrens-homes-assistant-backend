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
| 1 | Core statutory and inspection spine | 18 |
| 2 | Safeguarding, risk and child protection | 21 |
| 3 | Whole-child development, health, education and SEND | 14 |
| 4 | Rights, identity, advocacy, family and journey through care | 22 |
| 5 | Data protection, records, workforce and ethical AI | 38 |

**Total catalogued sources:** 113 (see `catalogue.json` for authoritative count).

### Expansion pass — duplicate-safe update

| Measure | Count |
|---------|-------|
| Sources before update | 75 |
| Sources after update | 113 |
| Sources updated | 17 |
| Genuinely new sources added | 38 |
| Duplicate entries avoided | 17 |
| Workflow domains before update | 28 |
| Workflow domains after update | 52 |

Updated existing entries instead of duplicating: `childrens_homes_regulations_2015`, `dfe_childrens_homes_regulations_guide`, `ofsted_sccif_childrens_homes`, `working_together_safeguarding`, `keeping_children_safe_in_education`, `dbs_guidance`, `whistleblowing_guidance`, `online_safety_ceop`, `nspcc_learning`, `ico_children_uk_gdpr`, `ico_childrens_code`, `nice_ng205_looked_after_children`, `send_code_of_practice`, `domestic_abuse_guidance`, `coram_voice`, `become_charity`, `safer_recruitment_education`.

**Uncertain near-duplicate requiring human review:** `keeping_children_safe_in_education` and `safer_recruitment_education` intentionally point to the same KCSIE publication because safer recruitment is a subsection mapping.

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
| `provider_policy` | Local provider document — requires upload, not citable by default |

---

## Workflow domains mapped (52)

Daily recording · Incident recording · Physical intervention · Missing from care · Safeguarding concern · Allegation · Exploitation concern · Family time · Education · Health · Medication · Mental health and self-harm · SEND / disability / autism · Online safety · Equality / identity / culture · Key-work · Risk assessment · Behaviour support · Supervision · Management oversight · Reg 40 notification consideration · Reg 44 preparation · Reg 45 preparation · Inspection readiness · Report writing · Leaving care · Life story / records the child may read later · Data protection / AI safety

New workflow domains added in this pass: Running the regulated children's home · Statement of Purpose, Children's Guide and admissions matching · Allegations, LADO and adult conduct · Prevent, radicalisation and ideological harm · Harmful sexual behaviour and child-on-child harm · FGM, forced marriage and honour-based abuse · Bullying, intimidation and group living dynamics · Search, confiscation, room checks, surveillance and privacy · Fire, premises, food, infection control and health and safety · Transport, vehicles and community activities · Money, possessions and financial dignity · Corporate parenting, sufficiency, matching and stability · Critical incidents, death, serious harm and bereavement · Staff wellbeing, supervision and secondary trauma · Staff training, qualifications and induction · Sexual health, contraception, pregnancy and relationships · Language, interpreters and communication access · Children with parents in prison or family imprisonment · Parental substance misuse, parental mental health and family trauma · Emergency planning and business continuity · Visitors, contractors and professionals in the home · Pets, animals and therapy animals · Ordinary childhood, belonging and memories · Record access, care files and future reading.

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
6. Local-policy-only entries (`Statement of Purpose`, `Children's Guide`) use `requires_local_policy: true`, `citation_authority: local_policy_required`, and `should_cite: false` unless uploaded locally.  
7. No catalogue text claims guaranteed compliance, safeguarding threshold decisions, or inspection outcomes.

---

## Operational Children’s Homes Regulations coverage

Explicitly mapped: Reg 16, Reg 17, Reg 21, Reg 22, Reg 23, Reg 24, Reg 25, Reg 31, Reg 32, Reg 33, Reg 34, Reg 35, Reg 36, Reg 37, Reg 38, Reg 39, Reg 40, Reg 44 and Reg 45.

This is catalogue mapping only. No full text was ingested.

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
| KCSIE subsection duplication | `keeping_children_safe_in_education` and `safer_recruitment_education` share the KCSIE publication and are explicitly justified |
| Local policy documents | Statement of Purpose and Children's Guide require local upload and are not citable by default |

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
