from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"
SCOPE_ROUTES = FRONTEND / "lib" / "navigation" / "scope-routes.ts"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def iter_frontend_sources() -> list[Path]:
    roots = [
        FRONTEND / "app",
        FRONTEND / "components",
        FRONTEND / "lib",
    ]
    out: list[Path] = []
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if path.suffix in {".tsx", ".ts"} and "node_modules" not in path.parts:
                out.append(path)
    return out


def os_surface_sources() -> list[Path]:
    """Frontend sources that are IndiCare OS (exclude standalone /orb tree)."""
    return [p for p in iter_frontend_sources() if "/app/orb/" not in str(p) and "/components/orb-standalone/" not in str(p)]


def href_literals_in_os_surfaces() -> str:
    return "\n".join(read(p) for p in os_surface_sources())


CHILD_WORKFLOW_KEYS = (
    "dailyNote",
    "incident",
    "safeguarding",
    "keywork",
    "familyTime",
    "education",
    "healthMedication",
    "behaviourSupport",
    "missingEpisode",
    "physicalIntervention",
    "bodyMap",
    "complaint",
    "roomSearch",
    "chronology",
    "archive",
    "lifeecho",
    "planImpacts",
    "actions",
    "documents",
    "handover",
    "reviews",
    "alerts",
    "orb",
)

HOME_WORKFLOW_KEYS = (
    "dailyBrief",
    "handover",
    "recordingAlerts",
    "recordingReviews",
    "safeguarding",
    "notifications",
    "staffOnShift",
    "workforce",
    "inspectionReadiness",
    "sccif",
    "reg44",
    "reg45",
    "reports",
    "orb",
)

PRIORITY_RECORDING_TYPES = (
    "daily-note",
    "incident",
    "safeguarding-concern",
    "keywork",
    "family-time",
    "education-note",
    "health-appointment",
    "medication-note-error",
    "missing-episode",
    "physical-intervention",
    "injury-body-map",
    "complaint",
    "room-search",
    "behaviour-support",
    "child-voice",
    "professional-visit",
    "reg44-evidence",
    "reg45-evidence",
)
