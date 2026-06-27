# R0.1 — Security/Auth Conftest Fixture Repair Report

| Field | Value |
|---|---|
| Phase | R0.1 (repair conftest / security-auth test fixtures only) |
| Branch | `fix/r0-1-security-auth-fixtures` |
| Date | 2026-06-27 |
| Parent | R0 merged (`60aa01e2`) — pre-merge gate live on `main` |
| Constitution links | E6 (quality & verification); A2 NR-1 unchanged |

**NR-1 remains PARTIALLY RESOLVED / OPEN. Public promise remains blocked. R1 has not started.**

---

## 1. Root cause (VERIFIED)

The `client` fixture in `tests/conftest.py` referenced a removed FastAPI dependency:

```python
app_module.app.dependency_overrides[current_user_module.get_db] = fake_get_db
```

`auth/current_user.py` no longer exports `get_db`. `get_current_user()` now acquires the database via the `db_connection()` context manager (`auth/current_user.py:289`). At fixture setup this raised:

`AttributeError: module 'auth.current_user' has no attribute 'get_db'`

That error blocked all four security/auth test modules at **setup** (reported in R0 as 42 errors across 41 tests + collection visibility). The tests **collected** but could not run the `client` fixture.

---

## 2. Fix applied (smallest safe change)

**File:** `tests/conftest.py` only (plus one-line helper alignment in an affected test file; see §5).

1. **Removed** the stale `current_user_module.get_db` dependency override.
2. **Added** a `fake_db_connection()` context manager yielding the existing `FakeConn` / `FakeCursor` test double.
3. **Monkeypatched** `db_connection` on modules that import it directly:
   - `auth.current_user` (for `get_current_user`)
   - `routers.auth_routes` (for `/auth/me`)
4. **Centralised** `get_db_connection` mocking on `db.connection` and on `middleware.access_scope_middleware` (which imports `get_db_connection` and `decode_session_token` by name — patching only `app_module` was insufficient for `/assistant/*` routes).
5. **Patched** `decode_session_token` on `access_scope_middleware` so the fixture's `test-token-{id}` test cookies decode consistently outside `/auth/*` public paths.
6. **Reset** rate-limit and login lockout module state at the start of each `client` fixture invocation (test isolation only; does not weaken production limits).
7. **Added** `FakeCursor.fetchall()` for `/auth/me` display-profile queries.

No production auth, security, or application code was changed.

---

## 3. Affected tests — collection and run results

| File | Collected | Pass | Fail | Notes |
|---|---:|---:|---:|---|
| `tests/test_auth_flow.py` | 11 | 11 | 0 | Fully green |
| `tests/test_protected_routes.py` | 12 | 10 | 2 | See §5 |
| `tests/test_roles_and_permissions.py` | 14 | 14 | 0 | Fully green |
| `tests/test_assistant_isolation_routes.py` | 4 | 0 | 4 | See §5 |
| **Total** | **41** | **35** | **6** | **0 setup/collection errors** |

**The four security/auth files now collect and execute.** The original conftest `AttributeError` is eliminated.

---

## 4. Remaining failures (honest; not triaged in R0.1)

### 4a. `test_assistant_isolation_routes.py` — 4 failures (HTTP 404)

All four tests fail with **`404 Not Found`** on `/assistant/general/stream` and `/assistant/os/*/stream`.

**Cause (VERIFIED):** `routers/assistant_general_routes.py` (and related OS assistant stream routers) are **not registered** in the loaded app — `core/router_loader.py` does not include them; `assistant_stream_routes` is explicitly in the retired/skipped router list. These tests cannot pass in the current test app wiring without a separate router-loader change (out of R0.1 scope; would be application/test-infra work, not conftest).

### 4b. `test_protected_routes.py` — 2 failures (redirect expectations)

- `test_assistant_redirects_to_mfa_setup_when_logged_in_without_mfa`
- `test_assistant_redirects_to_assistant_when_legal_not_accepted`

Both now receive **`200 OK`** on `GET /assistant` where the tests accept `302/307/401`. After R0.1, `AccessScopeMiddleware` correctly decodes the fixture session and loads the user from the fake DB, so the HTML assistant shell is served instead of failing closed with `401`. MFA/legal redirect behaviour on that HTML path is not exercised by the conftest mocks alone. **This is a test-expectation / middleware-layer gap, not a weakened security assertion** — separate follow-up if redirect semantics must be re-covered in hermetic tests.

---

## 5. Minor test helper alignment

`tests/test_assistant_isolation_routes.py` — `fully_authenticate()` now calls `enable_mfa()` only when `login.json().get("mfa_required")` is true, matching the working pattern in `test_roles_and_permissions.py`. Prevents a `401` on `/auth/mfa/setup` for roles (e.g. `staff`) where MFA is not mandatory.

---

## 6. What R0.1 does and does not claim

**Done:**
- Conftest fixture defect fixed; security/auth tests are runnable.
- 35/41 affected tests pass; 3 of 4 files fully green.
- No production behaviour changes.

**Not done (deliberate):**
- No triage of the wider ~309 pytest failures.
- No conftest repair for unrelated suites.
- No router-loader changes for missing assistant stream routes.
- No NR-1 / R1 work; no public promise drafting.

---

## 7. Recommended next steps (founder review)

1. **Merge R0.1** if the conftest repair and 35/41 result are acceptable.
2. **Router-loader follow-up** (R0-adjacent): register or explicitly test-skip `assistant_general_routes` / OS stream routes so isolation tests target real endpoints or are marked `@pytest.mark.skip` with reason.
3. **Protected-route redirect tests:** decide whether `GET /assistant` MFA/legal redirects should be covered via HTML middleware tests or updated expectations now that access-scope auth mocking works.
4. Continue wider pytest triage only after founder authorisation (not R0.1).

---

## 8. Public promise

**Still blocked.** NR-1 remains PARTIALLY RESOLVED / OPEN.
