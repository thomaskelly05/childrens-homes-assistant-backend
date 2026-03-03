import json
import os
from pathlib import Path

KNOWLEDGE_DIR = Path(__file__).resolve().parent / "knowledge"

REQUIRED_FILES = {
    "template_library.json": "object",
    "reflective_questions.json": "list",
    "shift_flows.json": "object",
    "micro_interventions.json": "object",
}

def validate_json_file(path: Path, expected_type: str):
    if not path.exists():
        raise FileNotFoundError(f"Missing knowledge file: {path.name}")

    if path.stat().st_size == 0:
        raise ValueError(f"Knowledge file is empty: {path.name}")

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise ValueError(f"Invalid JSON in {path.name}: {e}")

    if expected_type == "object" and not isinstance(data, dict):
        raise TypeError(f"{path.name} must contain a JSON object")
    if expected_type == "list" and not isinstance(data, list):
        raise TypeError(f"{path.name} must contain a JSON list")

    return True


def validate_all_knowledge():
    errors = []

    for filename, expected_type in REQUIRED_FILES.items():
        path = KNOWLEDGE_DIR / filename
        try:
            validate_json_file(path, expected_type)
        except Exception as e:
            errors.append(str(e))

    if errors:
        error_block = "\n".join(errors)
        raise RuntimeError(
            f"\nIndiCare Knowledge Pack validation failed:\n{error_block}\n"
            "Fix the above issues before deploying."
        )

    return True
