# assistant/knowledge_loader.py

import json
import os
import logging
from functools import lru_cache

BASE_PATH = os.path.join(os.path.dirname(__file__), "knowledge")

logger = logging.getLogger("indicare.knowledge")
logging.basicConfig(level=logging.INFO)


def _safe_load_json(path: str):
    """
    Safely load JSON with helpful error handling.
    """
    if not os.path.exists(path):
        logger.error(f"Knowledge file missing: {path}")
        raise FileNotFoundError(f"Knowledge file missing: {path}")

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in {path}: {e}")
        raise


def _load_json(filename: str):
    """
    Internal loader for IndiCare knowledge files.
    """
    path = os.path.join(BASE_PATH, filename)
    return _safe_load_json(path)


# -----------------------------------------------------
# Core Knowledge Loaders
# -----------------------------------------------------

@lru_cache(maxsize=None)
def load_templates():
    return _load_json("template_library.json")


@lru_cache(maxsize=None)
def load_reflective_questions():
    return _load_json("reflective_questions.json")


@lru_cache(maxsize=None)
def load_micro_interventions():
    return _load_json("micro_interventions.json")


@lru_cache(maxsize=None)
def load_shift_flows():
    return _load_json("shift_flows.json")


@lru_cache(maxsize=None)
def load_guidance_sources():
    return _load_json("guidance_sources.json")


@lru_cache(maxsize=None)
def load_knowledge_version():
    return _load_json("version.json")


# -----------------------------------------------------
# Knowledge Metadata
# -----------------------------------------------------

def get_guidance_review_info():
    data = load_guidance_sources()

    return {
        "last_checked": data.get("last_checked"),
        "review_frequency": data.get("review_frequency"),
        "next_review_due": data.get("next_review_due"),
    }


# -----------------------------------------------------
# Knowledge Reload Utility
# -----------------------------------------------------

def reload_knowledge():
    """
    Clears cached knowledge so updates can be loaded
    without restarting the server.
    """

    load_templates.cache_clear()
    load_reflective_questions.cache_clear()
    load_micro_interventions.cache_clear()
    load_shift_flows.cache_clear()
    load_guidance_sources.cache_clear()
    load_knowledge_version.cache_clear()

    logger.info("IndiCare knowledge cache cleared.")


# -----------------------------------------------------
# Knowledge Health Check
# -----------------------------------------------------

def validate_knowledge_files():
    """
    Ensures all required knowledge files exist
    and are valid JSON.
    """

    required_files = [
        "template_library.json",
        "reflective_questions.json",
        "micro_interventions.json",
        "shift_flows.json",
        "guidance_sources.json",
        "version.json",
    ]

    for file in required_files:
        path = os.path.join(BASE_PATH, file)

        if not os.path.exists(path):
            raise FileNotFoundError(f"Required knowledge file missing: {file}")

        _safe_load_json(path)

    logger.info("All IndiCare knowledge files validated successfully.")
