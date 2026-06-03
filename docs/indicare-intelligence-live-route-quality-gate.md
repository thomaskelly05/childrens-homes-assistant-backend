# IndiCare Intelligence — Live Route Quality Gate Audit

## Routes audited

| Route / service | Intelligence Core packet | Quality gate on answer | Learning ledger |
|-----------------|-------------------------|------------------------|-----------------|
| `POST /orb/standalone/conversation` | Yes | Yes (`evaluate_answer`) | Yes (`record_learning`) |
| `POST /orb/standalone/conversation/stream` | Via shared `_build_standalone_request_context` | Partial (stream path should mirror in follow-up) |
| `orb_converged_general_assistant_service` | Via `prepare_request_bundle` | Via residential `process_answer` |
| `orb_general_assistant_service` | Via retrieval bundle | Existing quality service |
| `POST /orb/standalone/actions/run` | Uses retrieval; Core recommended next | Action-specific |
| OS `/assistant/orb` | Not yet unified to Core | OS paths separate |

## Blocked language (quality gate)

- Ofsted grade prediction (`grade_prediction`)
- Clinical diagnosis certainty (`diagnosis`)
- Fake live OS access (`fake_os_access`)
- Definite referral thresholds (`definite_referral`)

## Standalone conversation flow

1. `_build_standalone_request_context` → `prepare_request_bundle` → Intelligence Core packet  
2. Prompt block injected into grounding  
3. LLM answer  
4. `evaluate_answer` → `context_used.answer_quality_gate`  
5. `record_learning` → in-memory ledger  

## Response metadata

Clients receive under `context_used.indicare_intelligence`:

- `version`, `expert_depth`, `care_relevance_score`
- `active_intelligence_layers`, `registered_home_domains`, `quality_standard_hits`
