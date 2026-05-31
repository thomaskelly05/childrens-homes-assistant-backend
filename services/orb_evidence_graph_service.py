from __future__ import annotations

"""Evidence graph for ORB Residential standalone knowledge.

This service builds a read-only graph over the existing ORB Knowledge Library.
It connects public sources, themes, pipelines and ORB lenses so standalone ORB
can reason from recurring sector patterns instead of isolated document chunks.
No IndiCare OS records are accessed.
"""

import re
from collections import Counter, defaultdict
from typing import Any

from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_sector_evidence_pipeline_service import orb_sector_evidence_pipeline_service

THEME_TERMS: dict[str, tuple[str, ...]] = {
    "professional_curiosity": ("professional curiosity", "what is missing", "accepted explanation", "over-reliance"),
    "child_voice": ("child voice", "child's voice", "wishes and feelings", "lived experience", "participation"),
    "management_oversight": ("management oversight", "manager oversight", "leadership", "quality assurance", "drift", "impact"),
    "recording_quality": ("recording", "records", "chronology", "evidence", "not recorded", "daily record"),
    "safeguarding_escalation": ("safeguarding", "escalation", "threshold", "referral", "child protection", "lado"),
    "information_sharing": ("information sharing", "multi-agency", "partnership", "communication"),
    "missing_and_exploitation": ("missing", "exploitation", "contextual safeguarding", "return interview", "peer risk"),
    "education_and_attendance": ("education", "school", "attendance", "pep", "send", "exclusion"),
    "health_and_wellbeing": ("health", "medication", "wellbeing", "mental health", "lac health"),
    "rights_and_advocacy": ("rights", "advocacy", "complaint", "independent visitor", "participation"),
    "workforce_and_supervision": ("staff", "supervision", "training", "induction", "safer recruitment"),
    "restrictive_practice": ("restraint", "restrictive", "physical intervention", "de-escalation", "repair"),
    "equality_identity": ("equality", "identity", "autism", "neurodiversity", "disability", "culture"),
    "inspection_evidence": ("ofsted", "sccif", "inspection", "judgement", "requires improvement", "outstanding"),
}

