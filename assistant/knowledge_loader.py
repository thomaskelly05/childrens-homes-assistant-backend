from __future__ import annotations

import importlib
import json
import logging
import os
from functools import lru_cache
from typing import Any

BASE_PATH = os.path.join(os.path.dirname(__file__), "knowledge")

logger = logging.getLogger("indicare.knowledge")


# =====================================================
# SAFE HELPERS
# =====================================================
def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_load_json(path: str):
    if not os.path.exists(path):
        logger.error("Knowledge file missing: %s", path)
        raise FileNotFoundError(f"Knowledge file missing: {path}")

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        logger.error("Invalid JSON in %s: %s", path, exc)
        raise ValueError(f"Invalid JSON in {path}: {exc}") from exc


def _load_json(filename: str):
    return _safe_load_json(os.path.join(BASE_PATH, filename))


def _serialise_value(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, (list, tuple, dict)):
        try:
            return json.dumps(value, ensure_ascii=False, indent=2)
        except Exception:
            return str(value).strip()

    return str(value).strip()


def _module_to_text(module) -> str:
    parts: list[str] = []

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
        "CITATIONS",
        "REGULATIONS",
        "QUALITY_STANDARDS",
        "SCCIF",
        "INSPECTION_PROMPTS",
        "EVIDENCE_PROMPTS",
    ]

    for name in preferred_names:
        if hasattr(module, name):
            text = _serialise_value(getattr(module, name))
            if text:
                parts.append(f"{name}:\n{text}")

    if parts:
        return "\n\n".join(parts).strip()

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


# =====================================================
# CORE JSON LOADERS
# =====================================================
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
    json_path = os.path.join(BASE_PATH, "version.json")
    txt_path = os.path.join(BASE_PATH, "version.txt")

    if os.path.exists(json_path):
        return _safe_load_json(json_path)

    if os.path.exists(txt_path):
        with open(txt_path, "r", encoding="utf-8") as f:
            return {"version": f.read().strip()}

    logger.warning("Knowledge version file missing: version.json or version.txt")
    return {"version": "unknown"}


# =====================================================
# PYTHON KNOWLEDGE MODULES
# =====================================================
PYTHON_KNOWLEDGE_MODULES = {
    # Existing practical knowledge
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

    # Elite / optional quality evidence modules
    "inspection_readiness": "assistant.knowledge.inspection_readiness",
    "quality_standards": "assistant.knowledge.quality_standards",
    "regulation_citations": "assistant.knowledge.regulation_citations",
    "ofsted_sccif": "assistant.knowledge.ofsted_sccif",
    "regulatory_framework": "assistant.knowledge.regulatory_framework",
    "working_together": "assistant.knowledge.working_together",
    "reg44_reg45": "assistant.knowledge.reg44_reg45",
    "pace_attachment": "assistant.knowledge.pace_attachment",
    "medication_restraint": "assistant.knowledge.medication_restraint",
}


OPTIONAL_MODULES = {
    "inspection_readiness",
    "quality_standards",
    "regulation_citations",
    "ofsted_sccif",
}


@lru_cache(maxsize=1)
def load_python_knowledge_modules() -> dict[str, str]:
    loaded: dict[str, str] = {}

    for short_name, module_path in PYTHON_KNOWLEDGE_MODULES.items():
        try:
            module = importlib.import_module(module_path)
            text = _module_to_text(module)
            loaded[short_name] = text if text.strip() else ""
        except ModuleNotFoundError:
            if short_name in OPTIONAL_MODULES:
                logger.info("Optional knowledge module not present: %s", module_path)
            else:
                logger.exception("Required knowledge module missing: %s", module_path)
            loaded[short_name] = ""
        except Exception as exc:
            logger.exception("Failed loading knowledge module %s: %s", module_path, exc)
            loaded[short_name] = ""

    return loaded


# =====================================================
# COMBINED KNOWLEDGE
# =====================================================
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


def get_guidance_review_info():
    data = load_guidance_sources()

    return {
        "last_checked": data.get("last_checked"),
        "review_frequency": data.get("review_frequency"),
        "next_review_due": data.get("next_review_due"),
    }


