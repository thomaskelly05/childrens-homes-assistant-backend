# IndiCare ORB Gap Matrix (Phase 15)

| Area | Current State | Gap | Risk | User Impact | Launch Impact | Recommended Fix | Priority | Effort |
|------|---------------|-----|------|-------------|---------------|-----------------|----------|--------|
| ORB Chat | Streaming chat with brain routing, citations, actions — production | `/orb/ask` stubs; ChatGPT parity tests failing | Medium | Confusion if wrong page demoed | Demo polish | Fix contract tests; deprecate or complete `/orb/ask` | P1 | Small |
| ORB Brain | Mature ORB 9 orchestration, 50+ GOLD scenarios, quality gates | No live LLM scenario QA in CI; whistleblowing scenario missing | High | Wrong safeguarding advice | **Launch blocker for unsupervised use** | Quality Lab live runs + add whistleblowing scenario | P0 | Medium |
| ORB Voice | WS/STT/TTS built; brain connected | WebRTC stub; 21 UI tests include voice failures; no latency SLA | High | Unreliable shift-end use | Soft launch only | Complete voice E2E; audio unlock UX | P1 | Medium |
| ORB Dictate | Full pipeline; strongest surface | No offline mode; speaker separation partial | Low | Shift-end without network fails | Minor | Offline queue (later) | P2 | Large |
| ORB Write | Editor, AI rewrites, PDF export | No DOCX; no revision history | Medium | Managers want Word | Pilot acceptable | Add DOCX export to Write | P2 | Medium |
| Templates | Framework + API + UI | Two catalogues overlap | Low | Template choice confusion | Minor | Unify template picker copy | P3 | Small |
| Reports | 20+ framework record types | No manager sign-off workflow | Medium | Draft mistaken for final | Governance risk | Sign-off disclaimer UX + workflow (later) | P2 | Large |
| Exports | PDF/print/DOCX via templates | No branded letterhead; export telemetry missing | Low | Less impressive to inspectors | Minor | Brand PDF template | P3 | Medium |
| Knowledge | RAG, official sources, admin API | No provider policy upload in Residential | Medium | Generic policy advice | Provider trust | Provider policy snippet (pilot) | P2 | Medium |
| Quality Lab | Backend + founder UI + regression bank | Not gating releases; orchestration-only tests | High | Safety regressions undetected | **Launch blocker** | Live LLM scenario gate in CI (nightly) | P0 | Medium |
| Telemetry | Usage meter, AI audit, founder summary | Thin product funnel events | Medium | Cannot optimise conversion | Commercial blind spots | Add dictate/export/voice events | P1 | Small |
| Billing | Stripe checkout, portal, webhook, trial | Requires prod Stripe env; billing UI tests fail | High | Cannot pay = cannot use | **Paid launch blocker** | Configure Stripe prod; fix billing modal tests | P0 | Small |
| Onboarding | Signup → setup → safety | Funnel drop-off not instrumented | Low | Unknown conversion | Optimisation | Onboarding step events | P2 | Small |
| Mobile | Dedicated mobile shells | Billing modal overflow; write cramped | Medium | Frustration on phone | Pilot friction | Fix mobile billing CSS | P1 | Small |
| Privacy | Telemetry sanitised; disclaimers | No retention/deletion UI; no DSAR | High | GDPR complaint risk | **Public launch blocker** | Privacy settings + retention policy page | P0 | Medium |
| Safeguarding | Brain rules + quality gate + TTS block | Depends on LLM adherence; no provider policy | Critical | Harm if wrong advice | **Existential** | Live scenario QA + local policy prompts | P0 | Medium |
| Ofsted readiness | Ofsted Lens mode; blocks grade prediction | No inspection pack in standalone | Low | RM expects more | Minor | Standalone inspection prep template pack | P3 | Medium |
| Founder OS | Telemetry, Quality Lab, evidence — honest empty states | Build fails; founder AI unmounted; thin ORB funnel | Medium | CEO cannot demo revenue | Investor demo blocker | Fix build; mount or remove founder AI | P1 | Small |
| Revenue | Stripe infrastructure ready | Not live without config; forecast page separate | High | No MRR | Paid launch blocker | Stripe prod setup | P0 | Small |
| Relationships | Manual CRM in founder persistence | No external CRM sync | Low | Manual pilot tracking | Acceptable for pilot | HubSpot webhook (later) | P4 | Large |
| Evidence | Evidence packs in founder OS | Manual content; not auto from ORB | Low | Manual investor prep | Acceptable | Auto evidence from anonymised metrics (later) | P4 | Large |
| Infrastructure | Render deploy, health routes, pool | `npm run build` fails; 210 pytest failures | High | Cannot deploy confidently | **Deploy blocker** | Fix founder revenue import | P0 | Small |
| Tests | 3513 pass; 263 ORB files | 42 conftest errors; 21 frontend fails; no live LLM | High | Regressions slip through | Quality signal | Fix conftest + contract tests | P0 | Medium |
