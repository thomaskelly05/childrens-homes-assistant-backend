from __future__ import annotations

from typing import Any

TIER_ORDER = ["assistant", "professional", "enterprise"]

FEATURE_FLAGS: dict[str, dict[str, bool]] = {
    "assistant": {
        "intelligence": True,
        "projects": True,
        "uploads": True,
        "templates": True,
        "docs": True,
        "notes": True,
        "exports": True,
        "basic_chronology": True,
        "basic_safeguarding_prompts": True,
        "timeline_dock": False,
        "chronology_qa": False,
        "safeguarding_qa": False,
        "operational_search": False,
        "advanced_docs_review": False,
        "proactive_suggestions": False,
        "relationship_awareness": False,
        "inspection_summaries": False,
        "inspection_workspace": False,
        "readiness_scoring": False,
        "evidence_gap_analysis": False,
        "leadership_intelligence": False,
        "operational_copilots": False,
        "predictive_intelligence": False,
        "provider_wide_intelligence": False,
        "advanced_relationship_intelligence": False,
    },
    "professional": {
        "intelligence": True,
        "projects": True,
        "uploads": True,
        "templates": True,
        "docs": True,
        "notes": True,
        "exports": True,
        "basic_chronology": True,
        "basic_safeguarding_prompts": True,
        "timeline_dock": True,
        "chronology_qa": True,
        "safeguarding_qa": True,
        "operational_search": True,
        "advanced_docs_review": True,
        "proactive_suggestions": True,
        "relationship_awareness": True,
        "inspection_summaries": True,
        "inspection_workspace": False,
        "readiness_scoring": False,
        "evidence_gap_analysis": False,
        "leadership_intelligence": True,
        "operational_copilots": True,
        "predictive_intelligence": False,
        "provider_wide_intelligence": False,
        "advanced_relationship_intelligence": False,
    },
    "enterprise": {
        "intelligence": True,
        "projects": True,
        "uploads": True,
        "templates": True,
        "docs": True,
        "notes": True,
        "exports": True,
        "basic_chronology": True,
        "basic_safeguarding_prompts": True,
        "timeline_dock": True,
        "chronology_qa": True,
        "safeguarding_qa": True,
        "operational_search": True,
        "advanced_docs_review": True,
        "proactive_suggestions": True,
        "relationship_awareness": True,
        "inspection_summaries": True,
        "inspection_workspace": True,
        "readiness_scoring": True,
        "evidence_gap_analysis": True,
        "leadership_intelligence": True,
        "operational_copilots": True,
        "predictive_intelligence": True,
        "provider_wide_intelligence": True,
        "advanced_relationship_intelligence": True,
    },
}

FEATURE_LABELS: dict[str, str] = {
    "timeline_dock": "Live chronology timeline",
    "chronology_qa": "Chronology quality review",
    "safeguarding_qa": "Safeguarding quality review",
    "operational_search": "Operational semantic search",
    "advanced_docs_review": "Advanced DOCS intelligence",
    "proactive_suggestions": "Proactive assistant suggestions",
    "relationship_awareness": "Relationship-aware operational memory",
    "inspection_summaries": "Inspection summaries",
    "inspection_workspace": "Inspection workspace",
    "readiness_scoring": "Inspection evidence preparation scoring",
    "evidence_gap_analysis": "Evidence gap analysis",
    "leadership_intelligence": "Leadership intelligence",
    "operational_copilots": "Specialist operational copilots",
    "predictive_intelligence": "Predictive operational intelligence",
    "provider_wide_intelligence": "Provider-wide intelligence",
    "advanced_relationship_intelligence": "Advanced relationship intelligence",
}


def normalise_tier(value: str | None) -> str:
    text = (value or "assistant").strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "basic": "assistant",
        "starter": "assistant",
        "standalone": "assistant",
        "pro": "professional",
        "management": "professional",
        "enterprise_os": "enterprise",
        "os": "enterprise",
    }
    text = aliases.get(text, text)
    return text if text in FEATURE_FLAGS else "assistant"


def tier_from_user(current_user: dict[str, Any] | None) -> str:
    current_user = current_user or {}
    return normalise_tier(
        current_user.get("standalone_tier")
        or current_user.get("subscription_tier")
        or current_user.get("plan_name")
        or current_user.get("plan")
        or current_user.get("role_tier")
    )


def is_enabled(tier: str, feature: str) -> bool:
    return bool(FEATURE_FLAGS.get(normalise_tier(tier), {}).get(feature, False))


def required_tier_for(feature: str) -> str | None:
    for tier in TIER_ORDER:
        if FEATURE_FLAGS[tier].get(feature):
            return tier
    return None


def tier_payload(tier: str) -> dict[str, Any]:
    clean = normalise_tier(tier)
    flags = FEATURE_FLAGS[clean]
    locked = {
        key: {
            "label": FEATURE_LABELS.get(key, key.replace("_", " ").title()),
            "required_tier": required_tier_for(key),
        }
        for key, enabled in flags.items()
        if not enabled and required_tier_for(key)
    }
    return {
        "tier": clean,
        "features": flags,
        "locked": locked,
        "tiers": [
            {"id": "assistant", "name": "IndiCare Assistant", "positioning": "Everyday residential AI"},
            {"id": "professional", "name": "IndiCare Professional", "positioning": "Operational intelligence"},
            {"id": "enterprise", "name": "IndiCare Enterprise", "positioning": "Continuous operational intelligence"},
        ],
    }


def assert_feature(current_user: dict[str, Any], feature: str) -> None:
    from fastapi import HTTPException

    tier = tier_from_user(current_user)
    if is_enabled(tier, feature):
        return
    required = required_tier_for(feature) or "higher"
    raise HTTPException(
        status_code=402,
        detail={
            "error": "feature_locked",
            "feature": feature,
            "label": FEATURE_LABELS.get(feature, feature.replace("_", " ").title()),
            "current_tier": tier,
            "required_tier": required,
            "message": f"This feature is available on the {required.title()} tier.",
        },
    )
