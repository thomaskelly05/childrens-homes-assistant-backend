# ORB admin quality review — pre-implementation audit

Audit date: continues from PR #1368 (feedback + usage foundation).

## Current feedback system

| Component | Status |
|-----------|--------|
| `POST /orb/standalone/feedback` | Implemented — premium standalone access |
| `orb_feedback` table (`sql/201_orb_feedback.sql`) | Implemented |
| In-memory fallback when migration missing | Implemented in `orb_feedback_service` |
| Thumbs up/down + reason + comment + snapshots | Implemented |
| OS ID rejection in metadata | Implemented via `reject_standalone_os_ids` |
| Frontend feedback UI | `orb-message-feedback.tsx` wired in care companion |

**Gaps before this PR**

- No persisted improvement candidates
- No admin item list with filters
- No feedback reviewed trail
- Admin summary only at `/orb/standalone/feedback/summary` (no dedicated admin namespace)
- No admin UI

## Current usage / cost tracking

| Component | Status |
|-----------|--------|
| `orb_usage_events` (`sql/200_orb_residential_premium.sql`) | Base table |
| Extended telemetry columns (`sql/201_orb_feedback.sql`) | `route`, `action_id`, `document_lens`, `prompt_tier`, `provider` |
| `record_standalone_orb_usage()` | Writes events from conversation results |
| Cost estimation | Token-based heuristic in `orb_standalone_usage_service` |
| Model routing metadata | `ai_model_router_service` + `ai_cost_policy_service` |

## Current budget guards

| Component | Status |
|-----------|--------|
| `OrbUsageBudgetService` | Daily/monthly soft & hard limits via env |
| Deep research / document daily caps | Env configurable |
| Admin/founding bypass | Role/plan based |
| Safeguarding hard-limit fallback | Safety template instead of dead-end |

**Gaps**

- No per-plan limit config service
- No user-facing billing meter endpoint
- No admin platform usage dashboard

## Current admin capability

| Component | Status |
|-----------|--------|
| `require_admin` dependency | `auth/permissions.py` |
| `GET /orb/standalone/feedback/summary` | Admin-only (legacy path retained) |
| Stripe billing routes | `routers/billing_routes.py` (OS subscription, not ORB meter) |
| AI governance dashboard | `/intelligence/governance/ai` (OS-wide, not ORB-specific admin review) |

## Missing (addressed in this PR)

1. **Admin review UI** — `/admin/orb-quality`
2. **Billing meter** — `GET /orb/standalone/billing/meter`, `GET /orb/admin/billing/usage`
3. **Candidate approval workflow** — persist, approve/reject with audit trail
4. **Plan limits config** — `orb_plan_limits_service.py`

## Recommended implementation (this PR)

1. Add `sql/202_orb_improvement_candidates.sql` + reviewed columns on `orb_feedback`
2. Add `/orb/admin/*` routes for feedback, candidates, billing usage
3. Sync improvement candidates on downvote feedback (review-led, no auto-apply)
4. Admin UI with overview cards, gaps, candidates, feedback table, usage section
5. Billing meter service reading `orb_usage_events` with plan limit states
6. Tests + documentation for commercial readiness before £9.99 launch

## Principle

Feedback creates evidence. Admins approve changes. ORB does not silently rewrite prompts, scenarios, sources or safety rules from unreviewed feedback.
