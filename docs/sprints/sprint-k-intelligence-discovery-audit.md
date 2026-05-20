# Sprint K Intelligence Discovery Audit

Sprint K is a discovery and surfacing sprint. It does not define a new cognition engine. It documents the existing intelligence layers, identifies duplication, and names the canonical surfaces that should carry IndiCare operational intelligence.

## Canonical convergence path

1. `services/orb_operational_context_service.py` builds permitted ORB context from live records, metadata-first reads, projection snapshots, workforce intelligence and governance intelligence.
2. `services/orb_operational_cognition_service.py`, `services/orb_trajectory_reasoning_service.py`, `services/orb_operational_atmosphere_service.py` and `services/orb_rm_reflection_service.py` turn that context into reflective operational cognition.
3. `services/orb_care_journey_service.py`, `services/orb_regulatory_reasoning_service.py` and `services/orb_therapeutic_reasoning_service.py` add child journey, oversight and therapeutic reasoning.
4. `routers/orb_routes.py` returns those blocks through `/api/orb/conversation`.
5. `frontend-next/components/orb-operational/orb-cognition-panels.tsx` now surfaces those existing blocks instead of hiding them.

## Discovered intelligence systems

| System | File location | Purpose | Used by | Status | Duplication risk | Canonical version | Should surface | ORB consumes | UI consumes |
|---|---|---|---|---|---|---|---|---|---|
| ORB context builder | `services/orb_operational_context_service.py` | Live/projection/snapshot context bundle for ORB | `routers/orb_routes.py`, voice ORB | Active | Parallel context readers exist | Canonical for ORB conversation | ORB, Care Hub diagnostics | Yes | Yes, through `/orb` |
| ORB operational cognition | `services/orb_operational_cognition_service.py` | Themes, pressure/stability, child impact prompts and RM prompts | `build_orb_response` | Active, under-surfaced | Duplicates client regex theme counts | Canonical ORB cognition block | ORB, Care Hub, reports | Yes | Yes, surfaced in Sprint K |
| ORB trajectory reasoning | `services/orb_trajectory_reasoning_service.py` | Chronology density, safeguarding density, overdue actions, unsigned docs | `build_orb_response` | Active, under-surfaced | Overlaps assistant risk trajectory and client charts | Canonical for ORB trajectory | ORB, chronology, governance | Yes | Yes, surfaced in Sprint K |
| ORB operational atmosphere | `services/orb_operational_atmosphere_service.py` | Home or child atmosphere from context, cognition and trajectory | `build_orb_response` | Active, under-surfaced | Overlaps Care Hub client summaries | Canonical ORB atmosphere | ORB, Care Hub pulse | Yes | Yes, surfaced in Sprint K |
| ORB RM reflection | `services/orb_rm_reflection_service.py` | Reflective RM prompts from cognition and trajectory | `build_orb_response` | Active, under-surfaced | Overlaps static frontend prompts and assistant reflection | Canonical ORB RM prompt source | ORB, governance, supervision | Yes | Yes, surfaced in Sprint K |
| ORB care journey | `services/orb_care_journey_service.py` | Child-centred themes, strengths and gaps | ORB response composer | Active | Overlaps child journey client synthesis | Canonical child narrative for ORB | ORB child scope, child journey | Yes | Partially |
| ORB regulatory reasoning | `services/orb_regulatory_reasoning_service.py` | SCCIF, evidence gaps and management considerations | ORB response composer | Active | Overlaps governance and inspection assistants | Canonical ORB oversight reasoning | ORB, governance, inspection | Yes | Partially |
| ORB therapeutic reasoning | `services/orb_therapeutic_reasoning_service.py` | Trauma-informed non-clinical observations | ORB response composer | Active | Overlaps trauma-informed practice service | Canonical ORB therapeutic layer | ORB, child journey | Yes | Partially |
| ORB live emotional state | `services/orb_live_context_enrichment.py`, `services/orb_emotional_state_service.py` | ORB interaction pacing, overload and safety context | Voice/text ORB enrichment | Active | Name collision with child emotional state | Canonical only for ORB UX state | ORB voice and accessibility | Yes | Voice path |
| Operational memory | `services/operational_memory_service.py`, `routers/operational_memory_routes.py` | Five-day child memory, child voice, risk and strengths | Legacy workspace and check-in UI | Active, legacy-first | Duplicates child experience and ORB cognition | Canonical for legacy operational memory | Child journey if migrated | Not direct | Legacy UI |
| Narrative continuity | `services/narrative_continuity_service.py`, `services/emotional_progression_service.py`, `services/relationship_continuity_service.py` | Emotional progression, relationship continuity and support effectiveness | Voice recovery answers and tests | Active but narrow | Overlaps frontend narrative continuity | Canonical child narrative service candidate | Child journey, reports, ORB child scope | Voice path | Not directly |
| Child experience intelligence | `services/child_experience_intelligence_service.py`, `routers/child_experience_intelligence_routes.py` | Lived-experience signals from child records | Legacy experience intelligence route | Active | Overlaps operational memory and narrative continuity | Canonical structured child experience API | Child journey, reports | No | Legacy UI |
| Emotional wellbeing timeline | `services/emotional_wellbeing_timeline_service.py`, `routers/chronology_intelligence_routes.py` | Batch emotional wellbeing timeline | Intelligence OS chronology API | Active | Overlaps emotional progression | Canonical batch analysis route | Chronology | No | Limited |
| Metadata extraction | `services/metadata_extraction_service.py`, `schemas/data_intelligence.py` | Deterministic care/regulatory metadata including child voice flags | Record pipelines and metadata-first context | Active | Client-side flag heuristics duplicate this | Canonical metadata source | ORB, chronology, reports | Indirect | Indirect |
| Metadata-first ORB context | `services/orb_metadata_first_context_service.py` | Low-cost metadata and strategy information | ORB context builder | Active | Low | Canonical cost control layer | ORB context status | Yes | Context panel |
| Projection snapshots | `services/intelligence/projection_snapshot_service.py` | Cached operational projections | Governance and ORB degraded mode | Active | Parallel client rebuilds | Canonical snapshot cache | Governance, ORB, Care Hub | Yes | Governance UI |
| Projection coordinator | `services/intelligence/projection_coordinator.py` | Invalidation and projection targets | Lifecycle/event bus | Active | Low | Canonical invalidation path | Platform infrastructure | Indirect | No |
| Chronology projection | `services/chronology_projection_service.py` | Replay-driven chronology projection | Operational memory routes | Active | Overlaps chronology readers | Canonical replay projection | Chronology | No | Partial |
| Chronology engine | `services/intelligence/chronology_engine.py` | Unified chronology propagation contract | Contract tests | Active | Low | Canonical lifecycle contract | Chronology | Indirect | No |
| Governance intelligence | `services/governance_intelligence_service.py`, `routers/governance_intelligence_routes.py` | Command centre, evidence matrix, governance summary | Governance UI, ORB governance scope | Active | Overlaps client SCCIF summaries | Canonical governance OS | Governance, Care Hub, ORB | Yes | Yes |
| Workforce intelligence | `services/workforce_intelligence_service.py`, `routers/workforce_journey_routes.py` | Recording quality, wellbeing, workforce context | Workforce UI, governance, ORB | Active | Overlaps legacy workforce dashboards | Canonical workforce OS | Workforce, governance, ORB | Yes | Yes |
| Assistant intelligence | `services/assistant_intelligence_service.py`, `assistant/*` | Inspection briefs, risk trajectory, reflection, chronology synthesis | Legacy text assistant | Active parallel layer | High ORB duplication | Canonical only for legacy assistant | Assistant until migrated | No | Legacy/assistant |
| Operational intelligence service | `services/operational_intelligence_service.py`, `routers/operational_intelligence_routes.py` | Scope-based operational counts and risk score | OS dashboards | Active | Overlaps manager/governance/ORB risk | Canonical for legacy OS dashboards | Care Hub if consolidated | No | Legacy |
| Manager intelligence | `services/manager_intelligence_service.py`, `routers/manager_intelligence_routes.py` | RM dashboard composition | Governance/proactive alerts | Active | Risk counting duplicated elsewhere | Canonical RM dashboard source | Governance and Care Hub | Indirect | Partial |
| Proactive intelligence | `services/proactive_intelligence_service.py` | Alerts from manager intelligence | Proactive routes | Active | Thin wrapper | Derived alert layer | Notifications | No | Partial |
| OS intelligence legacy | `services/os_intelligence_service.py`, `routers/os_modules_routes.py` | Older child/home heuristic intelligence | Legacy OS module routes | Active legacy | High overlap with child experience and ORB | Deprecated candidate | Compatibility only | No | Legacy |
| Standalone intelligence | `services/standalone_*`, `routers/standalone_*` | Separate standalone product intelligence | Standalone routes | Active isolated | Product boundary drift | Keep isolated | Not core OS | No | No |
| Frontend cognition metrics | `frontend-next/lib/operational/cognition-metrics.ts` | Client-side chronology and command-centre summaries | Care Hub, governance, workforce, chronology | Active | Duplicates backend cognition | Temporary frontend adapter | UI only until backend payloads expand | No | Yes |
| ORB cognition UI | `frontend-next/components/orb-operational/orb-cognition-panels.tsx` | Visible rendering of existing ORB cognition blocks | `/orb` | Active | Low; display-only | Canonical ORB cognition view | ORB | Yes | Yes |
| Care Hub operational pulse | `frontend-next/app/command-centre/page.tsx` | Atmosphere, staffing, safeguarding, handover questions | Care Hub | Active | Uses existing page feeds | Canonical Care Hub pulse | Care Hub | Indirect | Yes |
| Child lived experience view | `frontend-next/app/young-people/[id]/journey/page.tsx` | Child impact and relationship intelligence from existing journey data | Child journey | Active | Frontend synthesis overlaps backend narrative continuity | UI adapter until narrative API exposed | Child journey | Indirect | Yes |
| Governance meaningful oversight | `frontend-next/app/governance/command-centre/page.tsx` | Themes, evidence quality, child voice, pressure | Governance command centre | Active | Low; display-only | Canonical governance UI surface | Governance | Indirect | Yes |
| Workforce practice wellbeing | `frontend-next/app/staff/command-centre/page.tsx` | Reflective culture, safeguarding confidence, support needs | Workforce command centre | Active | Low; display-only | Canonical workforce UI surface | Workforce | Indirect | Yes |
| Chronology meaning synthesis | `frontend-next/app/chronology/page.tsx` | Repeated themes, emotional shifts, escalation, support and voice | Chronology | Active | Duplicates richer backend chronology modules | UI adapter until chronology synthesis API is canonical | Chronology | No | Yes |

