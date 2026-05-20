# IndiCare Operational Intelligence Map

This map names the existing operational cognition pathways that should be reused before adding new systems. It is the canonical Sprint K reference for surfacing IndiCare intelligence.

## Operating principle

Use metadata first, projection second, live reads third, and ORB reasoning only when reflective synthesis is needed. Do not create duplicate scoring models where existing metadata, chronology, governance, workforce or ORB cognition already carries the signal.

## Intelligence domains

| Domain | Source services | Metadata sources | Projection sources | ORB integration | Frontend integration | Governance integration | Reports integration | Chronology integration |
|---|---|---|---|---|---|---|---|---|
| Emotional intelligence | `services/orb_operational_cognition_service.py`, `services/emotional_progression_service.py`, `services/operational_memory_service.py` | `schemas/data_intelligence.py`, record metadata, child voice flags | `operational_projection_snapshots`, chronology projections | `operational_cognition`, `therapeutic_reasoning`, `operational_atmosphere` | ORB cognition panels, child journey lived experience, Care Hub pulse | Child journey health and evidence quality | Reg 45, LAC and child impact reports should cite emotional movement | Chronology emotional shifts and wellbeing timeline |
| Relationship intelligence | `services/relationship_continuity_service.py`, `services/orb_care_journey_service.py`, workforce relationships | Relationship records, family contact, keywork, child voice metadata | Chronology and operational memory projections | Care journey protective factors, relationship safety themes | Child journey relationship intelligence, ORB panels | Child voice visibility and relational stability | Reports should show trusted adults, repair and family contact quality | Chronology relationship theme and repair markers |
| Safeguarding intelligence | `services/orb_trajectory_reasoning_service.py`, safeguarding routes, governance intelligence | Safeguarding flags, risk flags, action metadata | Governance and chronology projections | Trajectory indicators, regulatory reasoning, atmosphere pressure | Care Hub safeguarding pressure, governance oversight, chronology synthesis | Safeguarding drift and SCCIF evidence matrix | Safeguarding summaries and evidence packs | Escalation patterns and linked actions |
| Trajectory intelligence | `services/orb_trajectory_reasoning_service.py`, chronology services, assistant chronology synthesiser | Dates, severity, action status, document signoff | Chronology projection, projection snapshots | `trajectory_reasoning` and cognition trajectory | ORB panels, Care Hub trend, chronology meaning | Operational drift and oversight visibility | Report trend sections | Meaning over time, repeated themes and direction of travel |
| Workforce intelligence | `services/workforce_intelligence_service.py`, workforce journey routes | Recording quality, supervision, training, staff metadata | Workforce command-centre projections where present | ORB workforce scope and governance context | Workforce practice wellbeing, Care Hub staffing pressure | Workforce health and leadership responsiveness | Workforce evidence in Reg 45 and inspection packs | Staff-linked chronology and handover records |
| Governance intelligence | `services/governance_intelligence_service.py`, `services/manager_intelligence_service.py` | Evidence matrix metadata, actions, signoff, SCCIF links | Governance projection snapshots | ORB governance scope and regulatory reasoning | Governance meaningful oversight, Care Hub ORB summary | Canonical governance command centre | Reg 44, Reg 45 and inspection readiness reports | Management review and evidence-quality events |
| Inspection intelligence | `services/inspection_intelligence_service.py`, `services/orb_regulatory_reasoning_service.py`, regulatory graph services | Regulation, Quality Standard and SCCIF metadata | Evidence matrix snapshots | Inspection relevance and management considerations | Governance and Ofsted readiness views | Evidence matrix and readiness summary | Ofsted, Reg 44, Reg 45 packs | Regulation-linked chronology events |
| Child voice intelligence | Metadata extraction, operational memory, child experience intelligence, narrative continuity | `child_voice_present`, `child_voice_missing`, wishes/feelings fields | Chronology and child journey projections | `context_used.child_voice_status`, care journey gaps, RM prompts | Child journey, ORB panels, governance child voice visibility | Child voice visibility and evidence quality | Child-centred report sections | Child voice visibility markers |
| Chronology intelligence | Chronology engine, chronology projection, chronology selectors | Event type, severity, source, evidence/action links | Chronology projection and snapshots | ORB context, trajectory, atmosphere | Chronology meaning synthesis and foundation timeline | Oversight visibility and operational drift | Evidence-backed report chronology | Canonical operational truth plane |
| Operational atmosphere | `services/orb_operational_atmosphere_service.py`, ORB cognition, governance/workforce summaries | Safeguarding, action, chronology and workforce metadata | Projection snapshots when available | `operational_atmosphere` | ORB panels and Care Hub pulse | Governance operating pressure | Manager and provider summaries | Timeline pressure and stability signals |
| Wellbeing intelligence | Operational memory, emotional progression, workforce wellbeing, child journey data | Wellbeing checks, daily notes, staff wellbeing alerts | Platform and workforce bundles | Therapeutic reasoning and cognition themes | Care Hub wellbeing rings, child lived experience, workforce wellbeing | Workforce health and child journey health | Wellbeing movement in reports | Emotional shifts and support responses |
| Support effectiveness | Narrative continuity, child journey story, ORB impact indicators | Support plans, keywork, routines, achievements, outcomes | Child journey and chronology projections | `operational_cognition.impact_indicators` | Child impact synthesis and ORB panels | Child impact visibility | What helped/what changed report sections | Support response events |
| Child impact intelligence | ORB cognition, narrative continuity, child experience intelligence, child journey data | Education, wellbeing, safeguarding, child voice and relationship metadata | Child journey and chronology projections | Impact indicators and care journey synthesis | Child lived experience view and ORB panels | Child journey health and evidence gaps | Child impact synthesis in reviews | Progress, resilience and escalation over time |

