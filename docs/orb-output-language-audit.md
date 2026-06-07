# ORB Output Language Audit

**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Sprint type:** Audit · Design · Document (no production wording changes yet)  
**Date:** June 2026

---

## Purpose

ORB intelligence quality is strong, but some outputs sound **robotic, report-like, or AI-generated** rather than like a calm experienced residential leader. This audit identifies common phrasing patterns and recommends replacements that preserve safeguarding, Ofsted alignment, citations, and professional tone.

**Constraints (unchanged):**
- Keep citations and source grounding
- Keep safeguarding non-conclusion language
- Keep Ofsted evidence-focus (no grade predictions)
- Keep explainability and review-required framing
- Do not weaken ORB Residential / ORB OS boundaries

---

## 1. Pattern categories

### Category A — Passive “source as actor” language

These phrases make guidance sound like a third-party report rather than professional practice advice.

| Current wording | Improved wording | Reason for change |
|---------------|------------------|-------------------|
| What source expects | What good evidence should show | Shifts from abstract “source” to inspector/manager practice lens |
| According to the source | What reviewers should check | Actionable for managers and staff |
| Source indicates | What effective practice looks like | Describes practice, not a document speaking |
| Evidence suggests (standalone guidance) | What managers should consider | More human; still non-conclusive |
| The evidence suggests… | Inspectors may look for… | Aligns with Ofsted evidence framing without sounding algorithmic |
| Source basis (section heading) | Evidence to check · Practice anchors | Less template-like; keeps grounding |
| Source expectation (comparison tables) | What strong practice demonstrates | Professional rather than bibliographic |

### Category B — Over-used “records indicate” (OS / record-linked contexts)

In **ORB Residential standalone**, “records indicate” is often inappropriate (no live records). In **IndiCare OS**, it remains a valid safeguard but should not open every sentence.

| Current wording | Improved wording | Reason for change |
|---------------|------------------|-------------------|
| Records indicate the following evidence base: | Here is what the visible records show for review: | Direct, less formulaic |
| Records indicate a calm day for oversight review | Visible records show a steady day — worth a light oversight check | Natural manager language |
| Records indicate X areas may need manager review | X themes may need a manager look this week | Action-oriented |
| records indicate a pattern for review | A pattern is visible that needs calm manager review | Removes robotic opener |
| Records indicate safeguarding relevance; manager review required | This may need safeguarding oversight — manager review is important | Clearer urgency without template feel |

**Note:** Keep “records indicate” where legally/guardrail-required for OS decision-support (see `risk_intelligence_language.py`, `shift_service.py`). Vary sentence openings in standalone ORB.

### Category C — Agent output template headings

From `orb_agent_orchestrator_service.OUTPUT_FORMAT_INSTRUCTIONS`:

| Current wording | Improved wording | Reason for change |
|---------------|------------------|-------------------|
| ## Evidence / source basis | ## Evidence to check · What inspectors may look for | Less report-template; keeps citation duty |
| ## Evidence theme \| What source expects \| What to look for | ## Theme \| What good evidence shows \| What to check \| Strong examples | Human inspection-prep language |
| ## Area \| Current position \| Source expectation \| Gap | ## Area \| Current position \| What strong practice looks like \| Gap \| Suggested update | Removes “source expectation” column label |
| ## Action \| Why \| Owner placeholder \| Priority \| Source basis | ## Action \| Why \| Owner \| Priority \| Grounded in | Keeps traceability, softer label |

### Category D — Safeguarding guardrail phrases (keep intent, improve voice)

| Current wording | Improved wording | Reason for change |
|---------------|------------------|-------------------|
| Evidence suggests review is required; no automatic safeguarding conclusion has been made | This needs professional review — ORB is not making a safeguarding decision | Same safeguard, clearer voice |
| ORB does not decide safeguarding thresholds | ORB supports reflection — threshold decisions sit with your DSL and local procedures | Warmer, same boundary |
| Use 'records indicate' or 'evidence suggests' when describing records | Describe what the records show; avoid sounding like a system report | Policy-level guidance for prompt authors |

### Category E — Intelligence spine / pattern detection summaries

| Current wording | Improved wording | Reason for change |
|---------------|------------------|-------------------|
| evidence suggests child voice should be sampled across recent records | Child voice may be thin across recent entries — worth sampling in your next review | Specific, manager-usable |
| evidence suggests recording may benefit from manager review | This recording may need a manager look before sign-off | Direct staff guidance |
| evidence suggests strengthening may help inspection sampling | Strengthening this area could help if Ofsted samples it — not a judgement | Keeps non-prediction |
| Manager brief: evidence suggests N review themes | Manager brief: N themes worth a structured look today | Less algorithmic |
| Visible evidence suggests this area has improved | This area looks stronger on visible evidence — confirm in source records | Human review framing |

### Category F — Closers and reflective prompts (already partially sanitised)

Existing sanitisers in `orb_grounded_answer_style_service`, `orb_professional_curiosity_service`, and `shared_institutional_cognition_runtime` already strip:
- “What would you like to explore next?”
- “Generally, I would think about this in five layers —”
- Generic “How can we ensure…?” coaching loops

**Additional patterns to watch:**

