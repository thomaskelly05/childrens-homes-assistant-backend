#!/usr/bin/env python3
"""Audit internal-brain critical failures across full scenario packs."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SESSION_SECRET", "orb-internal-brain-eval-local-only")

from services.orb_internal_brain_evaluation_service import orb_internal_brain_evaluation_service


def load_scenarios(pack: str) -> list[dict]:
    script = f"""
import {{ generateOrbEvaluationScenarios, generateHighRiskPack, generateAdversarialPack }} from './lib/orb/evaluation/orb-scenario-generator.ts';
const pack = {json.dumps(pack)};
let scenarios;
if (pack === 'adversarial') scenarios = generateAdversarialPack();
else if (pack === 'high-risk') scenarios = generateHighRiskPack();
else scenarios = generateOrbEvaluationScenarios(39);
console.log(JSON.stringify(scenarios));
"""
    out = subprocess.check_output(
        ["npx", "tsx", "-e", script],
        cwd=ROOT / "frontend-next",
        text=True,
    )
    return json.loads(out)


def main() -> int:
    packs = ["adversarial", "high-risk", "full"]
    summary: dict[str, dict] = {}

    for pack in packs:
        scenarios = load_scenarios(pack)
        backend_critical = 0
        frontend_would_critical: list[dict] = []

        for scenario in scenarios:
            result = orb_internal_brain_evaluation_service.evaluate_scenario(scenario)
            if result.critical_failure:
                backend_critical += 1
            # Export for frontend audit
            frontend_would_critical.append(
                {
                    "scenario_id": result.scenario_id,
                    "category": scenario.get("category"),
                    "domain": scenario.get("domain"),
                    "risk_level": scenario.get("riskLevel"),
                    "backend_critical": result.critical_failure,
                    "backend_issues": result.issues,
                    "missing": result.missing_requirements,
                    "score": result.internal_brain_score,
                    "internal_brain": result.to_dict(),
                    "scenario": scenario,
                }
            )

        audit_path = ROOT / "scripts" / f"audit_{pack}_internal_brain.json"
        audit_path.write_text(json.dumps(frontend_would_critical, indent=2), encoding="utf-8")
        summary[pack] = {
            "total": len(scenarios),
            "backend_critical": backend_critical,
            "audit_file": str(audit_path),
        }

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