THEME_TO_LENSES: dict[str, tuple[str, ...]] = {
    "professional_curiosity": ("What am I missing", "Safeguarding Thinking", "Manager Copilot"),
    "child_voice": ("Child Voice Prompt", "Care Planning", "Recording Support"),
    "management_oversight": ("Manager Copilot", "RI Lens", "Ofsted Lens"),
    "recording_quality": ("Record This Properly", "Incident Review", "Chronology Suggestion"),
    "safeguarding_escalation": ("Safeguarding Thinking", "Risk Assessment Support"),
    "information_sharing": ("Safeguarding Thinking", "Manager Copilot"),
    "missing_and_exploitation": ("Safeguarding Thinking", "Risk Assessment Support", "Incident Review"),
    "education_and_attendance": ("Care Planning", "Daily Recording", "Ofsted Lens"),
    "health_and_wellbeing": ("Daily Recording", "Risk Assessment Support", "Staff Coach"),
    "rights_and_advocacy": ("Child Voice Prompt", "Policy Explainer", "Manager Copilot"),
    "workforce_and_supervision": ("Staff Coach", "Supervision Prompts", "Ofsted Lens"),
    "restrictive_practice": ("Behaviour Support", "Incident Review", "Manager Oversight"),
    "equality_identity": ("Care Planning", "Therapeutic Reframe", "Recording Support"),
    "inspection_evidence": ("Ofsted Lens", "Manager Copilot", "Recording Support"),
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def _source_public_evidence_kind(source: dict[str, Any]) -> str | None:
    metadata = source.get("metadata") or {}
    return metadata.get("public_evidence_kind") or source.get("document_family") or source.get("source_type")


def _theme_hits(text: str) -> list[str]:
    lower = text.lower()
    hits: list[str] = []
    for theme, terms in THEME_TERMS.items():
        if any(term.lower() in lower for term in terms):
            hits.append(theme)
    return hits


class OrbEvidenceGraphService:
    def build_graph(self, *, limit_sources: int = 500) -> dict[str, Any]:
        sources = orb_knowledge_library_service.list_sources()[:limit_sources]
        chunks = orb_knowledge_library_service.list_chunks()
        source_by_id = {source["id"]: source for source in sources if source.get("id")}
        chunks_by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for chunk in chunks:
            if chunk.get("source_id") in source_by_id:
                chunks_by_source[chunk["source_id"]].append(chunk)

        nodes: dict[str, dict[str, Any]] = {}
        edges: list[dict[str, Any]] = []
        theme_counts: Counter[str] = Counter()
        pipeline_counts: Counter[str] = Counter()

        pipelines = orb_sector_evidence_pipeline_service.list_pipelines().get("pipelines") or []
        for pipeline in pipelines:
            pid = f"pipeline:{pipeline['id']}"
            nodes[pid] = {
                "id": pid,
                "type": "pipeline",
                "label": pipeline.get("label") or pipeline["id"],
                "pipeline_id": pipeline["id"],
                "strengthens_lenses": pipeline.get("strengthens_lenses") or [],
                "priority": pipeline.get("priority"),
            }
            for lens in pipeline.get("strengthens_lenses") or []:
                lens_id = f"lens:{_norm(lens)}"
                nodes.setdefault(lens_id, {"id": lens_id, "type": "lens", "label": lens})
                edges.append({"from": pid, "to": lens_id, "type": "strengthens"})

        for source in sources:
            sid = source.get("id")
            if not sid:
                continue
            source_node_id = f"source:{sid}"
            kind = _source_public_evidence_kind(source) or "unknown"
            metadata = source.get("metadata") or {}
            pipeline_id = metadata.get("pipeline_id") or metadata.get("public_evidence_kind")
            nodes[source_node_id] = {
                "id": source_node_id,
                "type": "source",
                "label": source.get("title") or sid,
                "source_id": sid,
                "source_type": source.get("source_type"),
                "document_family": source.get("document_family"),
                "public_evidence_kind": kind,
                "official_source": bool(source.get("official_source")),
                "governance_status": source.get("governance_status"),
                "source_url": source.get("source_url"),
                "confidence_level": source.get("confidence_level"),
            }
            if pipeline_id:
                pipeline_node_id = f"pipeline:{pipeline_id}"
                nodes.setdefault(pipeline_node_id, {"id": pipeline_node_id, "type": "pipeline", "label": pipeline_id})
                edges.append({"from": source_node_id, "to": pipeline_node_id, "type": "belongs_to_pipeline"})
                pipeline_counts[pipeline_id] += 1

            source_text = " ".join(
                [
                    _text(source.get("title")),
                    _text(source.get("description")),
                    " ".join(_text(chunk.get("text"))[:1000] for chunk in chunks_by_source.get(sid, [])[:10]),
                ]
            )
            metadata_themes = []
            for key in ("safeguarding_learning_themes", "inspection_learning_themes"):
                value = metadata.get(key) or []
                if isinstance(value, list):
                    metadata_themes.extend(_norm(str(item)) for item in value if item)
            themes = list(dict.fromkeys(metadata_themes + _theme_hits(source_text)))
            for theme in themes:
                theme_id = f"theme:{theme}"
                nodes.setdefault(theme_id, {"id": theme_id, "type": "theme", "label": theme.replace("_", " ").title()})
                edges.append({"from": source_node_id, "to": theme_id, "type": "evidences_theme"})
                theme_counts[theme] += 1
                for lens in THEME_TO_LENSES.get(theme, ()): 
                    lens_id = f"lens:{_norm(lens)}"
                    nodes.setdefault(lens_id, {"id": lens_id, "type": "lens", "label": lens})
                    edges.append({"from": theme_id, "to": lens_id, "type": "supports_lens"})

        return {
            "nodes": list(nodes.values()),
            "edges": self._dedupe_edges(edges),
            "summary": {
                "source_count": sum(1 for n in nodes.values() if n.get("type") == "source"),
                "theme_count": sum(1 for n in nodes.values() if n.get("type") == "theme"),
                "pipeline_count": sum(1 for n in nodes.values() if n.get("type") == "pipeline"),
                "lens_count": sum(1 for n in nodes.values() if n.get("type") == "lens"),
                "top_themes": theme_counts.most_common(12),
                "pipeline_counts": pipeline_counts.most_common(12),
                "standalone": True,
                "os_records_accessed": False,
            },
        }

    def theme_profile(self, theme: str, *, limit: int = 12) -> dict[str, Any]:
        key = _norm(theme)
        graph = self.build_graph()
        source_ids = []
        supporting_lenses = set(THEME_TO_LENSES.get(key, ()))
        for edge in graph.get("edges") or []:
            if edge.get("type") == "evidences_theme" and edge.get("to") == f"theme:{key}":
                source_id = str(edge.get("from") or "").replace("source:", "", 1)
                if source_id:
                    source_ids.append(source_id)
        sources = []
        for source_id in source_ids[: max(1, min(limit, 50))]:
            source = orb_knowledge_library_service.get_source(source_id)
            if source:
                sources.append(source)
        return {
            "theme": key,
            "label": key.replace("_", " ").title(),
            "supporting_lenses": sorted(supporting_lenses),
            "source_count": len(source_ids),
            "sources": sources,
            "standalone": True,
            "os_records_accessed": False,
        }

    def query_graph(self, query: str, *, limit: int = 10) -> dict[str, Any]:
        terms = [term for term in re.findall(r"[a-z0-9]+", query.lower()) if len(term) > 2]
        graph = self.build_graph()
        scored = []
        for node in graph.get("nodes") or []:
            haystack = " ".join(str(value) for value in node.values()).lower()
            score = sum(1 for term in terms if term in haystack)
            if score:
                scored.append((score, node))
        scored.sort(key=lambda item: (-item[0], item[1].get("label", "")))
        nodes = [node for _, node in scored[: max(1, min(limit, 50))]]
        node_ids = {node["id"] for node in nodes}
        edges = [edge for edge in graph.get("edges") or [] if edge.get("from") in node_ids or edge.get("to") in node_ids]
        return {
            "query": query,
            "nodes": nodes,
            "edges": edges,
            "total": len(nodes),
            "standalone": True,
            "os_records_accessed": False,
        }

    def prompt_addendum(self, query: str, *, limit: int = 5) -> str:
        result = self.query_graph(query, limit=limit)
        nodes = result.get("nodes") or []
        if not nodes:
            return ""
        lines = [
            "ORB Evidence Graph context:",
            "Use these as sector-pattern links and learning prompts, not as proof that the user's scenario matches a named source.",
        ]
        for node in nodes[:limit]:
            label = node.get("label") or node.get("id")
            node_type = node.get("type")
            lines.append(f"- {node_type}: {label}")
        return "\n".join(lines)

    def _dedupe_edges(self, edges: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[tuple[str, str, str]] = set()
        deduped: list[dict[str, Any]] = []
        for edge in edges:
            key = (str(edge.get("from")), str(edge.get("to")), str(edge.get("type")))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(edge)
        return deduped


orb_evidence_graph_service = OrbEvidenceGraphService()