| Current wording | Improved wording | Reason for change |
|---------------|------------------|-------------------|
| I cannot see the actual live child record in IndiCare OS, but generally — | I’m working from guidance and what you’ve shared — not live care records | Shorter boundary |
| prepared a source-backed briefing from ORB Knowledge Library material | pulled together guidance from the ORB Knowledge Library | Less meta-AI |
| Based on general practice reasoning rather than a specific confirmed source | Drawing on general residential practice — check your local procedure for specifics | Honest, human |

---

## 2. Files with highest concentration of robotic language

| File | Pattern density | Priority |
|------|-----------------|----------|
| `services/orb_agent_orchestrator_service.py` | Template headings (“What source expects”) | **High** — user-visible agent outputs |
| `services/assistant_prompt_policy.py` | Mandates “evidence suggests” / “records indicate” | **High** — shapes all assistant tone |
| `services/pattern_detection_service.py` | “evidence suggests” / “records indicate” summaries | Medium — OS intelligence |
| `services/indicare_intelligence_spine_service.py` | Manager brief templates | Medium |
| `services/assistant_response_service.py` | “Evidence suggests the key points…” | Medium |
| `services/continuous_intelligence_state_service.py` | “Evidence suggests elevated emotional pressure” | Medium |
| `services/evidence_graph_intelligence_service.py` | “evidence suggests risk assessment may need review” | Medium |
| `services/orb_knowledge_retrieval_service.py` | “Answer using this source basis” (prompt) | Low — internal prompt |
| `frontend-next/app/safeguarding/escalations/page.tsx` | UI guardrail badges | Low — intentional UX copy |

---

## 3. Recommended language principles

### 3.1 Voice model

Write as a **calm experienced registered manager or safeguarding lead**:
- “I’d keep this simple and safe…”
- “Inspectors often look for…”
- “Before you sign this off, check…”
- “What good evidence should show here is…”

### 3.2 Safeguarding language (unchanged intent)

Still required:
- No automatic safeguarding conclusions
- Escalation reminders for immediate risk
- Manager/DSL review framing
- Child-centred, non-punitive recording language

Replace robotic **form** not safeguarding **function**.

### 3.3 Citation language

| Instead of | Use |
|------------|-----|
| According to the source | Under [Reg 13], managers should… |
| Source indicates | SCCIF expects visible evidence of… |
| Evidence suggests (for guidance) | Good practice here includes… |

Inline anchors `[Reg 12]`, `[SCCIF]`, `[Working Together]` already supported via `orb_grounded_answer_style_service.ANCHORS` — prefer these over prose “source says”.

### 3.4 Ofsted alignment

| Instead of | Use |
|------------|-----|
| The evidence suggests inspectors will… | Inspectors may look for… |
| Source expects | What strong evidence demonstrates |
| Inspection outcome language | Evidence-focused review language |

---

## 4. Implementation approach (future sprint)

**Phase 1 — Prompts and templates (low risk)**
- Update `OUTPUT_FORMAT_INSTRUCTIONS` column headers
- Revise `assistant_prompt_policy.SAFETY_RULES` tone guidance
- Add “human voice” block to `STANDALONE_ORB_TONE` / `shared_institutional_cognition_runtime._response_requirements`

**Phase 2 — Generated summary strings (medium risk)**
- `pattern_detection_service`, `indicare_intelligence_spine_service`, `assistant_response_service`
- Requires regression review on OS intelligence surfaces

**Phase 3 — Post-generation style pass (medium risk)**
- Extend `orb_grounded_answer_style_service` with replacement map for robotic openers
- Similar to existing closer sanitisation regexes

**Phase 4 — Do not change**
- `risk_intelligence_language.py` auto-replacements (safety-critical)
- Shift handover guardrails where “records indicate” is contractual
- Safeguarding escalation legal wording in `safeguarding_escalation.py`

---

## 5. Before / after examples (standalone ORB)

### Example 1 — Regulation lookup

**Before:**
> According to the source, Regulation 13 concerns leadership and management. Evidence suggests managers should ensure oversight arrangements are visible.

**After:**
> Regulation 13 sets the leadership and management standard. Inspectors may look for clear oversight, decision trails, and learning after incidents — managers should be able to show how they know the home is running safely day to day.

### Example 2 — Recording support

**Before:**
> Evidence suggests the following recording points. Source indicates child voice and staff response should be documented.

**After:**
> For a strong return-home record, check you have captured: what happened, the young person’s words where possible, immediate safety steps, who was notified, and what follow-up is planned.

### Example 3 — Evidence map (deep)

**Before:**
> ## Evidence theme | What source expects | What to look for

**After:**
> ## Theme | What good evidence should show | What to check | Strong examples

### Example 4 — Safeguarding reflection

**Before:**
> Evidence suggests review is required; no automatic safeguarding conclusion has been made.

**After:**
> This needs calm professional judgement and likely manager/DSL input — ORB is not deciding a safeguarding threshold for you.

---

## 6. Success criteria for language sprint

- [ ] Agent outputs read like senior residential guidance, not AI reports
- [ ] Safeguarding boundaries unchanged in substance
- [ ] Citations and `[Reg X]` anchors preserved or improved
- [ ] OS “records indicate” guardrails retained where legally required
- [ ] User testing: staff describe ORB as “practical” not “formal” or “robotic”

---

## 7. Related documentation

- `docs/orb-intelligence-routing-audit.md` — when to use Quick vs Standard vs Deep (shorter answers need sharper human voice)
- `docs/orb-speed-optimisation-plan.md` — progressive UX copy recommendations
