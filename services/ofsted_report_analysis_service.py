"""Extract findings themes from public Ofsted report text — no grade prediction."""

from __future__ import annotations

import re
from typing import Any

_BOILERPLATE_MARKERS = (
    "the office for standards in education",
    "any concerns about a childcare provider",
    "information about this inspection",
)

_FINDING_SECTIONS = (
    "strengths",
    "what does the home do well",
    "areas for development",
    "what needs to improve",
    "requirements",
    "recommendations",
    "safeguarding",
    "leadership",
    "child",
    "children",
)


class OfstedReportAnalysisService:
    def analyse(self, report_text: str) -> dict[str, Any]:
        lower = report_text.lower()
        boilerplate_lines: list[str] = []
        finding_lines: list[str] = []
        for line in report_text.splitlines():
            ls = line.strip()
            if not ls:
                continue
            lsl = ls.lower()
            if any(m in lsl for m in _BOILERPLATE_MARKERS):
                boilerplate_lines.append(ls[:200])
            elif any(m in lsl for m in _FINDING_SECTIONS):
                finding_lines.append(ls[:400])

        themes = self._extract_themes(lower)
        return {
            "boilerplate_sample_count": len(boilerplate_lines),
            "finding_excerpt_count": len(finding_lines),
            "finding_excerpts": finding_lines[:15],
            "themes": themes,
            "disclaimer": "Analysis of public report text only. Does not predict grades for any home.",
        }

    def _extract_themes(self, lower: str) -> dict[str, bool]:
        checks = {
            "child_voice": bool(re.search(r"child(?:ren)?'?s? (?:views|voice|wishes)", lower)),
            "safeguarding": "safeguard" in lower,
            "leadership": "leadership" in lower or "manager" in lower,
            "reg44": "regulation 44" in lower or "reg 44" in lower,
            "missing": "missing" in lower,
            "restraint": "restraint" in lower or "physical intervention" in lower,
            "education": "education" in lower or "school" in lower,
            "staff_supervision": "supervision" in lower,
        }
        return checks


ofsted_report_analysis_service = OfstedReportAnalysisService()
