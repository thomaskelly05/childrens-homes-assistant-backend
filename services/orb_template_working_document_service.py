"""ORB template working document service — builds editable documents from canonical templates."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from schemas.orb_home_documents import (
    HOME_DOCUMENT_TYPE_LABELS,
    LOCAL_POLICY_CONFLICT_ADVISORY,
)
from schemas.orb_records_workspace import OrbRecordWorkspaceCreate
from schemas.orb_template_working_document import (
    OrbTemplateSourceChip,
    OrbTemplateWorkingDocument,
    OrbTemplateWorkingDocumentChart,
    OrbTemplateWorkingDocumentField,
    OrbTemplateWorkingDocumentSection,
    OrbTemplateWorkingDocumentTable,
    WORKING_DOCUMENT_REVIEW_REMINDER,
)
from services.orb_home_documents_service import orb_home_documents_service
from services.orb_records_workspace_service import orb_records_workspace_service
from services.orb_regulation_practice_anchor_service import (
    PRACTICE_ANCHOR_DISCLAIMER,
    orb_regulation_practice_anchor_service,
)
from services.orb_template_component_assignments import (
    TEMPLATE_HOME_DOCUMENT_TYPES,
    get_component_assignment,
    infer_document_type,
)
from services.orb_template_library_registry import ORB_TEMPLATE_REGISTRY, orb_template_library_registry
from services.orb_template_taxonomy_data import ORB_TEMPLATE_TAXONOMY
from services.orb_therapeutic_template_factory_service import (
    REVIEW_BEFORE_USE,
    orb_therapeutic_template_factory_service,
)

# Safeguarding-sensitive home document types that require conflict advisory
SAFEGUARDING_HOME_DOC_TYPES = frozenset({
    "safeguarding_policy",
    "missing_from_care_policy",
    "physical_intervention_policy",
    "medication_policy",
    "behaviour_support_policy",
})

SECTION_TYPE_BY_HEADING: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"checklist|before saving", re.I), "checklist"),
    (re.compile(r"sign[- ]?off|signature", re.I), "signatures"),
    (re.compile(r"reflection|debrief", re.I), "reflection"),
    (re.compile(r"evidence|tracker|audit", re.I), "evidence"),
    (re.compile(r"action|plan|recommendation", re.I), "action_plan"),
    (re.compile(r"chronology|timeline", re.I), "table"),
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _infer_section_type(heading: str, override: str | None = None) -> str:
    if override:
        return override
    for pattern, section_type in SECTION_TYPE_BY_HEADING:
        if pattern.search(heading):
            return section_type
    return "narrative"


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")[:60] or "section"


def _practice_chips(anchors: list[str]) -> list[OrbTemplateSourceChip]:
    chips: list[OrbTemplateSourceChip] = []
    for anchor in anchors:
        meta = orb_regulation_practice_anchor_service.get_anchor(anchor)
        label = meta.get("label", anchor) if meta else anchor
        chips.append(
            OrbTemplateSourceChip(
                chip_id=f"anchor_{anchor}",
                label=label,
                chip_type="regulation_anchor",
                reference_id=anchor,
                metadata_only=True,
            )
        )
    return chips


def _render_body(document: OrbTemplateWorkingDocument) -> str:
    parts: list[str] = [f"# {document.title}", ""]
    for section in sorted(document.sections, key=lambda s: s.sort_order):
        parts.append(f"## {section.heading}")
        if section.guidance:
            parts.append(f"*{section.guidance}*")
        if section.prompt and not section.body:
            parts.append(f"_{section.prompt}_")
        if section.body:
            parts.append(section.body)
        parts.append("")
    for table in document.tables:
        parts.append(f"### {table.title}")
        if table.guidance:
            parts.append(f"*{table.guidance}*")
        if table.columns:
            parts.append("| " + " | ".join(table.columns) + " |")
            parts.append("| " + " | ".join(["---"] * len(table.columns)) + " |")
            for row in table.rows:
                parts.append("| " + " | ".join(str(row.get(c, "")) for c in table.columns) + " |")
        elif not table.rows:
            parts.append(f"_{table.empty_state_guidance or 'Add rows as evidence is gathered.'}_")
        parts.append("")
    for chart in document.charts:
        parts.append(f"### {chart.title}")
        if chart.has_data:
            parts.append(f"[Chart: {chart.chart_type}]")
        else:
            parts.append(f"_{chart.empty_state_guidance}_")
        parts.append("")
    return "\n".join(parts).strip()


def _map_transcript_to_sections(
    sections: list[OrbTemplateWorkingDocumentSection],
    transcript: str,
) -> list[OrbTemplateWorkingDocumentSection]:
    """Best-effort paragraph mapping — does not invent content."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", transcript.strip()) if p.strip()]
    if not paragraphs:
        return sections
    updated = [s.model_copy() for s in sections]
    for idx, section in enumerate(updated):
        if section.body:
            continue
        if idx < len(paragraphs):
            section.body = paragraphs[idx]
        elif len(paragraphs) == 1 and idx == 0:
            section.body = paragraphs[0]
    return updated


