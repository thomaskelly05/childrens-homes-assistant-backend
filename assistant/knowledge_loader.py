import json
import os
import logging
import importlib
from functools import lru_cache
from typing import Any

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


def _serialise_value(value: Any) -> str:
    """
    Convert supported Python knowledge values into readable text.
    """
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, (list, tuple, dict)):
        try:
            return json.dumps(value, ensure_ascii=False, indent=2)
        except Exception:
            return str(value).strip()

    return str(value).strip()


def _module_to_text(module) -> str:
    """
    Convert a knowledge module into readable prompt text
    without requiring the module files themselves to change.
    """
    parts = []

    preferred_names = [
        "KNOWLEDGE",
        "GUIDANCE",
        "PRACTICE_GUIDANCE",
        "PRINCIPLES",
        "RULES",
        "FRAMEWORK",
        "CONTENT",
        "DATA",
        "TEXT",
    ]

    for name in preferred_names:
        if hasattr(module, name):
            value = getattr(module, name)
            text = _serialise_value(value)
            if text:
                parts.append(f"{name}:\n{text}")

    if parts:
        return "\n\n".join(parts).strip()

    # fallback: load public constants / simple values
    for name in dir(module):
        if name.startswith("_"):
            continue

        value = getattr(module, name)

        if callable(value):
            continue

        if isinstance(value, (str, list, tuple, dict)):
            text = _serialise_value(value)
            if text:
                parts.append(f"{name}:\n{text}")

    return "\n\n".join(parts).strip()


# -----------------------------------------------------
# Core JSON Knowledge Loaders
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
    """
    Supports either version.json or version.txt without forcing
    you to rename your existing file.
    """
    json_path = os.path.join(BASE_PATH, "version.json")
    txt_path = os.path.join(BASE_PATH, "version.txt")

    if os.path.exists(json_path):
        return _safe_load_json(json_path)

    if os.path.exists(txt_path):
        with open(txt_path, "r", encoding="utf-8") as f:
            return {"version": f.read().strip()}

    logger.error("Knowledge version file missing: version.json or version.txt")
    raise FileNotFoundError("Knowledge version file missing: version.json or version.txt")


# -----------------------------------------------------
# Python Knowledge Modules
# -----------------------------------------------------

PYTHON_KNOWLEDGE_MODULES = {
    "boundaries_identity": "assistant.knowledge.boundaries_identity",
    "contextual_safeguarding": "assistant.knowledge.contextual_safeguarding",
    "emotional_load": "assistant.knowledge.emotional_load",
    "environment_routines": "assistant.knowledge.environment_routines",
    "leadership_management": "assistant.knowledge.leadership_management",
    "neurodevelopmental": "assistant.knowledge.neurodevelopmental",
    "practice_triangle": "assistant.knowledge.practice_triangle",
    "reflective_debrief": "assistant.knowledge.reflective_debrief",
    "reflective_practice": "assistant.knowledge.reflective_practice",
    "safe_recording": "assistant.knowledge.safe_recording",
    "team_learning_loop": "assistant.knowledge.team_learning_loop",
    "therapeutic_language": "assistant.knowledge.therapeutic_language",
    "trauma_informed": "assistant.knowledge.trauma_informed",
    "values_engine": "assistant.knowledge.values_engine",
}


@lru_cache(maxsize=1)
def load_python_knowledge_modules() -> dict[str, str]:
    loaded: dict[str, str] = {}

    for short_name, module_path in PYTHON_KNOWLEDGE_MODULES.items():
        try:
            module = importlib.import_module(module_path)
            loaded[short_name] = _module_to_text(module)
        except Exception as e:
            logger.exception("Failed loading knowledge module %s: %s", module_path, e)
            loaded[short_name] = ""

    return loaded


# -----------------------------------------------------
# Combined Knowledge
# -----------------------------------------------------

@lru_cache(maxsize=1)
def load_all_knowledge():
    return {
        "templates": load_templates(),
        "reflective_questions": load_reflective_questions(),
        "micro_interventions": load_micro_interventions(),
        "shift_flows": load_shift_flows(),
        "guidance_sources": load_guidance_sources(),
        "version": load_knowledge_version(),
        "python_modules": load_python_knowledge_modules(),
    }


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
# Knowledge Selection
# -----------------------------------------------------

