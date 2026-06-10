# ORB Brain / Knowledge Audit (Phase 3)

**Audit date:** 10 June 2026  
**Brain entry:** `services/indicare_intelligence_core_service.py`  
**Knowledge root:** `assistant/knowledge/`

---

## Brain architecture

```
User message
    → indicare_intelligence_core_service (depth + mode selection)
    → orb_brain_route_service / orb_brain_convergence_orchestrator_service
    → orb_expert_brain_orchestrator_service (ORB 9 packet)
    → orb_operating_brain_service (answer standard, safety rules)
    → orb_answer_quality_gate_service (post-generation checks)
    → orb_final_answer_contract_validator_service
```

**Surfaces sharing brain:** Chat (`/orb/standalone/conversation`), Voice (session service), Dictate (`/analyze`, `/generate`), Write (rewrite actions), Templates (`/templates/generate`).

---

## System prompts and routing

| Component | Location | Purpose |
|-----------|----------|---------|
| Operating brain KNOWLEDGE | `assistant/knowledge/orb_operating_brain.py` | Product statement, answer standard, safety rules, modes, brains |
| Prompt router | `assistant/prompt_router.py` | Legacy assistant routing |
| Mode detector | `assistant/mode_detector.py` | Mode classification |
| Brain selection | `services/orb_brain_selection_service.py` | Expert depth selection |
| Scenario playbook | `services/orb_scenario_playbook_service.py` | Scenario-family cognition |
| Safeguarding terms | `indicare_intelligence_core_service.py` `SAFEGUARDING_CRITICAL_TERMS` | Depth escalation trigger |

### Answer standard (required when relevant)

From `orb_operating_brain.py`:
- Direct answer, why it matters, what to check, what to record, what to escalate, what to update, evidence needed, what ORB cannot decide, confidence level, safe next step.

### Safety rules — must not

- Make final safeguarding decisions
- Replace registered manager
- Diagnose a child
- Make allegations as fact
- Invent evidence
- Override provider policy
- Give legal certainty

### Modes available

Ask ORB, Record This Properly, Review With ORB, Manager Copilot, Ofsted Lens, Reg 44 Mode, Reg 45 Mode, RI Mode, Staff Coach, Therapeutic Reframe, Safeguarding Thinking, Document Mode, Pattern Mode, What Am I Missing?

---

## Knowledge modules

| Module | File | Content |
|--------|------|---------|
| Regulatory framework | `regulatory_framework.py` | Children's Homes Regulations framing |
| Reg 44/45 | `reg44_reg45.py` | Independent visitor / quality of care |
| Quality Standards | `quality_standards.py` | SCCIF quality standards alignment |
| Working Together | `working_together.py` | Statutory safeguarding partnerships |
| Contextual safeguarding | `contextual_safeguarding.py` | Extra-familial harm |
| Trauma informed | `trauma_informed.py` | Trauma-responsive practice |
| Therapeutic language | `therapeutic_language.py` | Child-centred wording |
| Safe recording | `safe_recording.py` | Factual recording guidance |
| Medication/restraint | `medication_restraint.py` | High-risk domains |
| Inspection readiness | `inspection_readiness.py` | Ofsted preparation |
| Pace/attachment | `pace_attachment.py` | Therapeutic parenting |
| Neurodevelopmental | `neurodevelopmental.py` | SEND/neurodiversity |
| Leadership/management | `leadership_management.py` | Management oversight |

### JSON brains

- `orb_quality_standards_brain.json` — QS mapping
- `orb_recording_framework.json` — 20+ record types with safeguarding/child voice checks
- `trusted_sources_registry.json` — gold/silver source tiers
- `guidance_sources.json` — official guidance references
- `orb_scenario_sequences.json` — multi-turn sequences
- `micro_interventions.json`, `reflective_questions.json`, `shift_flows.json`

---

## Regulation citations and frameworks

