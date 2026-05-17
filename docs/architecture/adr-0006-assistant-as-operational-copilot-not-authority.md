# ADR-0006 — Assistant as operational copilot, not operational authority

Status: Accepted
Date: 2026-05-17
Decision makers: CTO / assistant architecture / operational governance

---

# Context

IndiCare OS includes:

- standalone ORB assistant;
- in-shell assistant experiences;
- chronology-backed retrieval;
- evidence traversal foundations;
- operational memory foundations;
- provider-scoped assistant context;
- safeguarding-aware retrieval direction;
- therapeutic recording direction.

The assistant layer is becoming increasingly capable.

This creates a significant architectural and safeguarding risk:

assistant systems can unintentionally become perceived operational authorities.

In residential children’s homes this is unsafe.

Professional judgement, safeguarding oversight and leadership accountability must remain human responsibilities.

A formal platform decision is therefore required.

---

# Decision

Assistant and ORB systems are positioned as:

- operational copilots;
- reflective support systems;
- chronology/evidence navigation systems;
- drafting and retrieval assistants.

They are NOT:

- autonomous operational authorities;
- safeguarding decision-makers;
- diagnostic systems;
- risk-scoring engines;
- final evidential authorities.

Operational truth remains grounded in:

- chronology;
- operational memory;
- provider-scoped evidence;
- professional review;
- leadership oversight.

---

# Consequences

## Positive consequences

### 1. Safer safeguarding posture

The platform avoids:

- AI overreach;
- unsafe automation;
- pseudo-clinical authority;
- unsupported operational certainty.

---

### 2. Stronger operational trust

Users can increasingly trust that:

- chronology remains authoritative;
- evidence remains reviewable;
- assistant output remains explainable;
- professional accountability remains visible.

---

### 3. Better assistant explainability

Assistant systems should increasingly support:

- chronology citations;
- evidence linkage;
- operational context references;
- replay-aware reasoning.

This is safer than opaque generated conclusions.

---

### 4. Better therapeutic alignment

Assistant systems can support:

- reflective practice;
- calm operational summaries;
- child-centred language;
- emotionally intelligent drafting.

Without becoming:

- behaviour-labelling infrastructure.

---

# Assistant requirements

## Assistant retrieval must be chronology-backed

Assistant operational retrieval should increasingly rely on:

- chronology projections;
- evidence traversal;
- operational memory;
- provider-scoped operational context.

Avoid free-floating summarisation.

---

## Assistant outputs should remain bounded

Assistant systems should:

- express uncertainty appropriately;
- avoid unsupported certainty;
- avoid deterministic safeguarding labels;
- avoid clinical interpretation;
- encourage review where appropriate.

---

## Assistant drafting should remain reviewable

Assistant-generated drafts should:

- remain editable;
- remain reviewable;
- remain attributable;
- avoid auto-signoff.

Human review remains mandatory.

---

## Assistant systems must respect ProviderContext

Assistant systems must:

- preserve provider scope;
- preserve home scope;
- preserve policy-engine decisions;
- avoid cross-provider retrieval.

Assistant retrieval is not exempt from operational trust boundaries.

---

# Rejected alternatives

## Alternative: autonomous safeguarding assistant

Rejected because:

- unsafe operational authority;
- safeguarding risk;
- explainability concerns;
- professional accountability concerns.

---

## Alternative: AI-generated operational truth

Rejected because:

- chronology and evidence remain authoritative;
- replayability matters;
- professional review matters.

Assistant systems may support interpretation, not replace operational truth.

---

## Alternative: predictive risk scoring

Rejected because:

- weak explainability;
- pseudo-clinical authority risk;
- safeguarding and bias concerns.

---

# Operational UX implications

The assistant experience should feel:

- calm;
- reflective;
- operationally useful;
- evidence-aware;
- emotionally intelligent.

It should NOT feel like:

- a command authority;
- an autonomous decision-maker;
- a surveillance engine;
- or a punitive compliance monitor.

---

# Implementation guidance

Future assistant work should:

1. increase chronology/evidence linkage;
2. improve replay-aware retrieval;
3. improve provider-scoped operational reasoning;
4. improve reflective drafting support;
5. avoid unsupported operational claims;
6. preserve human review and sign-off.

---

# Strategic outcome

This decision establishes ORB and assistant systems as:

- reflective operational copilots;
- chronology-aware support systems;
- evidence-aware operational assistants;
- therapeutically aligned support infrastructure.

Rather than:

- autonomous operational authorities;
- predictive safeguarding engines;
- AI-led replacement decision systems.
