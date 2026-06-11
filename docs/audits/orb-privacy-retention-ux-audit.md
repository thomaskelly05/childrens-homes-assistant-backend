# ORB Privacy, Retention & Data Classification UX Audit

**Product:** ORB Residential (standalone `/orb`)  
**Audit date:** 2026-06-11  
**Purpose:** Closed pilot privacy transparency, data classification UX and honest retention disclosure  
**Version:** 1.0.0-closed-pilot

---

## Executive summary

| Area | Status | Honest assessment |
|------|--------|---------------------|
| Data inventory | Documented | Strong in code; previously scattered |
| Retention enforcement | **Not implemented** | Policy notices only — no scheduled purge/TTL jobs |
| Deletion | Partial | Saved outputs and projects deletable; no full account erasure |
| Export | Partial | Workspace JSON + per-output export; no unified SAR export |
| Telemetry redaction | **Implemented** | Client + server blocked keys; tests exist |
| Privacy UX | **Implemented (V1)** | `/orb/privacy`, classification guidance, in-context notices |
| Privacy requests | **Implemented (V1)** | Manual review queue in `orb_privacy_requests` |

**Closed pilot readiness:** Suitable for closed pilot with documented limitations. Users can see Green/Amber/Red guidance, what is stored, retention honesty, and how to raise requests. Retention automation and self-service deletion remain future work.

---

## Data type audit

### 1. ORB chat prompts and responses

| Field | Detail |
|-------|--------|
| **Collected** | User messages, last 20 history turns, optional document text, project memory, images (max 4), mode metadata |
| **Stored** | Browser `orb-standalone-workspace-v2`; usage metadata in `orb_usage_events`; optional feedback snapshots in `orb_feedback` |
| **Child-identifiable** | Yes — if user enters it |
| **Optional/required** | Required for chat feature; history optional (temporary chat) |
| **Retention** | User-controlled on device; no server chat archive; usage rows indefinite |
| **Deletion** | Client clear helpers; no server delete API |
| **Export** | `exportStandaloneWorkspaceJson()` |
| **Risk** | Medium |
| **UX wording** | "Do not include unnecessary identifiable information. Use anonymised or minimal details where possible." |

### 2. ORB Voice audio and sessions

| Field | Detail |
|-------|--------|
| **Collected** | Spoken turns, transcripts, mode, voice profile, privacy mode |
| **Stored** | In-process/Redis session store (TTL ~2h); optional `orb_saved_outputs` |
| **Child-identifiable** | Yes — if spoken |
| **Optional/required** | Optional feature |
| **Retention** | Raw audio not stored by default; session TTL ~2 hours |
| **Deletion** | Session expiry; no bulk delete flow |
| **Export** | Save transcript to outputs |
| **Risk** | Medium |
| **UX wording** | "Voice sessions may create transcripts. Do not use ORB for emergencies." |

### 3. ORB Dictate audio and transcripts

| Field | Detail |
|-------|--------|
| **Collected** | Audio upload (≤25MB), transcript, generated note, consent flags |
| **Stored** | Temp `_tmp_dictate_uploads/` (deleted after transcribe); browser `orb-dictate-drafts`; optional `orb_saved_outputs` |
| **Child-identifiable** | Yes |
| **Optional/required** | Optional |
| **Retention** | Upload ephemeral; drafts capped at 20; saved outputs user-controlled |
| **Deletion** | Dictate delete does not remove saved output copies |
| **Export** | PDF/DOCX/markdown via API |
| **Risk** | High |
| **UX wording** | "Check the final record before use. You remain responsible for accuracy and escalation." |

### 4. ORB Write drafts

| Field | Detail |
|-------|--------|
| **Collected** | Rough text, generated body, versions |
| **Stored** | Browser `orb-write-local-draft-v1` |
| **Child-identifiable** | Yes |
| **Retention** | User-controlled until cleared |
| **Deletion** | Client-side |
| **Export** | Print/PDF via dictate export |
| **Risk** | Medium |

### 5. Saved outputs

| Field | Detail |
|-------|--------|
| **Collected** | Title, markdown, tags, project link, metadata |
| **Stored** | PostgreSQL `orb_saved_outputs`; browser fallback |
| **Child-identifiable** | Yes |
| **Retention** | Indefinite — **not technically enforced** |
| **Deletion** | `DELETE /orb/standalone/outputs/{id}` |
| **Export** | markdown/plain/json/html |
| **Risk** | High |

### 6. Projects

| Field | Detail |
|-------|--------|
| **Collected** | Title, description, memory, chat IDs |
| **Stored** | `orb_projects`, `orb_project_chats`; browser mirror |
| **Child-identifiable** | Possible in memory |
| **Retention** | Indefinite until deleted |
| **Deletion** | `DELETE /orb/projects/{id}` |
| **Risk** | Medium |

### 7. Templates

