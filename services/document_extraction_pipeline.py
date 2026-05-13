from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Protocol
from uuid import uuid4


@dataclass
class DocumentExtractionResult:
    extracted_text: str
    findings: list[dict[str, object]] = field(default_factory=list)
    actions_detected: list[dict[str, object]] = field(default_factory=list)
    evidence_detected: list[dict[str, object]] = field(default_factory=list)
    chronology_links: list[dict[str, object]] = field(default_factory=list)
    safeguarding_flags: list[str] = field(default_factory=list)
    regulation_references: list[str] = field(default_factory=list)
    status: str = "review_required"
    processor: str = "placeholder"


class DocumentExtractionProcessor(Protocol):
    def extract(self, *, text: str, document_type: str | None = None) -> DocumentExtractionResult:
        ...


class PlaceholderDocumentProcessor:
    """Deterministic extraction foundation until AI/document parsing adapters are plugged in."""

    ACTION_TERMS = ("must", "should", "recommend", "action", "ensure", "review")
    SAFEGUARDING_TERMS = ("safeguarding", "missing", "risk", "allegation", "harm", "unsafe", "exploitation")

    def extract(self, *, text: str, document_type: str | None = None) -> DocumentExtractionResult:
        cleaned = text.strip()
        lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
        findings: list[dict[str, object]] = []
        actions: list[dict[str, object]] = []
        evidence: list[dict[str, object]] = []
        chronology_links: list[dict[str, object]] = []
        safeguarding_flags: set[str] = set()
        regulations = sorted(set(re.findall(r"\b(?:Reg(?:ulation)?\.?\s*)\d+[A-Za-z]?\b", cleaned, flags=re.IGNORECASE)))

        for index, line in enumerate(lines[:30], start=1):
            lower = line.lower()
            severity = "high" if any(term in lower for term in self.SAFEGUARDING_TERMS) else "medium"
            finding = {
                "id": f"finding-{uuid4().hex[:10]}",
                "title": line[:120],
                "summary": line,
                "severity": severity,
                "regulation": regulations[0] if regulations else None,
                "evidenceRequired": ["source document", "manager review"],
                "actionIds": [],
                "chronologyEventId": None,
            }
            findings.append(finding)

            if any(term in lower for term in self.ACTION_TERMS):
                actions.append(
                    {
                        "title": line[:120],
                        "description": line,
                        "priority": "high" if severity == "high" else "medium",
                        "source": "document_extraction",
                    }
                )
            if any(term in lower for term in self.SAFEGUARDING_TERMS):
                safeguarding_flags.add("safeguarding_review_required")
            evidence.append({"label": line[:120], "source_line": index, "confidence": "placeholder"})
            chronology_links.append({"title": line[:120], "source_line": index, "review_required": True})

        return DocumentExtractionResult(
            extracted_text=cleaned,
            findings=findings,
            actions_detected=actions,
            evidence_detected=evidence[:30],
            chronology_links=chronology_links[:30],
            safeguarding_flags=sorted(safeguarding_flags),
            regulation_references=regulations,
            status="review_required" if findings else "completed",
        )


class DocumentExtractionPipeline:
    def __init__(self, processor: DocumentExtractionProcessor | None = None) -> None:
        self.processor = processor or PlaceholderDocumentProcessor()

    def extract(self, *, text: str, document_type: str | None = None) -> DocumentExtractionResult:
        return self.processor.extract(text=text, document_type=document_type)


def extraction_pipeline() -> DocumentExtractionPipeline:
    return DocumentExtractionPipeline()
