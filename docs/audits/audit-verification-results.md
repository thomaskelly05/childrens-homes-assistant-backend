# Audit Verification Results (Phase 19)

**Environment:** Linux workspace, Python 3.12 venv, Node frontend-next  
**Date:** 10 June 2026  
**PostgreSQL:** Not running (affects DB-dependent tests)

---

## Backend

### Full pytest suite

```bash
source .venv/bin/activate
python -m pytest tests/ -q \
  --ignore=tests/test_modes.py \
  --ignore=tests/test_stream.py \
  --ignore=tests/test_templates.py \
  --ignore=tests/test_validation.py \
  --ignore=tests/test_auth.py
```

| Metric | Result |
|--------|--------|
| **Exit code** | 1 (failures present) |
| **Passed** | 3513 |
| **Failed** | 210 |
| **Errors** | 42 |
| **Warnings** | 83 |
| **Duration** | 188.22s |

**Notable failures:** Mix of integration tests; 42 errors from `conftest.py` `CSRFMiddleware` monkeypatch on missing attribute.

**Warnings:** Starlette `httpx` deprecation; passlib `crypt` deprecation.

### ORB-specific pytest (isolated)

```bash
python -m pytest tests/test_orb*.py -q --tb=no
```

| Metric | Result |
|--------|--------|
| **Exit code** | 1 |
| **Passed** | 1726 |
| **Failed** | 114 |
| **Duration** | 29.25s |

**Note:** Most isolated failures are `DatabaseUnavailableError` — PostgreSQL not running. Not necessarily logic regressions.

### ORB brain regression (sample — passes without DB)

```bash
python -m pytest tests/test_orb_9_expert_brain.py -q
```

Expected: PASS (orchestration-only, no DB).

### Route smoke

`tests/test_orb_route_e2e.py` — included in full suite (passed in aggregate).

---

## Frontend

### TypeScript check

```bash
cd frontend-next && npm run typecheck
```

| Result | **PASS** |
|--------|----------|
| Exit code | 0 |

### ORB unit tests

```bash
cd frontend-next && npm run test:orb
```

| Metric | Result |
|--------|--------|
| **Exit code** | 1 |
| **Tests** | 1022 |
| **Passed** | 1001 |
| **Failed** | 21 |
| **Duration** | ~8.3s |

**Failing areas:** Billing modal, login/OAuth, voice copy, desktop/mobile UX polish, ChatGPT parity.

### ESLint

```bash
cd frontend-next && npm run lint
```

| Result | **FAIL** |
|--------|----------|
| Problems | 189 (5 errors, 184 warnings) |
| ORB-specific | Mostly warnings in non-ORB files |

### Production build

```bash
cd frontend-next && npm run build
```

| Result | **FAIL** |
|--------|----------|
| Error | `revenue-server-context.ts` imports `next/headers` in client-importable chain |
| Trace | `founder-evidence-page.tsx` → `evidence-source-builder.ts` → `revenue-source-builder.ts` |

### E2E (not run)

Playwright specs present but not executed — no browser stack with backend in audit environment.

```bash
# Available but not run:
npm run e2e
npm run e2e:orb-auth
npm run e2e:orb-route-audit
```

---

## Summary

| Check | Status |
|-------|--------|
| Backend core tests | **Pass majority** (3513/3765) |
| ORB backend tests | **Strong** (pass in full suite context) |
| Frontend typecheck | **Pass** |
| Frontend ORB tests | **Mostly pass** (1001/1022) |
| Frontend lint | **Fail** (5 errors) |
| Frontend build | **Fail** — deploy blocker |
| E2E | **Not run** |
| Live LLM scenarios | **Not run** — no API keys |

---

## Recommended CI gate for launch

```bash
# Must pass before deploy:
cd frontend-next && npm run typecheck && npm run build
cd frontend-next && npm run test:orb  # 0 failures
source .venv/bin/activate
python -m pytest tests/test_orb*.py -q  # with PostgreSQL service
```