# =====================================================
# ELITE KNOWLEDGE SELECTION
# =====================================================
MODULE_KEYWORDS = {
    "safe_recording": [
        "record",
        "recording",
        "daily log",
        "daily note",
        "incident",
        "handover",
        "chronology",
        "write up",
        "rewrite",
        "professional wording",
        "body map",
        "bruise",
        "injury",
        "observation",
        "factual",
        "log entry",
        "evidence",
        "audit trail",
        "defensible",
    ],
    "contextual_safeguarding": [
        "safeguarding",
        "concern",
        "bruise",
        "injury",
        "neglect",
        "exploitation",
        "criminal exploitation",
        "sexual exploitation",
        "missing",
        "missing from home",
        "risk",
        "allegation",
        "disclosure",
        "staff hurt",
        "lado",
        "police",
        "child protection",
        "county lines",
        "self-harm",
        "suicidal",
    ],
    "trauma_informed": [
        "trauma",
        "distress",
        "dysregulated",
        "trigger",
        "de-escalation",
        "regulation",
        "meltdown",
        "shutdown",
        "fight",
        "flight",
        "freeze",
        "low arousal",
        "co-regulation",
        "emotional safety",
    ],
    "therapeutic_language": [
        "wording",
        "language",
        "phrase",
        "rephrase",
        "rewrite",
        "say this better",
        "professional",
        "child-centred",
        "non-punitive",
        "neutral language",
    ],
    "neurodevelopmental": [
        "autism",
        "autistic",
        "adhd",
        "learning disability",
        "learning difficulties",
        "global developmental delay",
        "gdd",
        "communication",
        "sensory",
        "non-verbal",
        "minimally verbal",
        "neurodivergent",
        "processing",
        "visuals",
    ],
    "reflective_practice": [
        "reflect",
        "reflection",
        "supervision",
        "learning",
        "what could i have done",
        "practice reflection",
        "debrief",
        "what did we learn",
        "staff support",
    ],
    "reflective_debrief": [
        "debrief",
        "after the incident",
        "post-incident",
        "what went well",
        "what to learn",
        "restorative",
        "team debrief",
    ],
    "emotional_load": [
        "overwhelmed",
        "emotional impact",
        "stress",
        "burnout",
        "heavy shift",
        "upset",
        "drained",
        "staff exhausted",
        "team morale",
    ],
    "environment_routines": [
        "routine",
        "transition",
        "bedtime",
        "morning",
        "environment",
        "predictable",
        "structure",
        "sensory environment",
        "settling",
    ],
    "leadership_management": [
        "manager",
        "management",
        "registered manager",
        "responsible individual",
        "ri",
        "oversight",
        "action plan",
        "team inconsistency",
        "quality assurance",
        "audit",
        "governance",
        "ofsted",
        "inspection",
        "provider",
        "monitoring",
    ],
    "practice_triangle": [
        "analysis",
        "formulation",
        "understanding behaviour",
        "what is going on",
        "pattern",
        "meaning",
        "hypothesis",
    ],
    "boundaries_identity": [
        "identity",
        "belonging",
        "boundaries",
        "relationships",
        "safe relationships",
        "family time",
        "contact",
    ],
    "team_learning_loop": [
        "team learning",
        "lessons learned",
        "improvement",
        "staff consistency",
        "practice drift",
        "handover gap",
        "repeat issue",
    ],
    "values_engine": [
        "values",
        "ethos",
        "best practice",
        "approach",
        "principles",
        "culture",
        "care culture",
    ],
    "regulatory_framework": [
        "regulation",
        "regulations",
        "quality standards",
        "children's homes regulations",
        "reg 40",
        "notification",
        "statutory",
    ],
    "working_together": [
        "working together",
        "lado",
        "allegation against staff",
        "child protection",
        "mash",
        "local authority",
        "partnership",
    ],
    "reg44_reg45": [
        "reg 44",
        "reg 45",
        "regulation 44",
        "regulation 45",
        "independent visitor",
        "independent person",
    ],
    "pace_attachment": [
        "pace",
        "attachment",
        "relational",
        "repair",
        "felt safety",
    ],
    "medication_restraint": [
        "medication",
        "prn",
        "restraint",
        "physical intervention",
        "body map",
        "hold",
    ],
    "inspection_readiness": [
        "ofsted",
        "inspection",
        "inspection evidence preparation",
        "Inspection evidence preparation",
        "what would ofsted say",
        "what would an inspector notice",
        "sccif",
        "evidence pack",
        "audit trail",
        "triangulation",
        "lived experience",
        "impact of care",
        "requires improvement",
        "good",
        "outstanding",
    ],
    "quality_standards": [
        "quality standard",
        "quality standards",
        "children's homes regulations",
        "childrens homes regulations",
        "regulation",
        "regulations",
        "care planning standard",
        "leadership and management standard",
        "protection of children standard",
        "views wishes and feelings",
    ],
    "regulation_citations": [
        "reg 12",
        "regulation 12",
        "reg 13",
        "regulation 13",
        "reg 14",
        "regulation 14",
        "reg 40",
        "regulation 40",
        "reg 44",
        "regulation 44",
        "reg 45",
        "regulation 45",
        "notification",
        "serious event",
        "independent person",
        "quality of care review",
    ],
    "ofsted_sccif": [
        "sccif",
        "social care common inspection framework",
        "ofsted framework",
        "inspection judgement",
        "effectiveness of leaders",
        "help and protection",
        "progress and experiences",
        "lived experience",
        "inspection evidence",
        "short inspection",
        "full inspection",
    ],
}


