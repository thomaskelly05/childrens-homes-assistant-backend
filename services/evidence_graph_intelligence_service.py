from __future__ import annotations

from typing import Any

from schemas.indicare_intelligence import EvidenceGraphLink, EvidenceGraphNode, EvidenceGraphResponse
from services.risk_intelligence_language import field, safe_text

NODE_TYPES = frozenset(
    {
        "daily_note",
        "incident",
        "safeguarding_concern",
        "missing_episode",
        "return_home_interview",
        "risk_assessment",
        "keywork",
        "child_voice",
        "manager_review",
        "reg40_notification",
        "reg44",
        "reg45",
        "action",
        "evidence_item",
        "staff_supervision",
        "training_record",
    }
)

TYPE_NORMALISE: dict[str, str] = {
    "daily_log": "daily_note",
    "safeguarding": "safeguarding_concern",
    "missing": "missing_episode",
    "rhi": "return_home_interview",
    "return_home_interview": "return_home_interview",
    "risk": "risk_assessment",
    "reg_40": "reg40_notification",
    "reg40": "reg40_notification",
    "reg_44": "reg44",
    "reg_45": "reg45",
    "evidence": "evidence_item",
    "supervision": "staff_supervision",
    "training": "training_record",
}

EXPECTED_LINKS: tuple[tuple[str, str, str], ...] = (
    ("missing_episode", "return_home_interview", "led_to"),
    ("missing_episode", "risk_assessment", "updates"),
    ("incident", "manager_review", "reviewed_by"),
    ("safeguarding_concern", "reg40_notification", "requires_follow_up"),
    ("reg44", "action", "action_created"),
    ("reg45", "evidence_item", "evidence_for"),
)


def _norm_type(record: dict[str, Any]) -> str:
    raw = str(field(record, "record_type", "type") or "record").lower().strip()
    return TYPE_NORMALISE.get(raw, raw if raw in NODE_TYPES else "evidence_item")


def _node_id(record: dict[str, Any], index: int) -> str:
    return str(field(record, "id", "record_id", "source_id") or f"node-{index}")


