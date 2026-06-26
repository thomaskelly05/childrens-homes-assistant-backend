# ORB Scenario Quality Gate

The ORB Scenario Quality Gate is an automated evaluation harness for safeguarding-critical residential care prompts. It checks that ORB routes scenarios correctly, uses the right scenario frame (for example active missing-from-care vs missing return), includes required safeguarding language, and avoids forbidden phrasing.

Phase 1 provides per-set runners. Phase 2 wires those sets into practical launch-readiness workflows for PR checks, nightly critical monitoring, and pre-launch reporting.

---

## What it protects against

Scenario-frame failures are a common class of ORB risk in children's homes:

- **Active missing** prompts answered with a **missing return** frame (wrong immediate actions).
- Missing safeguarding escalation language on high/critical scenarios.
- Answers that lack local policy / adult responsibility caveats.
- Opinion or punitive labels written as fact in records guidance.

The gate runs scripted scenarios from `quality/orb_scenario_quality_gate_sets.json` and evaluates generated answers against explicit checks in `services/orb_scenario_quality_gate_service.py`.

---

## Phase 1 sets

| Set | Purpose | Typical size |
|-----|---------|--------------|
| `smoke` | Fast PR gate — active missing frame, whistleblowing, self-harm, two GOLD scenarios | 4 scenarios |
| `missing-from-care` | Active missing vs return frame controls | 3 custom scenarios |
| `critical-50` | Starter safeguarding-critical GOLD bank subset | 50 scenarios |

---

## Mock mode vs live-provider mode

### Mock mode (default for launch report)

- Uses deterministic / canonical answers from ORB execution policy and expert answer fixtures.
- **Does not** call OpenAI or the live ORB brain.
- Fast, stable, suitable for CI and nightly cron jobs.
- Validates routing, frames, marker checks, and safety gates without API cost.

Run Phase 1 single-set mock:

```bash
source .venv/bin/activate
python scripts/run_orb_scenario_quality_gate.py \
  --set smoke \
  --no-live-provider \
  --output reports/orb_quality/smoke.json
```

### Live-provider mode

- Calls the live ORB brain when `OPENAI_API_KEY` and lab infrastructure are available.
- Use before launch sign-off or when investigating answer-quality regressions.
- Slower, costs tokens, and still **does not** replace professional judgement.

```bash
python scripts/run_orb_scenario_quality_gate.py \
  --set critical-50 \
  --output reports/orb_quality/critical-50-live.json
```

(Omit `--no-live-provider` to allow live calls.)

---

## PR checks (fast)

Run the smoke set in mock mode on every PR that touches ORB answer routing, prompts, or safeguarding copy:

```bash
source .venv/bin/activate
python scripts/run_orb_scenario_quality_gate.py \
  --set smoke \
  --no-live-provider \
  --output reports/orb_quality/pr-smoke.json
```

Exit code is non-zero when any scenario fails. Typical CI budget: under one minute.

---

## Nightly critical checks

Run `critical-50` in mock mode on a schedule to catch regressions across the safeguarding starter bank:

```bash
source .venv/bin/activate
python scripts/run_orb_scenario_quality_gate.py \
  --set critical-50 \
  --no-live-provider \
  --output reports/orb_quality/nightly-critical-50.json
```

Optionally add `missing-from-care` the same way for frame-specific coverage.

---

## Launch-readiness report (Phase 2)

The launch wrapper runs selected Phase 1 sets and produces a combined summary:

```bash
source .venv/bin/activate
python scripts/run_orb_launch_quality_report.py \
  --output-dir reports/orb_quality
```

Defaults:

- Runs `smoke`, `missing-from-care`, and `critical-50`
- Mock / no-live provider mode
- Writes `reports/orb_quality/orb_launch_quality_report.json` and `.md`

### Useful options

| Flag | Effect |
|------|--------|
| `--set smoke` | Single set only |
| `--set missing-from-care` | Missing-from-care frame set only |
| `--set critical-50` | Critical GOLD subset only |
| `--set all-phase-1` | All three sets (default) |
| `--live-provider` | Use live ORB brain (explicit opt-in) |
| `--fail-on-critical` | Exit non-zero on critical failures or `fail` recommendation |
| `--output-dir PATH` | Output directory for combined artifacts |

Pre-launch with live verification:

```bash
python scripts/run_orb_launch_quality_report.py \
  --live-provider \
  --fail-on-critical \
  --output-dir reports/orb_quality
```

---

## Interpreting reports

### Per-set JSON (`orb_scenario_quality_gate_*.json`)

- `passed` / `failed` / `pass_rate` — set-level counts
- `provider_mode` — `mock` or `live`
- `results[]` — per-scenario checks (`scenario_frame`, `safeguarding_escalation`, etc.)
- `issues[]` — failing check identifiers per scenario

### Combined launch JSON (`orb_launch_quality_report.json`)

- `summary` — totals across all sets run
- `set_summaries[]` — pass/fail counts per set
- `critical_failures[]` — failed scenarios with `risk_level: critical`
- `repair_needed[]` — all failed scenarios (prompt/answer repair backlog)
- `human_review_needed[]` — passed high/critical scenarios still requiring professional review
- `launch_recommendation` — `pass`, `pass with caveats`, or `fail`
- `sets` — full per-set reports embedded for drill-down

### Launch recommendation meanings

| Recommendation | Meaning |
|----------------|---------|
| **pass** | All selected scenarios passed in the current provider mode |
| **pass with caveats** | No blocking failures, but mock mode was used, non-critical failures remain, and/or high/critical scenarios need human review |
| **fail** | `smoke` or `missing-from-care` failed, or any critical-risk scenario failed |

Blocking sets for launch: `smoke` and `missing-from-care`.

### Markdown reports

Human-readable summaries with tables, critical failure lists, repair backlog, human-review queue, and recommendation rationale.

---

## Human review remains required

A passing quality gate means automated checks did not detect known failure modes. It does **not**:

- Certify that ORB output is safe to file as a statutory record without review
- Replace manager, on-call, DSL, or multi-agency judgement
- Cover all 1,000+ expert scenarios (Phase 1 uses a curated starter bank)

High and critical scenarios that pass the gate are listed under `human_review_needed` because professional review is always expected before relying on ORB in live care.

---

## Safer recording, not professional judgement

The gate supports safer recording by catching scenario-frame and safeguarding-copy regressions early. Staff and managers must still apply local policy, escalate appropriately, and review AI-assisted drafts before they become records or decisions.

---

## Related files

| Path | Role |
|------|------|
| `quality/orb_scenario_quality_gate_sets.json` | Scenario set definitions |
| `services/orb_scenario_quality_gate_service.py` | Evaluation engine + launch report builder |
| `scripts/run_orb_scenario_quality_gate.py` | Phase 1 per-set runner |
| `scripts/run_orb_launch_quality_report.py` | Phase 2 combined launch report |
| `tests/test_orb_scenario_quality_gate.py` | Automated tests |

---

## Suggested Phase 3

- Expand coverage toward the full GOLD bank and generated variant scenarios.
- CI workflow wiring (GitHub Actions) for PR smoke + nightly critical-50.
- Trend storage: compare pass rates across commits.
- Founder quality-lab integration for human review sign-off on `human_review_needed` items.
- Optional live-provider sampling (e.g. 10% of critical-50) to balance cost and signal.
