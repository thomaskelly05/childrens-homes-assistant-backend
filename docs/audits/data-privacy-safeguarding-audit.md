# Data, Privacy, GDPR and Safeguarding Audit (Phase 8)

**Audit date:** 10 June 2026

---

## What data is stored

| Data type | Storage | Table/service | Retention |
|-----------|---------|---------------|-----------|
| User account | PostgreSQL | `users` | Indefinite until deletion |
| ORB preferences | PostgreSQL | `orb_user_preferences` | User-scoped |
| ORB subscription | PostgreSQL | `orb_subscriptions` | Commercial record |
| ORB trials | PostgreSQL | `orb_trials` | Commercial |
| Safety acceptance | PostgreSQL | `orb_safety_acceptances` | Versioned |
| Usage events | PostgreSQL | `orb_usage_events` | Metering |
| Saved outputs | PostgreSQL | `orb_saved_outputs` | User-scoped; may contain child narratives |
| Dictate notes | PostgreSQL | Via dictate `/save` | User-scoped |
| Projects/chats | PostgreSQL | `orb_projects`, `orb_project_chats` | User-scoped |
| Voice transcripts | PostgreSQL | `orb_session_store` / session tables | Session-scoped |
| Feedback | PostgreSQL | `orb_feedback` | Product improvement |
| AI usage audit | PostgreSQL | `ai_usage_audit` | Governance |
| Founder telemetry | PostgreSQL | `founder_os_telemetry_events` | Anonymised |
| OAuth linkage | PostgreSQL | `orb_oauth_accounts` | Auth |

---

## Transcript storage

- **Voice:** `services/orb_session_store.py` — PostgreSQL-backed sessions
- **Dictate:** Transcript in note records; export generates document
- **Chat:** Project chat messages in `orb_project_chats` when saved to project
- **Not in telemetry:** `founder_telemetry_db.py` blocks `transcript`, `message`, `prompt`, `safeguarding_narrative` in metadata

---

## Generated reports storage

- `orb_saved_outputs` — primary store for Write/Dictate/Template outputs
- Export generates ephemeral PDF/HTML; persisted copy in saved outputs if user saves
- Operational outputs separate: `orb_operational_outputs` (OS only — not standalone)

---

## Telemetry and PII

### Founder telemetry sanitisation (`db/founder_telemetry_db.py`)

**Blocked metadata keys include:**
- `child_name`, `staff_name`, `provider_name`, `young_person_name`
- `email`, `name`, `prompt`, `message`, `answer`, `transcript`
- `safeguarding_narrative`, `document_text`, `narrative`

**Identifiable pattern detection** on string values.

### ORB analytics (`POST /orb/standalone/analytics/event`)

- Event-based; should not include narrative content (verify client implementation in `lib/orb/`)
- Usage metering via `orb_billing_meter_service` — token/cost counts not content

### AI governance

- `test_orb_ai_governance_no_raw_logging.py` — prompts not logged raw
- `ai_privacy_guard_service.py` — redaction layer
- `ai_usage_audit` — metadata JSON not full prompts (per tests)

---

## Provider name redaction in founder views

- `IDENTIFIABLE_FIELD_KEYS` in `founder_persistence_db.py` used across founder sanitisation
- `sanitise_payload()` on persistence records
- **Risk:** if provider names entered manually in founder notes, depends on field keys — not fully audited in UI

---

## Safeguarding narratives

- Stored in user-scoped `orb_saved_outputs` — **encrypted at rest depends on hosting** (Render PostgreSQL default)
- **Not** in founder telemetry by design
- Access controlled by `require_orb_residential_auth` + user_id scoping

---

## Session / cookie handling

| Mechanism | Detail |
|-----------|--------|
| Session cookie | `indicare_session`, `__Host-indicare_session` |
| CSRF | Token required on POST |
| Backend proxy | `lib/auth/backend-proxy.ts` preserves Set-Cookie |
| Session revocation | `session_security_routes.py` |
| ORB surface header | `X-ORB-Surface: orb_residential` |

---

## Auth / MFA / roles

| Role | ORB Residential | IndiCare OS |
|------|-----------------|-------------|
| Standalone ORB user | `/orb` product | No OS access |
| Staff | Can use ORB standalone separately | OS scoped by home |
| Manager | MFA enforced on OS | ORB standalone separate account |
| Admin | Platform admin | MFA enforced |
| Founder | `/founder/*` | `require_founder` |

**Separation:** `services/orb_standalone_boundary.py` — `FORBIDDEN_STANDALONE_OS_KEYS`

---

## Audit logs

| Log | Location |
|-----|----------|
| Auth audit | `auth_audit_log` (MFA DB) |
| AI usage audit | `ai_usage_audit` |
| Founder audit | `founder_os_audit_log` |
| Stripe events | `orb_stripe_events` (idempotent) |

---

## Deletion / retention

| Area | Status |
|------|--------|
| User deletion flow | **Partial** — not prominently documented in ORB UI |
| Output deletion | `DELETE /orb/dictate/notes/{id}`; saved output delete routes |
| Retention policy | **Not surfaced in UI** — gap for GDPR transparency |
| Telemetry retention | Summary by days param (30 default in bootstrap) |

---

## Privacy notices in UI

| Notice | Present |
|--------|---------|
| Safety acceptance modal | Yes — versioned |
| Terms/privacy links | `test_orb_legal_pages.py` — 5 tests |
| Draft disclaimers | Yes — every output type |
| Local policy caveat | In brain answers; **not standalone policy upload** |
| AI subprocessors | Docs exist (`docs/indicare-ai-subprocessor-and-provider-policy.md`); link depth in ORB UI not verified live |

---

## Safeguarding controls summary

| Control | Status |
|---------|--------|
| No final safeguarding decisions | In operating brain |
| TTS block on critical safeguarding | Implemented |
| Quality gate | Blocks unsafe outputs |
| Escalation prompts | In framework + brain |
| No invented facts tests | Present |
| Standalone cannot access live child records | Enforced |

---

## Gaps

1. **Retention/deletion policy not in ORB settings UI**
2. **DSAR export** — no self-service data export for users
3. **Child names in saved outputs** — user responsibility; no automatic redaction in drafts
4. **Provider policy** — not injectable in standalone product
5. **Encryption documentation** — depends on Render/hosting; not in product

---

## Verdict

Privacy architecture is **thoughtful for telemetry** with explicit blocklists for safeguarding narratives. **User-generated content storage is appropriate but needs clearer retention/deletion UX for GDPR compliance before public launch.**
