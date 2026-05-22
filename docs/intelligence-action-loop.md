# Intelligence Action Loop

Stage 3 of the IndiCare Intelligence Spine: proposed actions, manager decisions, and audit trails.

## Principle

**IndiCare suggests. The manager decides. The audit trail records the decision.**

Nothing in this layer automatically accepts actions, makes safeguarding decisions, or produces inspection judgements.

## Flow

1. Intelligence spine analyses records (patterns, brief, evidence graph, record quality, Ofsted simulation).
2. `IntelligenceActionService` converts findings into **proposed** actions (`status: proposed`).
3. Spine returns `proposed_actions` and `action_summary` (default — no DB write).
4. Manager reviews via OS UI or API:
   - **Accept** — track as accepted / in progress
   - **Dismiss** — record reason, no automatic escalation
   - **Complete** — closure with notes
   - **Supersede** — replaced by a newer action
5. Each step appends to `audit_trail` (actor, event, reason, timestamp).

Optional: `create_actions: true` on spine request persists proposals to `intelligence_actions`.

## Oversight reviews

`POST /intelligence/oversight-reviews` records a manager oversight decision linking finding IDs and action IDs. Used for audit and follow-up scheduling — not automated case management.

## Action types

| Type | Typical trigger |
|------|-----------------|
| `safeguarding_review` | Safeguarding concern without visible manager review |
| `missing_follow_up` | Missing episode without return home interview link |
| `risk_assessment_review` | Stale risk assessment after incident / restraint |
| `manager_signoff` | Manager review missing on significant events |
| `record_quality_review` | Weak or developing record quality |
| `child_voice_follow_up` | Limited child voice in records |
| `evidence_gap_review` | Evidence graph gap |
| `ofsted_evidence_strengthening` | Limited/emerging simulation strength |
| `reg44_action_review` / `reg45_action_review` | Open regulatory actions |

## Language

Use: review recommended, manager oversight suggested, action proposed, source review required, human decision required.

Never use: confirmed breach, substantiated allegation, failed Ofsted, guaranteed compliance, safeguarding decision made, Ofsted grade predicted.

## Known gaps

- Frontend decision buttons not yet wired to API
- No email/notification dispatch on urgent actions
- OS command centre action board not merged with intelligence actions table
- Child/staff scoped action ownership assignment is manual