| Field | Detail |
|-------|--------|
| **Collected** | Filled sections at request time only |
| **Stored** | Static registry; not persisted unless saved as output |
| **Child-identifiable** | Only if user enters |
| **Risk** | Low |

### 8. Exports and PDFs

| Field | Detail |
|-------|--------|
| **Collected** | Generated export files |
| **Stored** | Downloaded to device; server temp ephemeral |
| **Child-identifiable** | Yes — mirrors source content |
| **Risk** | High |

### 9. Telemetry

| Field | Detail |
|-------|--------|
| **Collected** | Event type, category, route, mode, token counts, latency |
| **Stored** | `founder_os_telemetry_events`, `orb_usage_events`; capped browser buffers |
| **Child-identifiable** | **Should not be** — redaction enforced |
| **Retention** | No TTL — queries use 30–90 day windows |
| **Risk** | Low |

**Telemetry redaction (Phase 10):**

- Server: `db/founder_telemetry_db.py` — `BLOCKED_METADATA_KEYS`, `reject_identifiable_metadata()`
- Client: `frontend-next/lib/founder/telemetry/founder-telemetry-redaction.ts`
- Tests: `tests/test_founder_telemetry_db.py`, `frontend-next/lib/founder/telemetry/founder-telemetry.test.ts`

**Does NOT store:** child names, staff names, full prompts, full transcripts, safeguarding narratives, generated document text, provider-identifiable safeguarding detail.

**Gap:** `orb_feedback` stores trimmed Q&A snapshots (up to ~6KB) for quality review — disclosed honestly.

### 10. Billing and subscription metadata

| Field | Detail |
|-------|--------|
| **Collected** | Email, Stripe IDs, plan, trial dates |
| **Stored** | `users`, `orb_subscriptions`, `orb_trials`, `orb_stripe_events` |
| **Child-identifiable** | No |
| **Retention** | Billing/legal retention |
| **Risk** | Low |

### 11. Account, user and session data

| Field | Detail |
|-------|--------|
| **Collected** | Credentials, session cookies, MFA, preferences |
| **Stored** | `users`, `orb_user_preferences`, HTTP-only cookies |
| **Retention** | While account active |
| **Deletion** | No self-service account erasure |
| **Risk** | Medium |

### 12. Founder analytics redaction

| Layer | Location |
|-------|----------|
| Telemetry metadata | `db/founder_telemetry_db.py` |
| Founder persistence | `db/founder_persistence_db.py` — `sanitise_payload()` |
| Learning ledger | `services/orb_learning_ledger_service.py` — prompt summaries only |
| AI redaction | `services/ai_redaction_service.py` |

---

## V1 implementation delivered

| Phase | Deliverable | Path |
|-------|-------------|------|
| 1 | Audit | `docs/audits/orb-privacy-retention-ux-audit.md` |
| 2 | Classification framework | `frontend-next/lib/orb/privacy/orb-data-classification.ts` |
| 3 | Privacy contracts | `frontend-next/lib/orb/privacy/orb-privacy-types.ts` |
| 4 | Content builder | `frontend-next/lib/orb/privacy/orb-privacy-content.ts` |
| 5 | Privacy page | `/orb/privacy` |
| 6 | In-context notices | Chat, Voice, Dictate, Write, Export surfaces |
| 7 | Retention status card | `components/orb/privacy/orb-retention-status-card.tsx` |
| 8 | Privacy requests UX | `/orb/privacy/requests` |
| 9 | Request storage | `orb_privacy_requests` table + API routes |
| 10 | Telemetry audit | Documented above — existing redaction confirmed |
| 11 | Pilot notice | `docs/pilot/orb-closed-pilot-privacy-notice.md` |
| 12 | Tests | `frontend-next/lib/orb/privacy/orb-privacy.test.ts`, `tests/test_orb_privacy_routes.py` |

---

## Verification (Phase 13)

| Command | Result |
|---------|--------|
| `cd frontend-next && npm run typecheck` | **PASS** |
| `cd frontend-next && npm run build` | **PASS** |
| `node --experimental-strip-types --test lib/orb/privacy/orb-privacy.test.ts` | **PASS** (11 tests) |
| `python -m pytest tests/test_orb_privacy_routes.py tests/test_founder_telemetry_db.py -q` | **PASS** (6 tests) |

---

## Remaining limitations

1. Retention controls are descriptive — not enforced by scheduled jobs
2. No self-service account deletion or full data export
3. Chat history is device-local — server cannot purge it
4. Feedback table retains trimmed Q&A for quality review
5. Legal pages at `/privacy` remain starter copy — ORB-specific notice is at `/orb/privacy`
6. Privacy request review is manual — not automated

---

## Closed pilot readiness

**Ready for closed pilot** with honest UX and documented limitations. Pilot homes should receive `docs/pilot/orb-closed-pilot-privacy-notice.md` alongside in-app `/orb/privacy`.