| Framework | Present in knowledge | Citation enforcement |
|-----------|---------------------|----------------------|
| Children's Homes Regulations 2015 | Yes | `regulation_mapper.py`, source registry |
| SCCIF (children's homes) | Yes | `ofsted_sccif` anchors in scenarios |
| Quality Standards | Yes | Dedicated brain + framework fields |
| Working Together 2023 | Yes | Scenario anchors, safeguarding module |
| Reg 44 | Yes | `reg44_reg45.py`, scenario `expected_reg44_questions` |
| Reg 45 | Yes | Recording framework `reg_45_reflection` type |
| NICE self-harm | Yes | Scenario anchors GOLD-015+ |
| Missing from care guidance | Yes | Dedicated scenario family |

**Citation enforcer:** `assistant/citation_enforcer.py`, `services/orb_exact_citation_service.py`  
**Gold sources:** `auto_apply_allowed: false` for statutory sources (verified in `test_orb_9_expert_brain.py`)

---

## Fallback behaviour

| Condition | Behaviour |
|-----------|-----------|
| No OS records (standalone) | Static sector knowledge; explicit boundary — no invented chronology |
| Low confidence | Hedged language ("consider whether", "may need") |
| Missing provider policy | Prompt to check local policy |
| Quality gate failure | Regenerate or block (e.g. grade prediction) |
| Model provider failure | Failover in `orb_provider_failover` tests |
| Fast path daily note | Deterministic template fast path for simple records |

---

## Hallucination controls

1. **`_COMMON_UNSAFE` phrases** in expert scenarios — blocks claims like "checked the chronology in the system"
2. **Quality gate** — blocks grade prediction, unsafe certainty
3. **Citation decision service** — when to cite vs hedge
4. **Incident report tests** — `test_orb_incident_report_no_invented_facts.py` (16 tests)
5. **Final answer contract validator** — structural compliance
6. **Trusted source registry validation** — registry integrity tests
7. **AI governance** — no raw prompt logging (`test_orb_ai_governance_no_raw_logging.py`)

---

## Local policy caveats

- Operating brain: "Check the provider policy..."
- Recording framework: every type includes `safety_disclaimer: "Draft only — adult review required"`
- Policy brain listed in operating brain modes
- Restraint/medication scenarios anchor `provider_restraint_policy`, `provider_medication_policy`

---

## Safeguarding escalation behaviour

- `SAFEGUARDING_CRITICAL_TERMS` triggers `safeguarding_critical` expert depth
- Escalation monitoring: `assistant/escalation_monitoring.py`
- Regulatory concern detection: `assistant/regulatory_concern_detection.py`
- Voice TTS blocks auto-speech on safeguarding-critical (`test_orb_voice_tts_security.py` — fails without DB but logic present)

---

## Child-centred and therapeutic language

- `therapeutic_language.py`, `pace_attachment.py`, `trauma_informed.py`
- Recording framework: `child_voice_checks` on every record type
- Tests: `test_orb_therapeutic_language_contract.py`, `test_orb_therapeutic_final_answer_guard.py`
- Write modes: therapeutic rewrite, child-centred rewrite in toolbar

---

## Ofsted readiness logic

- Ofsted Lens mode in operating brain
- `inspection_readiness.py`, `orb_ofsted_readiness_scoring` service
- Quality gate **blocks grade prediction** (verified)
- `orb_ofsted_learning_adapter` rejects non-official URLs

---

## Scenario testing matrix

Method: Code review of `assistant/knowledge/orb_expert_scenarios.py` (GOLD scenarios), `orb_regression_test_bank.py` (10 automated regression checks), and pytest quality contracts. **Live LLM inference not run in this audit** (no API keys in audit environment).

| Scenario | Expected quality | Safety issues | Missing safeguards | Weak wording risk | Regulatory gaps | Improvement needed |
|----------|------------------|---------------|-------------------|-------------------|-----------------|-------------------|
| Missing from home | High — exploitation lens, return conversation, notifications | Low if gates hold | Provider-specific ISN thresholds | May under-specify police thresholds | Reg 40 notification timing | Add provider policy injection |
| Return home conversation | High — child voice, presentation | Low | De-escalation if distressed | Therapeutic tone variance | — | Scenario tests in live LLM |
| Self-harm disclosure | High — immediate safety, no diagnosis | Medium — TTS auto-speak blocked | CAMHS/GP pathways | May minimise urgency | NICE alignment good | Live test with crisis language |
| Child exploitation (CSE) | High — contextual safeguarding | Low | Multi-agency referral wording | "Referral required" blocked as certainty | Working Together anchors | Good |
| Online harm / grooming | High — safety planning | Low | Device/search considerations | — | — | Add device preservation prompts |
| Cannabis/substance misuse | High — curiosity not judgement | Low | Harm reduction vs zero tolerance policy | — | — | Local policy caveat |
| Physical intervention | High — debrief, injury, Reg 44 questions | Medium — restraint over-suggestion | Body map, video review | Restraint normalisation risk | Provider restraint policy anchor | Strong |
| Allegation against staff | High — LADO, no fact-finding | **Critical if mishandled** | "Do not investigate" emphasis | Allegation as fact risk | Working Together | Highest priority live test |
| Complaint | Medium-high — child concern pathway | Low | Advocacy routes | — | Reg 44 visibility | Adequate |
| Key work session | High — child voice, goals | Low | Plan linkage | Generic reflection risk | — | Good |
| Daily record | High — fast path available | Low | Safeguarding escalation if harm noted | Over-sanitisation | QS child voice | Good |
| Incident report | High — chronological facts | Medium — invented injury risk | Notification checklist | Blame language | Tests for no invented facts | Strong test coverage |
| Risk assessment | Medium-high — generic without child context | Low | Individualisation prompts | Template feel | — | Needs child-specific inputs |
| Chronology | Medium — standalone cannot access live chronology | Low | Boundary messaging | May imply system access | — | Clarify standalone limits |
| Regulation 44 | High — evidence review questions | Low | Visitor independence | — | Dedicated framework type | Good |
| Regulation 45 | High — quality reflection | Low | Manager accountability | — | `reg_45_reflection` type | Good |
| Management oversight | High — manager brain mode | Low | Sign-off boundaries | — | — | Good |
| Child voice | High — explicit checks in framework | Low | Age-appropriate communication | Paraphrase vs quote | — | Good |
| Family contact | High — distress triggers | Low | Contact suspension thresholds | — | — | Good |
| Medication recording | High — no default restraint for refusal | **Critical if suggests restraint** | MAR chart accuracy | GOLD-022 blocks restrain for meds | Provider medication policy | Strong scenario |
| Education concern | Medium-high — PEP/EHCP | Low | School partnership | — | — | Adequate |
| Whistleblowing | Medium — may lack dedicated scenario | Medium | PIDA/whistleblowing policy | Generic HR routing | No dedicated GOLD scenario found | **Add scenario** |
| Emergency escalation | High — immediate danger terms | Low | 999 vs manager first | — | — | Good |

---

## Regression bank (automated — no LLM)

`tests/test_orb_9_expert_brain.py` validates 10 scenarios via `orb_expert_brain_orchestrator_service.run_regression_check()`:
- Packet shape (version orb_9, expert_packet, whole_child_lens, missingness_graph)
- `must_not_violations` empty
- `passed: true`

**These pass without live LLM** — they test orchestration and guardrails, not final answer prose quality.

---

## Brain parity across surfaces

| Surface | Same brain? | Evidence |
|---------|-------------|----------|
| Chat | Yes | `indicare_intelligence_core_service` |
| Dictate analyse/generate | Yes | `test_orb_dictate_brain_parity.py` (9 tests) |
| Voice | Yes | `orb_voice_session_service` routes through standalone brain |
| Write rewrites | Yes | Brain-route with `surface=write` |
| Templates | Yes | Template generation service |

---

## Key gaps

1. **Whistleblowing** — no dedicated GOLD scenario found
2. **Live LLM scenario evaluation** — regression checks orchestration only; prose quality unverified in this audit
3. **Provider policy injection** — standalone users have no home policy upload in Residential product
4. **Local authority thresholds** — ISN/referral thresholds vary; brain hedges but cannot be specific
5. **Founder AI router unmounted** — strategic brain oversight separate from product brain

---

## Verdict

The ORB brain is **architecturally mature** with explicit safety rules, scenario banks, quality gates, and cross-surface parity. **Safeguarding-critical domains are well-modelled in knowledge** with strong test contracts for the highest-risk failures (invented facts, grade prediction, medication restraint). **Live answer quality remains unverified** in this audit without API inference runs. Recommend Quality Lab live runs before pilot.
