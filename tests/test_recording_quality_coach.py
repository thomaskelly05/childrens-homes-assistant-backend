from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
QUALITY_LIB = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-quality-coach.ts"

JUDGEMENTAL_SAMPLES = [
    ("YP kicked off and refused to listen.", ["kicked off", "refused"]),
    ("They were manipulative and attention seeking.", ["manipulative", "attention seeking"]),
]

SAFEGUARDING_SAMPLES = [
    ("There was an allegation and the young person had an injury.", ["allegation", "injury"]),
]

PRIVACY_SAMPLES = [
    ("Mum Sarah called 07700123456.", ["phone"]),
]


def _read() -> str:
    return QUALITY_LIB.read_text(encoding="utf-8")


def _find_judgemental(text: str) -> list[str]:
    patterns = [
        (r"\battention[\s-]?seeking\b", "attention seeking"),
        (r"\bmanipulative\b", "manipulative"),
        (r"\bnaughty\b", "naughty"),
        (r"\baggressive\b", "aggressive"),
        (r"\brefused\b", "refused"),
        (r"\bkicked off\b", "kicked off"),
        (r"\bbad behaviour\b", "bad behaviour"),
        (r"\bdeliberately\b", "deliberately"),
        (r"\bnon[\s-]?compliant\b", "non-compliant"),
        (r"\bchose to behave\b", "chose to behave"),
    ]
    found: list[str] = []
    for pattern, label in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            found.append(label)
    return found


def _safeguarding_terms(text: str) -> list[str]:
    terms = [
        "allegation",
        "disclosure",
        "injury",
        "restraint",
        "missing",
        "self-harm",
        "suicide",
        "medication error",
        "abscond",
        "police",
        "hospital",
        "exploitation",
        "abuse",
        "body map",
    ]
    lower = text.lower()
    return [term for term in terms if term in lower]


def _privacy_hits(text: str) -> list[str]:
    checks = [
        ("phone", re.compile(r"\b0\d{10,11}\b")),
        ("email", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)),
        ("postcode", re.compile(r"\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b", re.I)),
        ("school", re.compile(r"\bschool\b", re.I)),
    ]
    return [label for label, pattern in checks if pattern.search(text)]


def test_quality_coach_library_markers():
    text = _read()
    for marker in (
        "JUDGEMENTAL_PHRASES",
        "SAFEGUARDING_REVIEW_TERMS",
        "PRIVACY_IDENTIFIER_CHECKS",
        "analyseRecordingQuality",
        "findJudgementalPhrases",
        "RECORDING_OS_ORB_HREF",
        "RECORDING_STANDALONE_ORB_HREF",
        "manager-review-required",
        "recordingType",
    ):
        assert marker in text, f"Missing quality coach marker: {marker}"


def test_manager_review_required_for_restraint_type():
    text = _read()
    assert "formRequiresManagerReview" in text
    assert "physical-intervention" in text or "requiresManagerReview" in text


def test_judgemental_phrase_detection():
    for sample, expected_labels in JUDGEMENTAL_SAMPLES:
        found = _find_judgemental(sample)
        for label in expected_labels:
            assert label in found, f"Expected {label} in {sample}, got {found}"


def test_safeguarding_term_detection():
    for sample, expected in SAFEGUARDING_SAMPLES:
        found = _safeguarding_terms(sample)
        for term in expected:
            assert term in found


def test_privacy_identifier_detection():
    for sample, expected in PRIVACY_SAMPLES:
        found = _privacy_hits(sample)
        for label in expected:
            assert label in found
