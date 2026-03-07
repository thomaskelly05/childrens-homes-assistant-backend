# assistant/knowledge_loader.py

import json
import os
from functools import lru_cache

BASE_PATH = os.path.join(os.path.dirname(__file__), "knowledge")


def _safe_load_json(path):
    """
    Safely load JSON with helpful error handling.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Knowledge file missing: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_json(filename: str):
    """
    Internal loader for IndiCare knowledge files.
    """
    path = os.path.join(BASE_PATH, filename)
    return _safe_load_json(path)


@lru_cache(maxsize=None)
def load_templates():
    """
    Returns template library dictionary.
    """
    return _load_json("template_library.json")


@lru_cache(maxsize=None)
def load_reflective_questions():
    """
    Returns reflective questions list.
    """
    return _load_json("reflective_questions.json")


@lru_cache(maxsize=None)
def load_micro_interventions():
    """
    Returns micro-intervention categories.
    """
    return _load_json("micro_interventions.json")


@lru_cache(maxsize=None)
def load_shift_flows():
    """
    Returns shift flow structures.
    """
    return _load_json("shift_flows.json")


@lru_cache(maxsize=None)
def load_guidance_sources():
    """
    Loads statutory guidance references and metadata.
    """
    return _load_json("guidance_sources.json")
