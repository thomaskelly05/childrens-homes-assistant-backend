from __future__ import annotations

from typing import Any

PROBLEMATIC_LANGUAGE = {
    "absconder": "young person with repeated missing episodes",
    "prostitute": "child experiencing sexual exploitation concerns",
    "promiscuous": "possible exploitation-related vulnerability",
    "offender": "young person requiring safeguarding support",
    "criminal": "young person exposed to contextual harm indicators",
    "gang member": "young person linked to possible group-based exploitation concerns",
    "choosing this lifestyle": "may be experiencing coercion, control or contextual vulnerability",
    "attention seeking": "communicating distress or unmet need",
    "manipulative": "using survival-based communication or coping strategies",
}


class ISNLanguageGuardService:
    """Trauma-informed safeguarding language checks for ISN outputs."""

    def review_text(self, text: str) -> dict[str, Any]:
        lowered = text.lower()
        findings = []
        amended = text
        for phrase, replacement in PROBLEMATIC_LANGUAGE.items():
            if phrase in lowered:
                findings.append(
                    {
                        "phrase": phrase,
                        "suggested_replacement": replacement,
                        "reason": "Use child-first, contextual and non-criminalising safeguarding language.",
                    }
                )
                amended = amended.replace(phrase, replacement).replace(phrase.title(), replacement)
        return {
            "ok": True,
            "findings": findings,
            "amended_text": amended,
            "principle": "Language should support safeguarding understanding, not blame or criminalise the child.",
        }

    def safe_summary(self, *, summary: str, context: str | None = None) -> dict[str, Any]:
        reviewed = self.review_text(summary)
        return {
            **reviewed,
            "context": context,
            "safe_to_use": len(reviewed["findings"]) == 0,
        }


isn_language_guard_service = ISNLanguageGuardService()
