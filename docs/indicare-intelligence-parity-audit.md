# IndiCare Intelligence™ — ChatGPT Parity Audit

**Vision:** ChatGPT for Residential Children's Homes — an AI Operating Companion combining assistant chat, ORB voice, regulatory expertise, safeguarding intelligence, operational governance, document understanding, agents, memory, tools, accessibility, and secure permissions.

**Audit date:** 2026-05-23  
**Scope:** Repository code inspection (standalone `/orb`, operational `/assistant/orb`, Care Hub, Record, Intelligence Spine, auth/RBAC).  
**Constraint:** Do not weaken the ORB product split — standalone must not access live OS records.

---

## 1. Already built

| Area | Evidence |
|------|----------|
| **Core chat** | `orb-care-companion.tsx`, `POST /orb/standalone/conversation`, modes, history, dedupe |
| **Voice / Hey ORB** | `use-standalone-orb-voice.ts`, wake phrase, continuous conversation, British voice preference |
| **Image upload** | Composer paste/drop, `imageDataUrls`, multimodal conversation payload |
| **Projects & local memory** | `standalone-local-store.ts` — chats, projects, profiles (user-provided) |
| **Knowledge Library / RAG** | `orb_knowledge_routes.py`, `orb_knowledge_retrieval_service.py`, semantic + keyword hybrid |
| **Citations & governance** | `orb_citation_service.py`, `orb_standalone_sources.py`, source types and basis |
| **Document understanding** | `orb_document_routes.py`, `orb-document-panel.tsx` |
| **Agents & Deep Research** | `orb_agent_routes.py`, `orb_deep_research_service.py`, `orb-agent-panel.tsx` |
| **Saved outputs** | `orb_saved_output_routes.py`, unified intelligence output schema |
| **Evaluation** | `orb_evaluation_routes.py` health surface |
| **Model router** | `ai_model_router_service.py`, `/orb/standalone/model-router/health` |
| **Safeguarding / Ofsted modes** | Standalone modes in `orb_standalone_routes.py`, knowledge seeds |
| **Operational OS** | `/assistant/orb`, Care Hub, Record, Intelligence Spine (separate surfaces) |
| **Security / RBAC** | `auth/permissions.py`, `require_assistant_access`, MFA routes |
| **Product split tests** | `tests/test_orb_product_split.py` |

---

## 2. Partially built

| Area | Gap |
|------|-----|
| **Vision / camera** | Images via file/paste; mobile `capture=environment` and permissions panel added this pass |
| **Accessibility** | Global ORB accessibility exists; standalone-specific dyslexia/low-sensory/large-text classes added |
| **Memory controls UI** | Local store exists; dedicated Memory/Preferences panel added |
| **Tools menu** | Capabilities existed in sidebar; grouped IndiCare Tools panel added |
| **Wellbeing** | Reflective chat only; workforce intelligence remains OS |
| **Governance** | OS dashboards; standalone shows locked cards with safe links |
| **Notifications** | Platform pieces exist; no ORB-native notification centre |
| **Mobile / offline** | Responsive layout; no offline cache |
| **Intelligence map** | Capability service + UI panel added |

---

## 3. Missing

| Area | Notes |
|------|-------|
| **Screen share / live collaboration** | Planned — high coordination risk |
| **ORB-native push notifications** | Use OS notification patterns first |
| **Full OS memory bridge** | Intentionally blocked for standalone |
| **Standalone child/staff live profiles** | Must remain OS-only |
| **Web search (live browsing)** | Not claimed unless implemented |

---

## 4. Needs operational OS context

- Child chronology, placement, live incidents
- Manager daily brief, pattern detection, evidence graph
- Ofsted live evidence simulation on home records
- Care Hub dashboards, action board, oversight reviews
- Staff workforce intelligence and burnout patterns
- Filing to care records (`/record`)

**Route:** `/assistant/orb`, `/care-hub`, `/record`, `/young-people`, Intelligence Spine APIs (`/api/os/*` — operational clients only).

---

## 5. Must remain standalone only

Allowed API prefixes for `/orb`:

- `/orb/standalone/*` (conversation, config, knowledge, documents, agents, evaluation, outputs, capabilities, surface-route)
- Never `/api/os/*`, `/os/*`, Care Hub, chronology, or child/staff record APIs

Local-only: chats, projects, profiles, accessibility prefs, voice prefs.

---

## 6. High-risk / needs safety design

| Risk | Mitigation |
|------|------------|
| Standalone accessing live records | Product split tests + surface router `requires_os_context` |
| Safeguarding threshold decisions | Mode guardrails + escalation copy |
| Child name hallucination from profiles | Profiles labelled user-provided only |
| Document upload PII leakage | Standalone workspace only; no auto OS write |
| Model router secret exposure | Health endpoint shows availability only |
| Operational ORB over-sharing | Permissioned context (future); not wired in standalone |

---

## 7. Recommended build order

1. **Capability map + surface router** (this pass) — product truth and safe routing  
2. **Tools / Memory / Accessibility panels** — user-visible parity layer  
3. **OS boundary messaging** — child/staff/chronology intents → operational ORB  
4. **Permissions readiness** — mic/camera/speech status  
5. **Operational ORB context scoping** — permissioned, audited, opt-in  
6. **Notifications & collaboration** — after RBAC review  
7. **Mobile offline** — cache knowledge + local chats  

---

## Search index (repo keywords)

| Keyword | Primary locations |
|---------|-------------------|
| chat / conversation | `orb-care-companion.tsx`, `orb_standalone_routes.py` |
| voice / microphone | `use-standalone-orb-voice.ts`, `orb_voice_routes.py` |
| image / camera | `orb-standalone-composer.tsx` |
| projects / profiles / memory | `standalone-local-store.ts` |
| agents / deep research | `orb_agent_routes.py`, `orb-agent-panel.tsx` |
| knowledge / citations | `orb_knowledge_routes.py`, `orb_citation_service.py` |
| documents | `orb_document_routes.py` |
| outputs | `orb_saved_output_routes.py` |
| accessibility | `orb-accessibility-panel.tsx`, `orb-accessibility-panel.tsx` (standalone) |
| permissions / RBAC | `auth/permissions.py` |
| ofsted / sccif | Knowledge seeds, standalone modes |
| intelligence spine | `indicare_intelligence_spine` services, OS routes |
| care hub / record | `frontend-next/app/care-hub`, `/record` |

---

*Generated as part of the IndiCare Intelligence product layer pass. See `GET /orb/standalone/capabilities` for machine-readable capability data.*
