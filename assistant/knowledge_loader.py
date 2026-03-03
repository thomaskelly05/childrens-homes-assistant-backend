import json
import os
from functools import lru_cache

# Base path for all IndiCare knowledge files
BASE_PATH = os.path.join(os.path.dirname(__file__), "knowledge")


def _load_json(filename: str):
    """
    Internal loader for JSON files inside assistant/knowledge/.
    Uses UTF‑8 and returns parsed Python objects.
    """
    path = os.path.join(BASE_PATH, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=None)
def load_templates():
    """
    Returns the template library as a dict:
    { "template_name": "prompt text", ... }
    """
    return _load_json("template_library.json")


@lru_cache(maxsize=None)
def load_reflective_questions():
    """
    Returns a list of reflective questions.
    """
    return _load_json("reflective_questions.json")


@lru_cache(maxsize=None)
def load_micro_interventions():
    """
    Returns a dict of micro‑intervention categories:
    { "grounding": [...], "acceptance": [...], ... }
    """
    return _load_json("micro_interventions.json")


@lru_cache(maxsize=None)
def load_shift_flows():
    """
    Returns shift check‑in and check‑out flows.
    """
    return _load_json("shift_flows.json")