## Dormant or under-surfaced systems activated in Sprint K

- `operational_cognition`, `trajectory_reasoning`, `operational_atmosphere` and `rm_reflection` were already returned by `/api/orb/conversation`; they are now visible in ORB.
- Care Hub now surfaces atmosphere, pressure, positive progress, relationship stability, children needing attention, unresolved concerns and next-shift questions from existing platform/governance/workforce feeds.
- Child journey now surfaces one lived-experience and relationship intelligence view from the existing child journey bundle and narrative continuity helper.
- Governance, workforce and chronology pages now show reflective synthesis panels from existing payloads rather than hidden counts only.

## Duplication and convergence notes

| Intelligence area | Canonical pathway | Deprecated or compatibility pathway | Migration risk |
|---|---|---|---|
| ORB conversation cognition | `build_orb_context` -> ORB reasoning services -> `/api/orb/conversation` | `OrbContextEngine`, assistant retrieval, old copilot JS | Medium; old assistant still has separate users |
| Emotional state | Child analytics through narrative continuity/child experience; ORB UX state through `OrbEmotionalStateService` | Operational memory emotional heuristics and client regex | High; names are similar but meanings differ |
| Trajectory and escalation | `orb_trajectory_reasoning_service.py` for ORB; chronology services for timeline | `assistant/risk_trajectory.py`, client trend charts | High; do not merge without tests |
| Relationship intelligence | `relationship_continuity_service.py`, child journey record types, ORB care journey | Client regex and legacy child intelligence engine | Medium |
| Child impact | Narrative continuity plus ORB cognition `impact_indicators` | Frontend percentages and legacy child intelligence | Medium |
| Governance and inspection | `governance_intelligence_service.py` plus ORB regulatory reasoning | Client SCCIF heuristics and assistant inspection readiness | Medium |
| Workforce | `workforce_intelligence_service.py` | Legacy staff workforce JS | Medium |
| Chronology meaning | Chronology engine/projection plus future synthesis endpoint | Client regex and legacy chronology overlays | Medium |

## Remaining hidden gaps

- `narrative_continuity_service.py` contains support effectiveness and relationship continuity but has no canonical Next.js API route.
- `child_experience_intelligence_service.py` is active in legacy routes but is not consumed by the modern child journey.
- Chronology meaning is still partly frontend-derived; a backend synthesis API should reuse existing chronology services before more UI logic is added.
- Static reflective prompts remain in several pages as fallback copy; ORB `rm_reflection` should become the preferred prompt source wherever live ORB context is available.
- Several legacy assistant modules remain active and parallel to ORB; they should be wrapped or retired only after usage is measured.

## Sprint K outcome

Sprint K reveals existing IndiCare intelligence rather than adding another engine. The most important convergence is now visible: ORB already carries atmosphere, trajectory, child impact, relationship and RM reflection blocks; the frontend now shows those blocks and aligns the major operational pages around the same cognition vocabulary.
