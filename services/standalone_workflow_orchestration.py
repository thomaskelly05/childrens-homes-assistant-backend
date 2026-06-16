from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from services.standalone_timeline_intelligence import extract_events


@dataclass(frozen=True)
class WorkflowDefinition:
    id: str
    title: str
    source: str
    target: str
    prompt: str
    required_feature: str | None = None


WORKFLOWS: dict[str, WorkflowDefinition] = {
    "chat_to_doc": WorkflowDefinition(
        id="chat_to_doc",
        title="Create DOC from conversation",
        source="intelligence",
        target="docs",
        prompt="Turn this conversation or response into a professional IndiCare DOCS document for children's residential care.",
        required_feature="docs",
    ),
    "doc_to_chronology": WorkflowDefinition(
        id="doc_to_chronology",
        title="Extract chronology from DOC",
        source="docs",
        target="timeline",
        prompt="Extract a clear chronology using Date/Time → Event → Staff action → Outcome.",
        required_feature="basic_chronology",
    ),
    "note_to_incident": WorkflowDefinition(
        id="note_to_incident",
        title="Convert transcript to incident record",
        source="notes",
        target="docs",
        prompt="Turn this transcript into a professional incident record with chronology, child voice, staff actions, outcomes, safeguarding considerations and management oversight.",
        required_feature="notes",
    ),
    "note_to_chronology": WorkflowDefinition(
        id="note_to_chronology",
        title="Extract chronology from transcript",
        source="notes",
        target="timeline",
        prompt="Extract chronology entries from this transcript using Date/Time → Event → Action → Outcome.",
        required_feature="basic_chronology",
    ),
    "doc_to_safeguarding": WorkflowDefinition(
        id="doc_to_safeguarding",
        title="Review DOC for safeguarding",
        source="docs",
        target="intelligence",
        prompt="Review this document for safeguarding concerns, missing information, risk analysis, professional curiosity and management oversight. Do not make final safeguarding decisions.",
        required_feature="basic_safeguarding_prompts",
    ),
    "workspace_to_inspection_summary": WorkflowDefinition(
        id="workspace_to_inspection_summary",
        title="Generate inspection summary",
        source="workspace",
        target="inspection",
        prompt="Create an inspection evidence preparation summary from the current workspace context, chronology, safeguarding themes and documents.",
        required_feature="inspection_summaries",
    ),
}


def list_workflows(features: dict[str, bool] | None = None) -> list[dict[str, Any]]:
    features = features or {}
    return [_workflow_payload(item, features) for item in WORKFLOWS.values()]


def build_workflow_payload(workflow_id: str, content: str, memory_context: dict[str, Any] | None = None) -> dict[str, Any]:
    workflow = WORKFLOWS.get(workflow_id)
    if workflow is None:
        raise ValueError(f"Unknown workflow: {workflow_id}")

    memory_context = memory_context or {}
    content = (content or "").strip()
    events = extract_events(content)
    themes = memory_context.get("themes") or []
    alerts = memory_context.get("alerts") or []

    composed_prompt = "\n".join(
        part for part in [
            workflow.prompt,
            _memory_block(themes, alerts),
            _timeline_block(events),
            "Source content:",
            content,
        ] if part
    )

    return {
        "ok": True,
        "workflow": _workflow_payload(workflow, {}),
        "prompt": composed_prompt,
        "timeline_events": events[:12],
        "suggested_target": workflow.target,
    }


def _workflow_payload(workflow: WorkflowDefinition, features: dict[str, bool]) -> dict[str, Any]:
    required = workflow.required_feature
    enabled = True if not required else bool(features.get(required, False))
    return {
        "id": workflow.id,
        "title": workflow.title,
        "source": workflow.source,
        "target": workflow.target,
        "required_feature": required,
        "enabled": enabled,
    }


def _memory_block(themes: list[Any], alerts: list[Any]) -> str:
    lines = []
    if themes:
        lines.append("Current project themes: " + ", ".join(str(item) for item in themes[:8]))
    if alerts:
        lines.append("Current operational alerts: " + " | ".join(str(item) for item in alerts[:5]))
    return "\n".join(lines)


def _timeline_block(events: list[dict[str, Any]]) -> str:
    if not events:
        return ""
    lines = ["Detected timeline context:"]
    lines.extend(f"- {event.get('summary')}" for event in events[:8])
    return "\n".join(lines)
