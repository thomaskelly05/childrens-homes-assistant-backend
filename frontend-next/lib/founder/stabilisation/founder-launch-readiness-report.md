# Founder OS Launch Readiness Report

**Version:** Stabilisation & Launch Readiness V1  
**Date:** June 2026  
**Repository:** thomaskelly05/childrens-homes-assistant-backend

---

## Summary

Founder OS is stabilised for founder/admin use: fast bootstrap hydration, honest empty states, approval-gated external outputs, auditable persistence, and no invented traction metrics. ORB Founder answers from connected data only and blocks external posting.

---

## Route coverage

| Area | Routes | Status |
|------|--------|--------|
| Command centre | `/founder` | ✓ |
| ORB Founder | `/founder/orb` | ✓ |
| Founder Team | `/founder/team`, `/founder/team/[role]` | ✓ |
| Operating Loop | `/founder/operating-loop`, `/founder/operating-loop/[runId]` | ✓ |
| Intelligence | `/founder/intelligence`, briefings | ✓ |
| Memory | `/founder/memory` | ✓ |
| Evidence | `/founder/evidence`, `/founder/evidence/[packId]` | ✓ |
| Relationships | `/founder/relationships`, detail | ✓ |
| Revenue | `/founder/revenue`, `/founder/revenue/forecast` | ✓ |
| Quality Lab | `/founder/quality-lab` | ✓ |
| Actions | `/founder/actions` | ✓ |
| Approvals | `/founder/approvals` | ✓ |
| Content | `/founder/content` | ✓ |
| Build Briefs | `/founder/build-briefs` | ✓ |
| Telemetry | `/founder/telemetry` | ✓ |
| Audit | `/founder/audit` | ✓ |

All pages: `FounderGuard` + founder nav + `FounderPersistenceHydrator` bootstrap.

---

## Access-control coverage

| Control | Coverage |
|---------|----------|
| Page `FounderGuard` | 25/25 pages |
| API `requireFounderSession` | All founder data routes except health + telemetry/event |
| Staff nav exposure | None |
| Unauthenticated redirect | `/orb?returnUrl={path}` |
| Non-founder | 403 UI (pages), 403 JSON (API) |
| Backend second gate | `/founder-os/*` on FastAPI |

---

## Approval gate coverage

| Output type | Approval required | Mechanism |
|-------------|:-----------------:|-----------|
| LinkedIn drafts | ✓ | `generateLinkedInDraft` → Approval Centre |
| Provider messages | ✓ | `relationship-message` approval type |
| Investor messages | ✓ | `investor-update` / content drafts |
| Relationship follow-up drafts | ✓ | `generateFollowUpDraft` → approvals |
| Evidence packs | ✓ | Pack status `needs-review`; approve before external |
| Founder briefings | ✓ | External briefing types → `founder-briefing` approval |
| Founder narratives | ✓ | `founder-narrative` + narrative approve route |
| Revenue forecasts/claims | ✓ | `revenue-claim` approval type |
| Quality improvement proposals | ✓ | Proposal → approval on approve |
| ORB production knowledge | ✓ | No automatic ORB brain changes in operating loop |
| Public claims | ✓ | `public-claim` approval type + safety check |

ORB Founder explicitly blocks post/send/publish/deploy requests.

---

## Live data sources

| Source | Connected via | Missing behaviour |
|--------|---------------|-------------------|
| Persistence (actions, approvals, etc.) | Bootstrap `/founder-os/bootstrap` | Empty stores; degraded banner if busy |
| Telemetry summary | Bootstrap | Empty summary; honest zeros |
| Providers | Bootstrap liveSummary | "No records" — no fake counts |
| Homes | Bootstrap liveSummary | "No records" |
| Inspection evidence preparation | Bootstrap liveSummary | Unavailable section; no crash |
| ORB billing usage | Bootstrap liveSummary | MRR unavailable; AI cost if present |
| ORB feedback summary | Bootstrap liveSummary | ORB analytics empty |
| Quality Lab overview | `/api/founder/quality-lab/overview` | Empty state on page |
| Revenue snapshot | `/api/founder/revenue/snapshot` | "Revenue unavailable" |
| Intelligence snapshot | `/api/founder/intelligence/snapshot` | Empty state card |
| Audit log tail | `/api/founder/persistence/audit-log` | "No audit events recorded yet" |