## Canonical surfacing by product area

| Surface | Intelligence to show | Canonical source |
|---|---|---|
| Care Hub | Home atmosphere, emotional stability, safeguarding pressure, staffing pressure, positive progress, relationship stability, children needing attention, unresolved concerns, next-shift questions | Existing platform, governance and workforce command-centre bundles; ORB atmosphere for reflective queries |
| ORB | Meaning, patterns, emotional context, relationship insight, child impact, oversight considerations and evidence quality awareness | `/api/orb/conversation` response fields already returned by ORB context builder |
| Child journey | What is helping, what changed, what remains difficult, calming support, child voice strength, emotional safety review, relationship safety | Existing child workspace payload plus narrative continuity helper; future backend narrative continuity API |
| Governance | Emerging themes, oversight strength, evidence quality, child voice, operational pressures, leadership responsiveness | Governance command centre and projection snapshots |
| Workforce | Reflective culture, safeguarding confidence, support needs, consistency, emotional pressure, positive practice | Workforce command centre and workforce intelligence service |
| Chronology | Repeated themes, emotional shifts, positive change, escalation patterns, support responses, child voice visibility | Chronology event stream, chronology engine/projection, future synthesis API |
| Reports | Child impact, emotional movement, safeguarding improvement, education engagement, relationship stability, evidence gaps | Report builders should reuse metadata, chronology and ORB/context summaries rather than client summaries |

## Performance and cost posture

- Prefer metadata extracted on write over repeated text scans.
- Prefer `operational_projection_snapshots` for governance and command-centre summaries.
- Prefer one shared ORB context payload per conversation turn rather than repeated enrichers.
- Keep command-centre server hydration sequential where it touches platform, governance and workforce bundles to avoid DB pool pressure.
- Use frontend synthesis only as a display adapter when no backend projection exists; document it as temporary.

## Deprecation map

| Keep canonical | Compatibility or deprecated path | Note |
|---|---|---|
| ORB `build_orb_context` and `build_orb_response` | Old assistant retrieval/context layers | Keep assistant compatibility until usage is known |
| ORB atmosphere/cognition/trajectory/RM services | Client-only regex cognition summaries | UI can fall back, but ORB should be preferred |
| Governance intelligence service | Client SCCIF heuristics | Governance command centre is canonical |
| Workforce intelligence service | Legacy staff workforce JS | Next.js staff command centre is canonical |
| Chronology engine/projection | Legacy chronology overlays | Reuse concepts, avoid separate timeline engines |
| Narrative continuity service | Frontend narrative helper | Expose backend service before adding more frontend synthesis |

## Next recommended sprint

Expose narrative continuity and child experience intelligence through one modern child impact API, then replace frontend-only lived-experience synthesis with that backend payload. That sprint should retire duplicate client heuristics only after tests prove parity for child voice, support effectiveness, relationship continuity and emotional progression.