class OrbTemplateWorkingDocumentService:
    """Builds working documents from the canonical template registry and taxonomy."""

    def build_working_document(
        self,
        template_id: str,
        context: dict[str, Any] | None = None,
    ) -> OrbTemplateWorkingDocument:
        context = context or {}
        template = orb_template_library_registry.get_template(template_id)
        if not template:
            raise ValueError(f"Unknown template: {template_id}")

        enriched = orb_therapeutic_template_factory_service.get_template(template_id) or template
        taxonomy = ORB_TEMPLATE_TAXONOMY.get(template_id, {})
        assignment = get_component_assignment(template_id)

        category = template.get("category", "")
        document_type = infer_document_type(category, template_id)
        overrides = assignment.get("section_overrides", {})

        sections: list[OrbTemplateWorkingDocumentSection] = []
        for idx, section in enumerate(template.get("sections") or []):
            heading = section.get("heading") or f"Section {idx + 1}"
            override = overrides.get(heading, {})
            sections.append(
                OrbTemplateWorkingDocumentSection(
                    section_id=_slug(heading),
                    heading=heading,
                    guidance=section.get("prompt"),
                    prompt=section.get("placeholder"),
                    body=context.get("prefill_sections", {}).get(heading, ""),
                    required=override.get("required", True),
                    section_type=_infer_section_type(heading, override.get("section_type")),
                    orb_assist_enabled=override.get("orb_assist_enabled", True),
                    home_document_context_enabled=bool(
                        assignment.get("home_document_context_allowed")
                    ),
                    sort_order=idx,
                )
            )

        for extra in assignment.get("extra_sections", []):
            sections.append(
                OrbTemplateWorkingDocumentSection(
                    section_id=extra["section_id"],
                    heading=extra["heading"],
                    guidance=extra.get("guidance"),
                    prompt=extra.get("prompt"),
                    required=extra.get("required", True),
                    section_type=extra.get("section_type", "narrative"),
                    orb_assist_enabled=extra.get("orb_assist_enabled", True),
                    home_document_context_enabled=bool(
                        assignment.get("home_document_context_allowed")
                    ),
                    sort_order=len(sections),
                )
            )

        tables = [
            OrbTemplateWorkingDocumentTable(**t) for t in assignment.get("tables", [])
        ]
        charts = [
            OrbTemplateWorkingDocumentChart(**c) for c in assignment.get("charts", [])
        ]
        action_plans = [t for t in tables if t.table_type == "action_plan_table"]

        regulation_anchors = list(taxonomy.get("regulation_anchors", []))
        source_chips = _practice_chips(regulation_anchors)
        source_chips.append(
            OrbTemplateSourceChip(
                chip_id=f"template_{template_id}",
                label=template.get("title", template_id),
                chip_type="template_source",
                reference_id=template_id,
                metadata_only=True,
            )
        )

        home_allowed = bool(assignment.get("home_document_context_allowed"))
        allowed_home_types = list(
            assignment.get("allowed_home_document_types")
            or TEMPLATE_HOME_DOCUMENT_TYPES.get(template_id, [])
        )

        child_voice = enriched.get("child_voice_prompts") or []
        if isinstance(child_voice, str):
            child_voice = [child_voice]
        elif template.get("child_voice_prompt"):
            child_voice = [template["child_voice_prompt"], *child_voice]

        doc = OrbTemplateWorkingDocument(
            template_id=template_id,
            title=context.get("title") or template.get("title", template_id),
            description=template.get("purpose"),
            document_type=document_type,
            lifecycle_group=taxonomy.get("lifecycle_group"),
            category=category,
            station_availability=list(taxonomy.get("station_availability", [])),
            safeguarding_level=taxonomy.get("safeguarding_level", "standard"),
            regulation_anchors=regulation_anchors,
            home_document_context_allowed=home_allowed,
            allowed_home_document_types=allowed_home_types,
            sections=sections,
            tables=tables,
            charts=charts,
            action_plans=action_plans,
            review_prompts=[
                enriched.get("adult_guidance_before_completing", REVIEW_BEFORE_USE),
                PRACTICE_ANCHOR_DISCLAIMER,
            ],
            child_voice_prompts=child_voice,
            therapeutic_guidance=enriched.get("therapeutic_wording_examples") or [],
            what_to_avoid=enriched.get("what_to_avoid") or [],
            source_chips=source_chips,
            save_destination=taxonomy.get("save_destination", "records_drafts"),
            source_station=context.get("source_station", "write"),
            owner_user_id=context.get("owner_user_id"),
            home_id=context.get("home_id"),
            child_id=context.get("child_id"),
            linked_home_document_ids=list(context.get("linked_home_document_ids", [])),
        )

        if context.get("context_text"):
            doc.sections = _map_transcript_to_sections(doc.sections, context["context_text"])

        if doc.linked_home_document_ids:
            doc = self.attach_home_document_context(
                template_id,
                doc.linked_home_document_ids,
                document=doc,
                user_context=context.get("user_context"),
            )

        doc.rendered_body = _render_body(doc)
        doc.audit_trail.append(
            {"event": "built", "template_id": template_id, "at": _now_iso()}
        )
        return doc

    def suggest_document_components(self, template_id: str) -> dict[str, Any]:
        if template_id not in ORB_TEMPLATE_REGISTRY:
            raise ValueError(f"Unknown template: {template_id}")
        assignment = get_component_assignment(template_id)
        return {
            "template_id": template_id,
            "tables": assignment.get("tables", []),
            "charts": assignment.get("charts", []),
            "extra_sections": assignment.get("extra_sections", []),
            "home_document_context_allowed": assignment.get("home_document_context_allowed", False),
            "allowed_home_document_types": assignment.get(
                "allowed_home_document_types",
                TEMPLATE_HOME_DOCUMENT_TYPES.get(template_id, []),
            ),
        }

    def convert_answer_to_working_document(
        self,
        answer: str,
        template_id: str,
        *,
        source_station: str = "chat",
    ) -> OrbTemplateWorkingDocument:
        return self.build_working_document(
            template_id,
            {"context_text": answer, "source_station": source_station},
        )

    def convert_dictation_to_working_document(
        self,
        transcript: str,
        template_id: str,
        *,
        source_station: str = "dictate",
    ) -> OrbTemplateWorkingDocument:
        return self.build_working_document(
            template_id,
            {"context_text": transcript, "source_station": source_station},
        )

    def update_section_with_orb_help(
        self,
        document_id: str,
        section_id: str,
        instruction: str,
        *,
        current_body: str | None = None,
        document: OrbTemplateWorkingDocument | None = None,
    ) -> dict[str, Any]:
        """Section-level ORB assist — appends guided prompt, does not auto-finalise."""
        body = (current_body or "").strip()
        suggestion = (
            f"{body}\n\n[ORB assist — review and edit before saving]\n"
            f"Guidance for this section: {instruction.strip()}\n"
            f"Remember: distinguish observation from interpretation. "
            f"Use the child's words where you have them."
        ).strip()
        return {
            "document_id": document_id,
            "section_id": section_id,
            "suggested_body": suggestion,
            "requires_adult_review": True,
            "review_reminder": WORKING_DOCUMENT_REVIEW_REMINDER,
            "auto_finalised": False,
        }

    def generate_chart_from_table(
        self,
        document_id: str,
        table_id: str,
        chart_type: str,
        *,
        document: OrbTemplateWorkingDocument | None = None,
    ) -> dict[str, Any]:
        table_rows: list[dict[str, Any]] = []
        table_columns: list[str] = []
        if document:
            for table in document.tables:
                if table.table_id == table_id:
                    table_rows = table.rows
                    table_columns = table.columns
                    break

        has_data = len(table_rows) > 0
        chart_data: dict[str, Any] = {"labels": [], "values": [], "series": []}

        if has_data and table_columns:
            label_col = table_columns[0]
            value_col = table_columns[-1] if len(table_columns) > 1 else table_columns[0]
            chart_data["labels"] = [str(row.get(label_col, "")) for row in table_rows]
            chart_data["values"] = [
                row.get(value_col, 0) for row in table_rows
            ]
            chart_data["series"] = [{"name": value_col, "data": chart_data["values"]}]

        return {
            "document_id": document_id,
            "table_id": table_id,
            "chart_type": chart_type,
            "has_data": has_data,
            "chart_config": chart_data,
            "regenerate_from_table": True,
            "do_not_invent_data": True,
            "empty_state_guidance": (
                "No data yet — add rows to the linked table to generate this chart."
                if not has_data
                else None
            ),
        }

    def save_working_document_to_records_workspace(
        self,
        document: OrbTemplateWorkingDocument,
        *,
        user_id: int,
        workspace_section: str = "my_drafts",
    ) -> dict[str, Any]:
        rendered = document.rendered_body or _render_body(document)
        create = OrbRecordWorkspaceCreate(
            title=document.title,
            body=rendered,
            category=document.category,
            template_id=document.template_id,
            source_station=document.source_station,
            workspace_section=workspace_section,  # type: ignore[arg-type]
            status=document.status,
            child_id=document.child_id,
            home_id=document.home_id,
            metadata={
                "working_document_id": document.document_id,
                "document_type": document.document_type,
                "sections": [s.model_dump() for s in document.sections],
                "tables": [t.model_dump() for t in document.tables],
                "charts": [c.model_dump() for c in document.charts],
                "source_chips": [c.model_dump() for c in document.source_chips],
                "home_document_chips": [c.model_dump() for c in document.home_document_chips],
                "linked_home_document_ids": document.linked_home_document_ids,
                "review_before_use_reminder": document.review_before_use_reminder,
                "compliance_disclaimer": document.compliance_disclaimer,
                "export_options": document.export_options,
                "rendered_body": rendered,
            },
        )
        item = orb_records_workspace_service.create_item(user_id, create)
        return {
            "workspace_item_id": item.id,
            "status": item.status,
            "review_before_use_reminder": WORKING_DOCUMENT_REVIEW_REMINDER,
            "auto_finalised": False,
        }

    def attach_home_document_context(
        self,
        template_id: str,
        home_document_ids: list[str],
        *,
        document: OrbTemplateWorkingDocument | None = None,
        user_context: dict[str, Any] | None = None,
    ) -> OrbTemplateWorkingDocument:
        if document is None:
            document = self.build_working_document(template_id)

        user_context = user_context or {}
        user_id = int(user_context.get("user_id", 0) or 0)
        current_user = user_context.get("current_user", {"id": user_id, "role": "manager"})

        chips: list[OrbTemplateSourceChip] = []
        linked: list[str] = []
        advisories: list[str] = []

        for doc_id in home_document_ids:
            record = None
            if user_id > 0:
                try:
                    record = orb_home_documents_service.get_document(
                        user_id, current_user, doc_id
                    )
                except Exception:
                    record = None
            if not record:
                continue
            linked.append(doc_id)
            label = HOME_DOCUMENT_TYPE_LABELS.get(
                record.document_type, record.title
            )
            chips.append(
                OrbTemplateSourceChip(
                    chip_id=f"home_doc_{doc_id}",
                    label=f"Home document: {label}",
                    chip_type="home_document",
                    reference_id=doc_id,
                    metadata_only=True,
                )
            )
            if record.document_type in SAFEGUARDING_HOME_DOC_TYPES:
                advisories.append(LOCAL_POLICY_CONFLICT_ADVISORY)

        document.linked_home_document_ids = linked
        document.home_document_chips = chips
        if not linked and home_document_ids:
            document.metadata["home_document_notice"] = (
                "No relevant home document is currently linked."
            )
        elif not linked and document.home_document_context_allowed:
            document.metadata["home_document_notice"] = (
                "No relevant home document is currently linked."
            )
        if advisories:
            document.metadata["manager_review_advisory"] = " ".join(dict.fromkeys(advisories))
        document.updated_at = _now_iso()
        document.rendered_body = _render_body(document)
        return document

    def list_relevant_home_documents_for_template(
        self,
        template_id: str,
        user_context: dict[str, Any],
    ) -> dict[str, Any]:
        assignment = get_component_assignment(template_id)
        allowed_types = list(
            assignment.get("allowed_home_document_types")
            or TEMPLATE_HOME_DOCUMENT_TYPES.get(template_id, [])
        )
        home_allowed = bool(
            assignment.get("home_document_context_allowed") or allowed_types
        )

        if not home_allowed:
            return {
                "template_id": template_id,
                "home_document_context_allowed": False,
                "documents": [],
                "notice": "Home document context is not enabled for this template.",
            }

        user_id = int(user_context.get("user_id", 0) or 0)
        current_user = user_context.get("current_user", {"id": user_id, "role": "manager"})

        from schemas.orb_home_documents import OrbHomeDocumentListRequest

        documents: list[dict[str, Any]] = []
        if user_id > 0:
            try:
                rows = orb_home_documents_service.list_documents(
                    user_id,
                    current_user,
                    OrbHomeDocumentListRequest(limit=100),
                )
                for row in rows:
                    if allowed_types and row.document_type not in allowed_types:
                        continue
                    if not row.ready_for_orb_use:
                        continue
                    documents.append({
                        "document_id": row.document_id,
                        "title": row.title,
                        "document_type": row.document_type,
                        "citation_label": f"Home document: {HOME_DOCUMENT_TYPE_LABELS.get(row.document_type, row.title)}",
                        "metadata_only": True,
                    })
            except Exception:
                documents = []

        notice = (
            "No relevant home document is currently linked."
            if not documents
            else None
        )
        return {
            "template_id": template_id,
            "home_document_context_allowed": True,
            "allowed_home_document_types": allowed_types,
            "documents": documents,
            "notice": notice,
            "never_invent_content": True,
            "raw_text_requires_adult_open": True,
        }

    def build_all_canonical_working_documents(self) -> dict[str, str]:
        """Smoke helper — returns template_id → document_id for every canonical template."""
        results: dict[str, str] = {}
        for template_id in ORB_TEMPLATE_REGISTRY:
            doc = self.build_working_document(template_id)
            results[template_id] = doc.document_id
        return results


orb_template_working_document_service = OrbTemplateWorkingDocumentService()