Bootstrap does **not** fail fully when Inspection evidence preparation, billing or feedback is unavailable — `sectionErrors` + `FounderDegradedBanner`.

---

## Empty state coverage

| Page | Empty state |
|------|-------------|
| Revenue | No live MRR — dashes and limitations |
| Relationships | No relationships recorded |
| Evidence | No evidence packs yet |
| Quality Lab | No quality runs yet |
| Actions | No live founder actions yet |
| Approvals | No approvals waiting |
| Content | No content drafts yet |
| Build briefs | No build briefs yet |
| Telemetry | No live telemetry yet |
| Operating loop | No persisted runs yet |
| Memory | "Not recorded yet" for defaults |
| Intelligence | No intelligence snapshot yet |

No mock numbers. No fake traction.

---

## Performance budget (met)

- `/founder` dashboard: **1 bootstrap call** (+ auth/me)
- Core pages interactive from bootstrap-hydrated stores
- No page blocks on optional live source failure
- Optional live failures → degraded banner + empty states
- Request storm fixes: see `request-storm-audit.md`

---

## Persistence & audit

| Entity | Persists | Hard delete |
|--------|:--------:|:-----------:|
| Actions | ✓ | Archive only |
| Approvals | ✓ | No |
| Content drafts | ✓ | Archive |
| Build briefs | ✓ | Archive |
| Quality runs | ✓ | No |
| Expert reviews | ✓ | No |
| Memory | ✓ | Archive |
| Evidence packs | ✓ | Archive only |
| Relationships | ✓ | Archive only |
| Revenue forecasts | ✓ | No |
| Intelligence briefings | ✓ | No |
| Operating loop runs | ✓ | No |
| Audit logs | ✓ | No |

Audit events written for create/update/archive/approve/reject.

---

## Operating loop hardening

- Founder-only via API session gate
- Sequential agent execution — one failure does not crash all agents
- Outputs persisted to store + backend
- Audit logs on run start/complete
- External outputs → approvals only
- No automatic posting/sending/deployment
- No production ORB brain changes
- Degraded state when telemetry/quality/memory missing

---

## Known limitations

1. Page-level founder check is client-side only (middleware checks session cookie).
2. `/api/founder/telemetry/event` accepts any authenticated user (platform-wide events).
3. Revenue MRR requires live billing rollup — provider count alone does not imply revenue.
4. Feature events adapter not connected — product intelligence limited without usage events.
5. Audit log not included in bootstrap — one extra GET on audit page.
6. Intelligence snapshot requires separate GET — not duplicated in bootstrap payload.
7. Legacy `/founder-hq` (vanilla frontend) is a separate surface from `/founder`.

---

## Remaining risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Client-side-only page guard | Medium | API + backend gates; no sensitive data in page props |
| Permission-only founder UI access | Low | Backend rejects non-founder roles |
| ORB Founder deterministic engine | Low | Live guards + safety checks on all drafts |
| Quality Lab upstream timeout | Low | 503 + empty state on page |

---

## Recommended next builds (outside `/founder`)

1. **ORB Residential product work** — return focus to residential staff workflows.
2. Server-side founder role check in middleware (optional hardening).
3. Connect live billing rollup for honest MRR on revenue dashboard.
4. Feature events telemetry for product intelligence depth.
5. LinkedIn OAuth post flow (still approval-gated).
6. Inspection evidence preparation per-home anonymised scores when API matures.

---

## Test coverage added

- `lib/founder/orb-founder/orb-founder-engine.test.ts` — ORB regression scenarios
- `lib/founder/safety/founder-output-safety.test.ts` — claim and PII safety
- `lib/founder/stabilisation/founder-pages.smoke.test.ts` — page smoke contract
- `lib/founder/stabilisation/founder-performance-budget.test.ts` — performance rules

Run:

```bash
cd frontend-next && npm run typecheck
node --import tsx --test lib/founder/**/*.test.ts components/founder/**/*.test.ts
```

---

**Verdict:** Founder OS is launch-ready for Thomas — fast, safe, founder-only, approval-gated, auditable, and honest about missing data.
