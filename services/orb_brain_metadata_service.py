from __future__ import annotations

"""Canonical ORB Residential brain identity metadata for standalone /orb surfaces.

Every standalone ORB feature should expose the same brain contract so chat, voice,
dictate, documents, actions and agents clearly identify one intelligence layer:

ORB Residential — Powered by IndiCare Intelligence (orb_residential_intelligence).

This module is intentionally small: adapters call it to merge metadata without
rewriting feature-specific response shapes.
"""

from typing import Any

ORB_BRAIN_PRODUCT = "ORB Residential"
ORB_BRAIN_POWERED_BY = "IndiCare Intelligence"
ORB_BRAIN_ID = "orb_residential_intelligence"

# Surfaces that count as the same standalone ORB Residential product brain.
_STANDALONE_SURFACE_ALIASES = frozenset(
    {
        "orb_standalone",
        "orb_residential",
        "standalone",
        "standalone_orb_ai",
        "standalone_orb",
    }
)


def build_brain_metadata(
    *,
    surface: str = "orb_standalone",
    mode: str | None = None,
    lens: str | None = None,
    feature: str | None = None,
    sources: list[dict[str, Any]] | None = None,
    citations: list[dict[str, Any]] | None = None,
    quality: dict[str, Any] | None = None,
    safety: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return the shared standalone ORB brain metadata contract."""
    meta: dict[str, Any] = {
        "surface": surface,
        "product": ORB_BRAIN_PRODUCT,
        "powered_by": ORB_BRAIN_POWERED_BY,
        "brain": ORB_BRAIN_ID,
        "os_records_accessed": False,
        "live_record_access": False,
        "standalone": True,
    }
    if mode:
        meta["mode"] = str(mode).strip()
    if lens:
        meta["lens"] = str(lens).strip()
    if feature:
        meta["feature"] = str(feature).strip()
    if sources is not None:
        meta["sources"] = sources
    if citations is not None:
        meta["citations"] = citations
    if quality:
        meta["quality"] = quality
    if safety:
        meta["safety"] = safety
    if extra:
        meta.update(extra)
    return meta


def merge_context_used(
    context_used: dict[str, Any] | None,
    *,
    surface: str = "orb_standalone",
    mode: str | None = None,
    lens: str | None = None,
    feature: str | None = None,
    sources: list[dict[str, Any]] | None = None,
    citations: list[dict[str, Any]] | None = None,
    quality: dict[str, Any] | None = None,
    safety: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Merge brain metadata into context_used while preserving existing keys."""
    base = dict(context_used or {})
    brain = build_brain_metadata(
        surface=surface,
        mode=mode or base.get("mode"),
        lens=lens,
        feature=feature,
        sources=sources if sources is not None else base.get("sources"),
        citations=citations if citations is not None else base.get("citations"),
        quality=quality or base.get("quality"),
        safety=safety,
        extra=extra,
    )
    base["brain_metadata"] = {**(base.get("brain_metadata") or {}), **brain}
    # Top-level mirrors for older clients/tests.
    for key in (
        "surface",
        "product",
        "powered_by",
        "brain",
        "os_records_accessed",
        "live_record_access",
        "standalone",
    ):
        if key not in base or key in {"surface", "product", "powered_by", "brain"}:
            base[key] = brain[key]
    base["care_record_access"] = False
    base["os_linked"] = False
    base["live_record_access"] = False
    base["os_records_accessed"] = False
    return base


def attach_to_payload(
    payload: dict[str, Any],
    *,
    surface: str = "orb_standalone",
    mode: str | None = None,
    lens: str | None = None,
    feature: str | None = None,
    sources: list[dict[str, Any]] | None = None,
    citations: list[dict[str, Any]] | None = None,
    quality: dict[str, Any] | None = None,
    safety: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Attach brain metadata and boundary flags to a top-level API payload."""
    brain = build_brain_metadata(
        surface=surface,
        mode=mode,
        lens=lens,
        feature=feature,
        sources=sources,
        citations=citations,
        quality=quality,
        safety=safety,
        extra=extra,
    )
    payload["brain_metadata"] = {**(payload.get("brain_metadata") or {}), **brain}
    payload.setdefault("standalone", True)
    payload["os_records_accessed"] = False
    payload["live_record_access"] = False
    payload.setdefault("internal_data_access", False)
    if "context_used" in payload and isinstance(payload["context_used"], dict):
        payload["context_used"] = merge_context_used(
            payload["context_used"],
            surface=surface,
            mode=mode,
            lens=lens,
            feature=feature,
            sources=sources,
            citations=citations,
            quality=quality,
            safety=safety,
            extra=extra,
        )
    return payload


def normalise_brain_metadata(raw: dict[str, Any] | None) -> dict[str, Any] | None:
    """Coalesce brain metadata from nested or flat response shapes."""
    if not raw:
        return None
    nested = raw.get("brain_metadata")
    if isinstance(nested, dict):
        merged = {**nested}
        for key in (
            "surface",
            "product",
            "powered_by",
            "brain",
            "os_records_accessed",
            "live_record_access",
            "standalone",
            "mode",
            "lens",
            "feature",
        ):
            if key in raw and key not in merged:
                merged[key] = raw[key]
        return merged
    ctx = raw.get("context_used")
    if isinstance(ctx, dict) and isinstance(ctx.get("brain_metadata"), dict):
        return normalise_brain_metadata(ctx)
    if raw.get("brain") == ORB_BRAIN_ID or raw.get("product") == ORB_BRAIN_PRODUCT:
        return {
            "surface": raw.get("surface"),
            "product": raw.get("product") or ORB_BRAIN_PRODUCT,
            "powered_by": raw.get("powered_by") or ORB_BRAIN_POWERED_BY,
            "brain": raw.get("brain") or ORB_BRAIN_ID,
            "os_records_accessed": raw.get("os_records_accessed", False) is not True,
            "live_record_access": False,
            "standalone": True,
            "mode": raw.get("mode"),
            "lens": raw.get("lens"),
        }
    return None


def assert_standalone_brain_contract(meta: dict[str, Any]) -> None:
    """Raise AssertionError when metadata violates standalone ORB boundaries."""
    assert meta.get("product") == ORB_BRAIN_PRODUCT
    assert meta.get("powered_by") == ORB_BRAIN_POWERED_BY
    assert meta.get("brain") == ORB_BRAIN_ID
    assert meta.get("os_records_accessed") is False
    assert meta.get("live_record_access") is False
    assert meta.get("standalone") is True
    surface = str(meta.get("surface") or "")
    assert surface in _STANDALONE_SURFACE_ALIASES or surface.startswith("orb_")


orb_brain_metadata_service = type(
    "OrbBrainMetadataService",
    (),
    {
        "PRODUCT": ORB_BRAIN_PRODUCT,
        "POWERED_BY": ORB_BRAIN_POWERED_BY,
        "BRAIN_ID": ORB_BRAIN_ID,
        "build": staticmethod(build_brain_metadata),
        "merge_context_used": staticmethod(merge_context_used),
        "attach_to_payload": staticmethod(attach_to_payload),
        "normalise": staticmethod(normalise_brain_metadata),
        "assert_contract": staticmethod(assert_standalone_brain_contract),
    },
)()