class EvidenceGraphIntelligenceService:
    """Build evidence relationship graph from passed-in records."""

    def build(
        self,
        records: list[dict[str, Any]] | None = None,
        *,
        child_id: int | str | None = None,
    ) -> EvidenceGraphResponse:
        items = list(records or [])
        if child_id is not None:
            items = [
                r
                for r in items
                if str(field(r, "child_id", "young_person_id") or "") in {"", str(child_id)}
                or field(r, "child_id", "young_person_id") in (None, "", child_id)
            ]

        nodes: list[EvidenceGraphNode] = []
        by_type: dict[str, list[str]] = {}
        id_to_type: dict[str, str] = {}

        for index, record in enumerate(items):
            node_type = _norm_type(record)
            node_id = _node_id(record, index)
            id_to_type[node_id] = node_type
            by_type.setdefault(node_type, []).append(node_id)
            nodes.append(
                EvidenceGraphNode(
                    id=node_id,
                    type=node_type,
                    title=safe_text(field(record, "title") or f"{node_type.replace('_', ' ').title()}"),
                    summary=safe_text(field(record, "summary", "description", "notes") or "")[:400],
                    date=str(field(record, "date", "created_at", "event_date") or "") or None,
                    child_id=field(record, "child_id", "young_person_id"),
                    staff_id=field(record, "staff_id"),
                    source_id=str(field(record, "source_id") or "") or None,
                    regulatory_links=[str(x) for x in (field(record, "regulatory_links") or []) if x][:6],
                    evidence_strength="emerging",
                )
            )

        links: list[EvidenceGraphLink] = []
        links.extend(self._linked_field_edges(items, id_to_type))
        links.extend(self._heuristic_edges(by_type))

        present_pairs = {(link.source, link.target, link.relationship) for link in links}
        missing_expected: list[str] = []
        for source_type, target_type, relationship in EXPECTED_LINKS:
            if by_type.get(source_type) and by_type.get(target_type):
                src_ids = by_type[source_type]
                tgt_ids = by_type[target_type]
                if not any((s, t, relationship) in present_pairs for s in src_ids for t in tgt_ids):
                    missing_expected.append(
                        f"Expected {source_type} -> {target_type} ({relationship}) link not visible in passed records."
                    )

        gaps = [
            "records indicate some expected safeguarding and governance links may be missing",
            *missing_expected[:6],
        ]
        prompts = [
            "Manager oversight suggested: trace missing episode to return interview and risk update.",
            "Review recommended: confirm incident manager review and action closure in source records.",
            "Consider checking Reg 44 and Reg 45 action and evidence links before inspection sampling.",
        ]

        return EvidenceGraphResponse(
            nodes=nodes,
            links=links,
            missing_expected_links=missing_expected[:12],
            evidence_gaps=gaps[:10],
            graph_summary=(
                f"records indicate {len(nodes)} evidence nodes and {len(links)} links for human review; "
                "do not treat as a complete chronology."
            ),
            manager_review_prompts=prompts,
        )

    def _linked_field_edges(
        self, records: list[dict[str, Any]], id_to_type: dict[str, str]
    ) -> list[EvidenceGraphLink]:
        links: list[EvidenceGraphLink] = []
        for index, record in enumerate(records):
            source = _node_id(record, index)
            for key in ("linked_record_ids", "linked_records", "related_ids", "evidence_ids"):
                targets = field(record, key) or []
                if not isinstance(targets, list):
                    continue
                for target in targets:
                    target_id = str(target)
                    if target_id in id_to_type:
                        links.append(
                            EvidenceGraphLink(
                                source=source,
                                target=target_id,
                                relationship="linked_to_regulation",
                                reason="Explicit linked record reference in payload.",
                            )
                        )
        return links

    def _heuristic_edges(self, by_type: dict[str, list[str]]) -> list[EvidenceGraphLink]:
        links: list[EvidenceGraphLink] = []

        def connect(
            sources: list[str],
            targets: list[str],
            relationship: str,
            reason: str,
            *,
            limit: int = 12,
        ) -> None:
            count = 0
            for source in sources:
                for target in targets:
                    if source == target:
                        continue
                    links.append(EvidenceGraphLink(source=source, target=target, relationship=relationship, reason=reason))
                    count += 1
                    if count >= limit:
                        return

        if by_type.get("missing_episode") and by_type.get("return_home_interview"):
            connect(
                by_type["missing_episode"][:3],
                by_type["return_home_interview"][:3],
                "led_to",
                "records indicate missing episode and return home interview both present; review recommended.",
            )
        if by_type.get("missing_episode") and by_type.get("risk_assessment"):
            connect(
                by_type["missing_episode"][:3],
                by_type["risk_assessment"][:3],
                "updates",
                "evidence suggests risk assessment may need review after missing episode.",
            )
        if by_type.get("incident") and by_type.get("manager_review"):
            connect(
                by_type["incident"][:4],
                by_type["manager_review"][:4],
                "reviewed_by",
                "manager oversight link suggested for incident review.",
            )
        if by_type.get("safeguarding_concern") and by_type.get("reg40_notification"):
            connect(
                by_type["safeguarding_concern"][:3],
                by_type["reg40_notification"][:3],
                "requires_follow_up",
                "safeguarding concern may require Reg 40 notification review.",
            )
        if by_type.get("reg44") and by_type.get("action"):
            connect(
                by_type["reg44"][:3],
                by_type["action"][:5],
                "action_created",
                "Reg 44 findings may generate oversight actions.",
            )
        if by_type.get("reg45") and by_type.get("evidence_item"):
            connect(
                by_type["reg45"][:3],
                by_type["evidence_item"][:5],
                "evidence_for",
                "Reg 45 review may rely on linked evidence items.",
            )
        if by_type.get("daily_note") and by_type.get("child_voice"):
            connect(
                by_type["daily_note"][:4],
                by_type["child_voice"][:4],
                "child_voice_evidence",
                "child voice may strengthen daily note lived experience evidence.",
            )
        if by_type.get("incident") and by_type.get("action"):
            connect(
                by_type["incident"][:4],
                by_type["action"][:5],
                "action_created",
                "incident may require follow-up actions.",
            )
        return links


evidence_graph_intelligence_service = EvidenceGraphIntelligenceService()
