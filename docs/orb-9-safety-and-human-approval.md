# ORB 9 — Safety and human approval

## Non-negotiables

| Rule | Implementation |
|------|----------------|
| No final safeguarding decisions | Operating brain + orchestrator boundaries |
| No Ofsted grade prediction | Quality gate blocks `grade_prediction`; simulation disclaimers |
| No diagnosis | Quality gate blocks `diagnosis` patterns |
| No random scraping | Watcher requires supplied content; registry-only citations |
| No auto-update statutory/safeguarding/medical/legal | `auto_apply_allowed: false` on gold sources |
| No child-identifiable sector intelligence | Ledger redaction |
| No fake live OS access | `orb_answer_quality_service` + quality gate |
| Distinguish fact / concern / missing / hypothesis | Expert packet + response sequence |

## Human approval paths

1. **Source registry changes** — `source_change_review_service.approve()`
2. **Ofsted learning packets** — `human_approval_required: true` on adapter output
3. **Improvement candidates** (existing `sql/202`) — remain separate; do not merge with auto-apply

## Answer exposure

| `quality_gate.expose_as` | Meaning |
|--------------------------|---------|
| `final` | Passed threshold — show to user |
| `draft_internal` | Failed — return rewrite instructions; do not present as final |

## Thresholds

- High-risk safeguarding: **85**
- Ofsted / Reg 44 / Reg 45: **80**
- Recording rewrite: **75**
- General: **65** (must still pass `safe` dimension)

## Regression

Run `tests/test_orb_9_expert_brain.py` before release. All 10 gold scenarios must pass packet checks.