INSPECTION_TRIGGER_WORDS = {
    "ofsted",
    "inspection",
    "inspector",
    "sccif",
    "inspection evidence preparation",
    "Inspection evidence preparation",
    "evidence pack",
    "audit trail",
    "triangulation",
    "quality assurance",
    "reg 45",
    "regulation 45",
    "quality of care review",
    "what would ofsted",
    "what would an inspector",
    "requires improvement",
    "good judgement",
    "outstanding",
}


REGULATION_TRIGGER_WORDS = {
    "regulation",
    "regulations",
    "children's homes regulations",
    "childrens homes regulations",
    "quality standard",
    "quality standards",
    "statutory",
    "legal",
    "policy",
    "guidance",
    "reg 12",
    "reg 13",
    "reg 14",
    "reg 40",
    "reg 44",
    "reg 45",
}


SAFEGUARDING_TRIGGER_WORDS = {
    "safeguarding",
    "missing",
    "exploitation",
    "self-harm",
    "suicidal",
    "allegation",
    "disclosure",
    "injury",
    "bruise",
    "police",
    "lado",
    "child protection",
    "serious incident",
}


LEADERSHIP_TRIGGER_WORDS = {
    "manager",
    "registered manager",
    "responsible individual",
    "provider",
    "oversight",
    "governance",
    "quality assurance",
    "audit",
    "action plan",
    "monitoring",
    "service improvement",
}


REFLECTIVE_TRIGGER_WORDS = {
    "reflect",
    "reflection",
    "supervision",
    "debrief",
    "what could i have done",
    "what can we learn",
    "staff support",
    "team learning",
}


DEFAULT_MODULES = [
    "safe_recording",
    "trauma_informed",
    "therapeutic_language",
    "contextual_safeguarding",
]


def _contains_any(text: str, terms: set[str] | list[str]) -> bool:
    return any(term.lower() in text for term in terms)


def _score_module(text: str, keywords: list[str]) -> int:
    score = 0

    for keyword in keywords:
        keyword = keyword.lower().strip()
        if not keyword:
            continue

        if keyword in text:
            score += 3 if len(keyword.split()) >= 2 else 1

    return score


