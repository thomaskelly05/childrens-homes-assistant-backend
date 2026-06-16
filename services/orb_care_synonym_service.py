"""Care-sector synonym and canonical concept expansion for standalone ORB retrieval."""

from __future__ import annotations

import re
from typing import Any

# concept_key -> {canonical label, synonym phrases}
CARE_CONCEPTS: dict[str, dict[str, Any]] = {
    "missing_from_care": {
        "canonical": "missing from care",
        "terms": [
            "absconded",
            "abscond",
            "missing episode",
            "unauthorised absence",
            "unauthorized absence",
            "whereabouts unknown",
            "left placement",
            "missing from care",
            "missing child",
            "run away",
            "runaway",
        ],
    },
    "child_voice": {
        "canonical": "child voice",
        "terms": [
            "wishes and feelings",
            "child's views",
            "childs views",
            "voice of the child",
            "child voice",
            "participation",
            "consultation",
            "heard",
            "views of the child",
        ],
    },
    "recording_quality": {
        "canonical": "recording quality",
        "terms": [
            "daily note",
            "daily log",
            "case note",
            "incident write-up",
            "incident write up",
            "chronology entry",
            "log entry",
            "recording quality",
            "contemporaneous note",
        ],
    },
    "behaviour_support": {
        "canonical": "behaviour support",
        "terms": [
            "challenging behaviour",
            "challenging behavior",
            "dysregulation",
            "behaviour as communication",
            "behavior as communication",
            "escalation",
            "de-escalation",
            "deescalation",
            "repair",
            "restorative",
        ],
    },
    "safeguarding": {
        "canonical": "safeguarding",
        "terms": [
            "disclosure",
            "allegation",
            "abuse",
            "exploitation",
            "self-harm",
            "self harm",
            "immediate risk",
            "significant harm",
            "safeguarding",
            "child protection",
        ],
    },
    "ofsted_readiness": {
        "canonical": "Inspection evidence preparation",
        "terms": [
            "inspection evidence",
            "sccif",
            "quality standards",
            "impact",
            "progress from starting points",
            "Inspection evidence preparation",
            "inspection prep",
            "ofsted",
        ],
    },
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: str) -> str:
    return _text(value).lower()


class OrbCareSynonymService:
    """Maps care-sector language to canonical concepts for query expansion and indexing."""

    def expand_query(self, query: str) -> dict[str, Any]:
        lower = _lower(query)
        expanded_terms: list[str] = []
        concepts: list[str] = []
        for key, spec in CARE_CONCEPTS.items():
            matched = False
            for term in spec["terms"]:
                if term in lower:
                    matched = True
                    break
            if matched:
                concepts.append(key)
                expanded_terms.append(spec["canonical"])
                expanded_terms.extend(spec["terms"][:8])

        tokens = [t for t in re.findall(r"[a-z0-9']+", lower) if len(t) > 2]
        all_terms = list(dict.fromkeys(tokens + expanded_terms))
        expanded_query = " ".join(all_terms) if all_terms else lower
        return {
            "original": query,
            "expanded_query": expanded_query,
            "expanded_terms": expanded_terms,
            "concepts": concepts,
            "synonym_expansion_used": bool(expanded_terms),
        }

    def canonical_terms_for_text(self, text: str) -> list[str]:
        lower = _lower(text)
        found: list[str] = []
        for spec in CARE_CONCEPTS.values():
            canonical = spec["canonical"]
            if canonical in lower:
                if canonical not in found:
                    found.append(canonical)
                continue
            for term in spec["terms"]:
                if term in lower and canonical not in found:
                    found.append(canonical)
                    break
        return found

    def keywords_for_concept(self, concept: str) -> list[str]:
        spec = CARE_CONCEPTS.get(concept)
        if not spec:
            return []
        return list(spec["terms"])

    def detect_concepts(self, text: str) -> list[str]:
        lower = _lower(text)
        concepts: list[str] = []
        for key, spec in CARE_CONCEPTS.items():
            if any(term in lower for term in spec["terms"]) or spec["canonical"] in lower:
                concepts.append(key)
        return concepts

    def semantic_keywords_for_text(self, text: str) -> list[str]:
        """Extra index terms derived from detected concepts."""
        keywords: list[str] = []
        for concept in self.detect_concepts(text):
            keywords.extend(self.keywords_for_concept(concept)[:6])
        seen: set[str] = set()
        deduped: list[str] = []
        for kw in keywords:
            k = _lower(kw)
            if k in seen:
                continue
            seen.add(k)
            deduped.append(kw)
        return deduped[:24]


orb_care_synonym_service = OrbCareSynonymService()
