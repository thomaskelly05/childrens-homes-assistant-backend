# IndiCare Intelligence Perfect 10 — Examples

## Non-care (general_light)

**User:** What is the capital of France?

**Depth:** `general_light`  
**Care score:** &lt; 35  
**Behaviour:** Concise factual answer; no forced Ofsted/residential framing. Brain still scans for safety terms.

---

## Vague care (residential_light)

**User:** What do I do?

**Depth:** `residential_light` or higher  
**Hidden flag:** `vague_care_prompt`  
**Behaviour:** Practical shift guidance; does not fall through as generic chatbot.

---

## Missing episode (residential_deep / safeguarding_critical)

**User:** Young person returned after missing 3 days, smells of cannabis and is refusing to talk.

**Depth:** `residential_deep` or `safeguarding_critical`  
**Domains:** `missing_from_home`, `exploitation_cse_cce`  
**Layers:** safeguarding, missing_episode, child_voice, recording  
**Must include:** safety, manager, social worker, return, record, risk  
**Must not:** grade prediction, fake OS access, “definitely exploitation”

---

## Ofsted readiness (residential_standard+)

**User:** Ofsted are here tomorrow — what evidence should I focus on?

**Depth:** `residential_standard` or `residential_deep`  
**Quality standards:** QS8 leadership, QS7 protection  
**Must not:** predict outstanding/inadequate grades

---

## Packet excerpt (illustrative)

```json
{
  "version": "indicare_intelligence_10",
  "expert_depth": "residential_deep",
  "care_relevance_score": 72,
  "registered_home_domains": ["missing_from_home", "exploitation_cse_cce"],
  "active_intelligence_layers": [
    "safeguarding_intelligence",
    "missing_episode_intelligence",
    "recording_intelligence"
  ]
}
```
