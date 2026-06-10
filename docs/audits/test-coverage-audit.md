# Test Coverage Audit (Phase 13)

**Audit run:** 10 June 2026

---

## Backend pytest

### Full suite (excluding manual scripts)

```bash
python -m pytest tests/ -q \
  --ignore=tests/test_modes.py \
  --ignore=tests/test_stream.py \
  --ignore=tests/test_templates.py \
  --ignore=tests/test_validation.py \
  --ignore=tests/test_auth.py
```

| Result | Count |
|--------|-------|
| Passed | 3513 |
| Failed | 210 |
| Errors | 42 |
| Duration | ~188s |

### ORB-specific (`tests/test_orb*.py`)

| Result | Count |
|--------|-------|
| Passed | 1726+ (in full suite) |
| Failed | 114 when run in isolation without DB |

**Note:** Isolation failures primarily `DatabaseUnavailableError` — not logic failures.

---

## Existing test coverage by area

| Area | Files | Depth |
|------|-------|-------|
| ORB chat/streaming | 25+ files | **Excellent** |
| ORB brain routing | 15+ files | **Excellent** |
| ORB billing/Stripe | 10+ files | **Excellent** |
| ORB dictate | 11 files | **Strong** |
| ORB voice | 14 files | **Strong** (DB-dependent) |
| ORB write/export | 8 files | **Good** |
| ORB auth/OAuth | 15+ files | **Strong** |
| ORB knowledge | 10+ files | **Good** |
| ORB quality/safety | 20+ files | **Strong** |
| IndiCare Intelligence | 10+ files | **Good** |
| Founder persistence/telemetry | 5 files | **Adequate** |
| Auth flow (conftest) | auth_flow, roles_and_permissions | **Broken** — CSRFMiddleware |
| E2E route smoke | `test_orb_route_e2e.py` | Present |

---

## Frontend tests

### TypeScript check

```
npm run typecheck → PASS
```

### ORB unit tests

```
npm run test:orb → 1001 pass, 21 fail (1022 total)
```

### E2E (Playwright)

8 spec files in `e2e/` — ORB-focused; **not run** in audit (no browser stack).

### Lint

```
npm run lint → 5 errors, 184 warnings
```

### Build

```
npm run build → FAIL (founder revenue server import)
```

---

## Missing tests

| Gap | Priority |
|-----|----------|
| Live LLM scenario evaluation (end-to-end prose) | **Critical** |
| Whistleblowing scenario | High |
| ORB Voice latency SLA | High |
| Export telemetry events | Medium |
| Full onboarding funnel E2E | Medium |
| Mobile Write editing E2E | Medium |
| Provider policy injection | Medium |
| DSAR/deletion flow | Medium |
| Cross-browser voice | Medium |
| Production build CI gate | **Critical** |
| Fix conftest CSRFMiddleware | High |
| Founder AI routes (unmounted) | Low |

---

## High-priority tests to add before launch

1. **Playwright golden path:** signup → trial → dictate → write → export PDF
2. **Live safeguarding scenario pack** — 5 GOLD scenarios with real LLM + human review rubric
3. **Production build in CI** — `npm run build` must pass
4. **Voice E2E with mic mock** — complete realtime flow
5. **Billing E2E with Stripe test mode** — already started in `e2e/orb-auth-register-billing.spec.ts`
6. **Fix 42 conftest errors** — restore auth integration tests
7. **Frontend contract tests** — fix 21 failures or update contracts deliberately

---

## Regression tests for recent bugs

Present and extensive:
- No duplicate routes
- No OS provider leak in standalone
- No 403 on standalone send
- CSRF error visible
- Front door no loop
- Stripe idempotency
- Session isolation
- Cross-user voice session rejection

---

## Verdict

ORB has **exceptional backend test coverage** (~263 ORB test files) — among the strongest areas of the codebase. **Frontend has broad contract tests** but 21 failures indicate polish regressions. **Integration test infrastructure is degraded** (conftest, DB dependency, build failure). **Test coverage is not the blocker — test failures and missing live LLM QA are.**