def _apply_context_boosts(text: str, module_name: str, score: int) -> int:
    if _contains_any(text, INSPECTION_TRIGGER_WORDS):
        if module_name in {
            "inspection_readiness",
            "ofsted_sccif",
            "quality_standards",
            "regulation_citations",
            "leadership_management",
            "safe_recording",
        }:
            score += 6

    if _contains_any(text, REGULATION_TRIGGER_WORDS):
        if module_name in {
            "quality_standards",
            "regulation_citations",
            "ofsted_sccif",
            "leadership_management",
            "safe_recording",
        }:
            score += 5

    if _contains_any(text, SAFEGUARDING_TRIGGER_WORDS):
        if module_name in {
            "contextual_safeguarding",
            "safe_recording",
            "trauma_informed",
            "regulation_citations",
            "quality_standards",
        }:
            score += 5

    if _contains_any(text, LEADERSHIP_TRIGGER_WORDS):
        if module_name in {
            "leadership_management",
            "inspection_readiness",
            "quality_standards",
            "team_learning_loop",
        }:
            score += 4

    if _contains_any(text, REFLECTIVE_TRIGGER_WORDS):
        if module_name in {
            "reflective_practice",
            "reflective_debrief",
            "emotional_load",
            "team_learning_loop",
        }:
            score += 4

    return score


def select_relevant_python_knowledge(
    message: str,
    max_modules: int = 6,
) -> dict[str, str]:
    """
    Selects the most relevant knowledge modules.

    Elite behaviour:
    - inspection questions pull inspection, SCCIF, quality standards and regulation knowledge
    - safeguarding questions pull safeguarding + recording + regulation knowledge
    - reflective questions pull supervision/debrief/team learning knowledge
    - leadership questions pull RM/RI/quality assurance knowledge
    - operational drafting stays fast and focused
    """
    text = _safe_string(message).lower()
    all_modules = load_python_knowledge_modules()

    scored: list[tuple[int, str]] = []

    for module_name, keywords in MODULE_KEYWORDS.items():
        if not all_modules.get(module_name):
            continue

        score = _score_module(text, keywords)
        score = _apply_context_boosts(text, module_name, score)

        if score > 0:
            scored.append((score, module_name))

    scored.sort(key=lambda item: (-item[0], item[1]))

    selected_names = [name for _, name in scored[:max_modules]]

    if not selected_names:
        selected_names = [name for name in DEFAULT_MODULES if all_modules.get(name)]

    return {
        name: all_modules[name]
        for name in selected_names
        if all_modules.get(name)
    }


def build_knowledge_source_summary(selected_modules: dict[str, str]) -> list[dict[str, str]]:
    """
    Metadata that can be passed into runtime/explainability if needed.
    This does not create fake citations. It only labels which knowledge modules were loaded.
    """
    result: list[dict[str, str]] = []

    for name in selected_modules:
        source_type = "internal_practice_knowledge"

        if name in {"inspection_readiness", "ofsted_sccif"}:
            source_type = "inspection_framework_knowledge"
        elif name in {"quality_standards", "regulation_citations"}:
            source_type = "regulatory_knowledge"
        elif name in {"contextual_safeguarding"}:
            source_type = "safeguarding_knowledge"
        elif name in {"reflective_practice", "reflective_debrief", "emotional_load"}:
            source_type = "reflective_practice_knowledge"

        result.append(
            {
                "module": name,
                "source_type": source_type,
                "label": name.replace("_", " ").title(),
            }
        )

    return result


# =====================================================
# CACHE CONTROL
# =====================================================
def reload_knowledge():
    load_templates.cache_clear()
    load_reflective_questions.cache_clear()
    load_micro_interventions.cache_clear()
    load_shift_flows.cache_clear()
    load_guidance_sources.cache_clear()
    load_knowledge_version.cache_clear()
    load_python_knowledge_modules.cache_clear()
    load_all_knowledge.cache_clear()

    logger.info("IndiCare knowledge cache cleared.")


# =====================================================
# HEALTH CHECK
# =====================================================
def validate_knowledge_files():
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

    version_json = os.path.join(BASE_PATH, "version.json")
    version_txt = os.path.join(BASE_PATH, "version.txt")

    if not os.path.exists(version_json) and not os.path.exists(version_txt):
        logger.warning("Knowledge version file missing: version.json or version.txt")

    if os.path.exists(version_json):
        _safe_load_json(version_json)

    logger.info("All IndiCare knowledge files validated successfully.")
