# Canonical Operational Cognition

Sprint L does not introduce another intelligence engine. It names the operating pathway that already exists and sets the rule for future work: records become metadata and chronology first, then shared cognition blocks are reused by ORB, Care Hub, Governance, Chronology, Reports and Workforce.

## Canonical pathway

1. Domain records are saved through their domain service or compatibility bridge.
2. `metadata_extraction_service.py` extracts deterministic care metadata: child voice, regulatory links, emotional terms, relationship terms and care signals.
3. `ChronologyWriter` records the operational event. Lifecycle transitions also append operational memory and audit evidence.
4. `ChronologyProjectionService` and operational memory replay build projection-first reads for chronology and low-cost context.
5. `orb_operational_context_service.py` builds the permitted context bundle from metadata, chronology, documents, actions, workforce, governance and snapshots.
6. Existing cognition services derive meaning:
   - `orb_operational_cognition_service.py`
   - `orb_trajectory_reasoning_service.py`
   - `orb_operational_atmosphere_service.py`
   - `orb_rm_reflection_service.py`
   - `orb_care_journey_service.py`
   - `orb_regulatory_reasoning_service.py`
   - `orb_therapeutic_reasoning_service.py`
7. `orb_response_composer.py` returns evidence-cited cognition through `/api/orb/conversation`.
8. UI surfaces consume those same blocks or existing domain summaries. They must not create parallel cognition unless a backend payload is missing and the adapter is documented as transitional.

## Consumers

| Surface | Canonical source | Current convergence rule |
|---|---|---|
| ORB | `/api/orb/conversation` and ORB cognition services | Primary conversational cognition. Always cite sources and missing evidence. |
| Care Hub | Platform, Governance OS, Workforce OS, chronology and ORB governance summary | Surface daily operational questions and avoid new dashboard engines. |
| Child Journey | Child workspace, child experience intelligence and narrative continuity | Use lived-experience APIs before adding client-only synthesis. |
| Chronology | `ChronologyWriter` plus `ChronologyProjectionService` | Treat projection reads as the target truth plane; `/os/chronology` is compatibility. |
| Governance | `GovernanceIntelligenceService`, regulatory ontology and ORB regulatory reasoning | Show oversight quality, evidence gaps, child impact and inspection questions. |
| Workforce | `WorkforceIntelligenceService` and workforce journey APIs | Link workforce wellbeing and practice quality to care quality. |
| Reports | Governance evidence matrix, chronology and ORB regulatory reasoning | Reports should reuse linked records and standards, not re-score independently. |

## Chronology as operational truth

Chronology is the shared operating memory. Significant daily notes, incidents, safeguarding, missing episodes, medication, health, education, keywork, family contact, child voice, sanctions, rewards, support plans, risk assessments, actions, handovers, supervision, workforce concerns, governance reviews, Reg 44, Reg 45 and ORB reflections should either write chronology directly or be projected into chronology through lifecycle replay.

Every chronology projection should make these meanings available when evidence exists:

- emotional themes
- safeguarding themes
- repeated patterns
- support effectiveness
- relationship continuity
- positive progress
- unresolved concerns
- operational pressure
- reflective insights
- regulatory evidence links

## Duplication boundaries

| Area | Canonical | Compatibility or deprecated path |
|---|---|---|
| ORB conversation | `/orb` and `/api/orb/conversation` | legacy assistant HTML, `assistant_routes.py`, standalone assistant shells |
| Chronology reads | `/api/operational-memory/chronology` and projection services | `/os/chronology`, direct `os_chronology_service` reads |
| Child impact | child experience intelligence plus narrative continuity and ORB care journey | client regex percentages and legacy child intelligence panels |
| Relationship intelligence | relationship continuity and child experience signals | scattered keyword cards |
| SCCIF/QS | governance OS and regulatory ontology | frontend SCCIF heuristics and assistant-only mappers |
| Workforce | workforce OS APIs | legacy staff dashboard scripts |

## Performance rules

- Prefer metadata-first context over live table fan-out.
- Reuse projection snapshots for Care Hub, Governance and ORB degraded reads.
- Keep command-centre hydration controlled; avoid parallel bursts that exhaust the shared DB pool.
- Do not run new ORB enrichments for static dashboard widgets when existing governance/workforce summaries are already loaded.
- Add new UI surfacing as display-only consumers of existing payloads wherever possible.

## Sprint L implementation notes

- Modern child journey now consumes the existing `/young-people/{id}/experience-intelligence` route.
- ORB now renders the already-returned `therapeutic_reasoning` block.
- Care Hub now includes the missing "What may Ofsted ask about?" and "What remains unresolved?" questions from existing governance and alert data.
- Child journey ORB links now use the canonical `/orb?scope=child&young_person_id=...` route instead of assistant compatibility links.
