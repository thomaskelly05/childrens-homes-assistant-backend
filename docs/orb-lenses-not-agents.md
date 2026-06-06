# ORB Lenses, Not Agents

## Why ORB does not show agents

Standalone ORB Residential is designed for **regulated residential childcare practice**. Staff need:

- Clear, governable actions ("Review this record", "Check safeguarding gaps")
- Human review before anything is applied or shared
- No exposure of internal routing, brain IDs or multi-agent orchestration

The repo already routes intelligence through **IndiCare Intelligence Core** and backend services (`orb_intelligence_bridge_service`, `orb_document_intelligence_service`, `orb_dictate_service`). That architecture stays internal.

## What staff see instead

| Internal concept | Staff-facing surface |
|---|---|
| Document intelligence lenses | Documents & Guidance action buttons |
| Dictate edit modes | ORB Write assistant + Dictate quick actions |
| Recording framework checks | Dictate brain panel, Write quality indicators |
| Chat modes (Safeguarding Thinking, Ofsted Lens) | Chat starters with plain labels |
| Action engine follow-ups | Suggested reply chips after answers |

## Converged registry role

`orb-converged-actions.ts` maps **one id → one governed route**. It does not:

- Spawn sub-agents
- Store child profiles
- Bypass AI governance, redaction or audit
- Add new LLM endpoints

Each entry includes:

- `requiresHumanReview: true`
- `route` pointing to an existing helper
- `highRiskCaution` where safeguarding applies

## Lenses vs agents

**Lens** — a focused review or transformation on provided text (safeguarding lens, Ofsted readiness, easy-read summary). Runs through document intelligence or dictate edit API with fixed instructions.

**Workflow** — a sequence staff initiate (handover, action plan, manager summary). May span Chat → Write via handoff.

**Not an agent** — no autonomous tool loop, no visible "agent panel" in residential nav, no child-scoped memory in standalone ORB.

## Files that must not expose brain metadata

- `orb-assistant-message.tsx` — no `brain_metadata` in UI
- `orb-write-ai-panel.tsx` — "ORB guidance" copy only
- `orb-intelligence-core-panel.tsx` — "What ORB checked" support chips, not architecture labels
- Converged registry — no brain IDs in labels

## OS-level agents (out of scope)

`residential-agents.ts`, `orb-agent-panel.tsx` exist for non-residential / legacy surfaces. They are **not** added to ORB Residential primary navigation.

## Documentation cross-reference

- Audit: `docs/orb-existing-intelligence-convergence-audit.md`
- Registry: `docs/orb-converged-actions-registry.md`
- Convergence map: `docs/orb-existing-feature-convergence-map.md`
