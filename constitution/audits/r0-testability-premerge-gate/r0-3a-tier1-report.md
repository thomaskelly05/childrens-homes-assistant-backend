# R0.3a — Tier 1 Local Authenticated Verification Report

| Field | Value |
|---|---|
| Phase | R0.3a Tier 1 (local isolated authenticated MFA/legal gate verification) |
| Date | 2026-06-27 |
| Commit verified | `bed0047a5ff87c44bf2e7b90163d6ef9b403b9d5` (R0.3 merge) |
| Environment | **Local only** — no production access |
| Production touched | **No** |

This report records authenticated verification of the R0.3 sensitive OS assistant MFA/legal gate. It does **not** claim production authenticated behaviour, compliance, safety, or launch readiness.

---

## 1. Environment

| Item | Detail |
|---|---|
| Code | `main` at `bed0047a` |
| API | `http://127.0.0.1:8765` (local `uvicorn`) |
| Database | **Isolated** PostgreSQL database `r03a_verify_tier1` (dedicated; not shared `childrens_homes`) |
| `APP_ENV` | `development` |
| `FORCE_MFA_FOR_SENSITIVE_ROLES` | `true` |
| Child/home/provider records | **None created** |
| Demo seed scripts | **Not run** (`seed_demo_environment.py`, `seed_demo_year.py` excluded) |
| Legal version under test | `2026-03-29-v1` |

**Schema note:** Minimal local tables only (`users`, empty `homes`, `user_mfa`, `legal_acceptances`, billing columns on `users`). No young people, safeguarding, or provider placement data. App migration runner hit a non-blocking index error on empty DB; core auth/MFA/legal paths functioned for this matrix.

**Email note:** Planned `r03a.*@indicare.local` addresses are rejected by Pydantic `EmailStr` on `POST /auth/login`. Verification used reserved-domain addresses `r03a.*@example.com` instead. Passwords were ephemeral, held only in process environment, and are **not recorded** in this report.

---

## 2. Accounts created (no secrets)

| Key | Email | Role | MFA enrolled | Legal `2026-03-29-v1` | `home_id` |
|---|---|---|---|---|---|
| A1 | `r03a.admin.nomfa@example.com` | admin | No | Yes | `NULL` |
| A2 | `r03a.manager.nomfa@example.com` | manager | No | Yes | `NULL` |
| S1 | `r03a.staff.nomfa@example.com` | staff | No | Yes | `NULL` |
| L1 | `r03a.admin.mfa-nolegal@example.com` | admin | Yes (via live MFA setup flow) | **No** | `NULL` |
| OK1 | `r03a.admin.clear@example.com` | admin | Yes (via live MFA setup flow) | Yes (via API after MFA) | `NULL` |
| RB1 | `r03a.viewer.norole@example.com` | viewer | No | Yes | `NULL` |

---

## 3. Verification matrix results

| # | Scenario | Account | Endpoint | Status | Redirect / error code |
|---|---|---|---|---|---|
| 1 | Admin MFA incomplete → cannot load shell | A1 | `GET /assistant` | **302** | `Location: /mfa-setup` |
| 1 | Manager MFA incomplete → cannot load shell | A2 | `GET /assistant` | **302** | `Location: /mfa-setup` |
| 2 | Admin MFA incomplete → cannot stream | A1 | `POST /assistant/general/stream` | **403** | `mfa_setup_required` |
| 2 | Admin MFA incomplete → cannot stream | A1 | `POST /assistant/os/home/stream` | **403** | `mfa_setup_required` |
| 2 | Admin MFA incomplete → cannot stream | A1 | `POST /assistant/os/quality/stream` | **403** | `mfa_setup_required` |
| 3 | Staff without MFA not forced | S1 | `GET /assistant` | **200** | `text/html` (no MFA redirect) |
| 4 | MFA complete, legal missing → shell blocked | L1 | `GET /assistant` | **403** | HTML legal gate (non-JSON) |
| 5 | MFA complete, legal missing → stream blocked | L1 | `POST /assistant/general/stream` | **403** | `legal_acceptance_required` |
| 6 | MFA + legal complete → shell allowed | OK1 | `GET /assistant` | **200** | `text/html` |
| 7 | MFA + legal complete → stream allowed | OK1 | `POST /assistant/general/stream` | **200** | `text/event-stream` |
| 8 | Role check after clearance | RB1 | `POST /assistant/general/stream` | **403** | `permission_denied` |
| 8 | Scope check after clearance | S1 | `POST /assistant/os/home/stream` | **403** | `No home context is available for this assistant scope.` |

**Matrix outcome: PASS** — all eight scenarios behaved as expected locally.

---

## 4. MFA / legal gate assessment

| Check | Result |
|---|---|
| MFA/legal gate failures observed | **None** |
| Admin/manager forced to MFA setup before assistant | **Yes** |
| Staff not forced into MFA when disabled | **Yes** |
| Legal gate after MFA completion | **Yes** |
| Cleared user can load shell and general stream | **Yes** |
| Role/scope protections bypassed by gate clearance | **No** |

---

## 5. Cleanup performed

| Action | Done |
|---|---|
| Isolated DB `r03a_verify_tier1` dropped | Yes |
| Local `uvicorn` on port 8765 stopped | Yes |
| Ephemeral password / cookie jars removed from `/tmp` | Yes |
| No secrets committed | Yes |

---

## 6. Limits and follow-up

| Topic | Status |
|---|---|
| **Tier 2 production verification** | **Still recommended** — founder has not authorised ephemeral production accounts; live cookie domain, Render session store, and CSRF on `api.indicare.co.uk` remain unverified for authenticated paths |
| **Public promise** | **Still blocked** — per `11-public-promise-readiness.md` |
| **NR-1** | **PARTIALLY RESOLVED / OPEN** — unchanged by R0.3a |
| **R1** | **Not started** |

---

## 7. Founder decision point

Tier 1 local verification is **complete and passing**. Awaiting founder decision on whether to:

1. Authorise **Tier 2** ephemeral production verification accounts, or
2. Accept Tier 1 evidence as sufficient for marking R0.3 authenticated behaviour verified in non-production, pending Tier 2 when authorised.