def select_relevant_python_knowledge(message: str, max_modules: int = 4) -> dict[str, str]:
    """
    Select the most relevant practice knowledge modules for a request.
    Keeps prompts focused and faster than loading everything every time.
    """
    text = (message or "").lower()
    all_modules = load_python_knowledge_modules()

    keyword_map = {
        "safe_recording": [
            "record", "recording", "daily log", "incident", "handover", "chronology",
            "write up", "rewrite", "professional wording", "body map", "bruise", "injury",
            "observation", "factual"
        ],
        "contextual_safeguarding": [
            "safeguarding", "concern", "bruise", "injury", "neglect", "exploitation",
            "criminal exploitation", "sexual exploitation", "missing", "risk", "allegation"
        ],
        "trauma_informed": [
            "trauma", "distress", "dysregulated", "trigger", "de-escalation", "regulation",
            "meltdown", "shutdown", "fight", "flight", "freeze"
        ],
        "therapeutic_language": [
            "wording", "language", "phrase", "rephrase", "rewrite", "say this better",
            "professional", "child-centred"
        ],
        "neurodevelopmental": [
            "autism", "autistic", "adhd", "learning disability", "learning difficulties",
            "global developmental delay", "communication", "sensory", "non-verbal",
            "minimally verbal", "neurodivergent"
        ],
        "reflective_practice": [
            "reflect", "reflection", "supervision", "learning", "what could i have done",
            "practice reflection"
        ],
        "reflective_debrief": [
            "debrief", "after the incident", "post-incident", "what went well", "what to learn"
        ],
        "emotional_load": [
            "overwhelmed", "emotional impact", "stress", "burnout", "heavy shift", "upset"
        ],
        "environment_routines": [
            "routine", "transition", "bedtime", "morning", "environment", "predictable",
            "structure"
        ],
        "leadership_management": [
            "manager", "management", "oversight", "action plan", "team inconsistency",
            "quality assurance", "audit"
        ],
        "practice_triangle": [
            "analysis", "formulation", "understanding behaviour", "what is going on"
        ],
        "boundaries_identity": [
            "identity", "belonging", "boundaries", "relationships", "safe relationships"
        ],
        "team_learning_loop": [
            "team learning", "lessons learned", "improvement", "staff consistency"
        ],
        "values_engine": [
            "values", "ethos", "best practice", "approach", "principles"
        ],
    }

    scored: list[tuple[int, str]] = []

    for module_name, keywords in keyword_map.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0 and all_modules.get(module_name):
            scored.append((score, module_name))

    scored.sort(reverse=True)

    selected_names = [name for _, name in scored[:max_modules]]

    if not selected_names:
        # sensible defaults for general children’s home drafting
        defaults = ["safe_recording", "trauma_informed", "therapeutic_language"]
        selected_names = [name for name in defaults if all_modules.get(name)]

    return {name: all_modules[name] for name in selected_names if all_modules.get(name)}


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
    load_python_knowledge_modules.cache_clear()
    load_all_knowledge.cache_clear()

    logger.info("IndiCare knowledge cache cleared.")


# -----------------------------------------------------
# Knowledge Health Check
# -----------------------------------------------------

def validate_knowledge_files():
    """
    Ensures required JSON knowledge files exist
    and are valid.
    """
    required_json_files = [
        "template_library.json",
        "reflective_questions.json",
        "micro_interventions.json",
        "shift_flows.json",
        "guidance_sources.json",
    ]

    for file in required_json_files:
        path = os.path.join(BASE_PATH, file)

        if not os.path.exists(path):
            raise FileNotFoundError(f"Required knowledge file missing: {file}")

        _safe_load_json(path)

    # accept either version.json or version.txt
    version_json = os.path.join(BASE_PATH, "version.json")
    version_txt = os.path.join(BASE_PATH, "version.txt")

    if not os.path.exists(version_json) and not os.path.exists(version_txt):
        raise FileNotFoundError("Required knowledge version file missing: version.json or version.txt")

    if os.path.exists(version_json):
        _safe_load_json(version_json)

    logger.info("All IndiCare knowledge files validated successfully.")
