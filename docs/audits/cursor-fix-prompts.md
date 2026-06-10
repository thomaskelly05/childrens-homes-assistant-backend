# Cursor-Ready Fix Prompts (Phase 18)

**Do not execute yet.** Scoped prompts for follow-up build sessions.

---

## 1. ORB Production Build Fix

Fix the Next.js production build failure caused by `lib/founder/revenue/revenue-server-context.ts` importing `next/headers` in a client-importable chain (`founder-evidence-page.tsx` → `evidence-source-builder.ts` → `revenue-source-builder.ts`). Split server-only revenue fetching from client-safe builders so `npm run build` passes. Verify with `cd frontend-next && npm run build`. Do not change ORB Residential product behaviour.

---

## 2. ORB Billing Modal Launch Polish

Fix all failing frontend contract tests related to ORB billing: `ORB Residential ChatGPT parity`, `ORB settings profile and billing modals`, `ORB Residential launch polish`, `ORB Residential desktop final UX regressions`. Ensure billing modal shows plan, usage, spending cap, full ORB Residential feature list, sticky footer, and viewport-safe scroll on desktop and mobile. Run `npm run test:orb` until billing-related suites pass.

---

## 3. ORB Dictate V1 Launch Readiness

Audit and harden the Dictate → Write → Export golden path for pilot launch. Ensure `POST /orb/dictate/finalise` handoff to Write is reliable, export PDF works from both Dictate and Write, and every generated document shows the draft disclaimer prominently. Add telemetry events `orb_dictate_completed` and `orb_write_exported` to `/orb/standalone/analytics/event` without storing narrative content. Add Playwright E2E covering dictate station on mobile viewport.

---

## 4. ORB Voice Beta Hardening

Fix failing voice contract tests: `ORB OpenAI realtime voice response flow`, `ORB mobile premium Voice copy` ("Tap to hear ORB"), `ORB residential theme runtime` (glass orb marks), post-session Dictate handoff copy. Ensure WebRTC stub endpoints return clear UI messaging. Add voice session duration to usage meter. Label voice station as beta in UI until E2E passes. Do not remove WebSocket STT/TTS path.

---

## 5. ORB Safeguarding Live Scenario Gate

Add whistleblowing GOLD scenario to `assistant/knowledge/orb_expert_scenarios.py`. Create a nightly CI job (or manual script) that runs 10 GOLD scenarios through live LLM via `orb_expert_brain_orchestrator_service` and logs results to Quality Lab. Fail CI if `must_not_violations` or `quality_gate` critical flags appear. Store results in `orb_learning_ledger` without raw child narratives.

---

## 6. ORB Privacy and Retention UX

Add `/orb/profile` or settings section covering: what data is stored (transcripts, saved outputs), retention period, how to request deletion, subprocessors link, and local policy reminder. Wire deletion request to support email. Ensure no child names in analytics events. British English copy. Do not change backend telemetry sanitisation blocklists.

---

## 7. Stripe Production Launch Flow

Configure and verify end-to-end ORB Residential Stripe flow on staging: signup → trial → checkout → webhook → portal → cancel. Ensure `STRIPE_*` env vars documented in `.env.example`. Fix any failing tests in `test_orb_stripe_*`. Verify `GET /orb/standalone/access` returns correct states after webhook. Frontend: billing success page refreshes subscription state.

---

## 8. ORB Login and Front Door Polish

Fix failing tests: login hero sphere clipping, single hero sphere on desktop, OAuth provider URL wiring (`orbOAuthStartUrl` must use backend standalone routes), passkey copy alignment. Verify `OrbAuthGate` state machine has no redirect loops. Run `e2e/orb-auth-register-billing.spec.ts` and `e2e/orb-login-scroll-reachability.spec.ts`.

---

## 9. ORB Write DOCX Export

Add DOCX export to ORB Write panel matching existing `/templates/export/docx` backend capability. User should export current Write document as DOCX from mobile and desktop toolbars. Maintain PDF and print. Include draft disclaimer in exported document header.

---

## 10. ORB Telemetry Completeness

Instrument ORB Residential frontend to fire sanitised analytics events for: `station_opened`, `onboarding_step`, `dictate_completed`, `voice_session_ended`, `write_exported`, `template_generated`, `checkout_started`, `checkout_completed`. Extend founder telemetry summary to show top stations and conversion funnel counts. No prompt/transcript/child name in metadata. Verify against `BLOCKED_METADATA_KEYS` in `founder_telemetry_db.py`.
