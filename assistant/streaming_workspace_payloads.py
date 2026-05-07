from __future__ import annotations

"""Streaming workspace payloads for IndiCare OS assistant.

This module prepares frontend-friendly streaming payloads so the assistant can
progressively render evidence, chronology, alerts and operational cards.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.runtime_ui_payloads import build_runtime_workspace_payload, serialise_runtime_workspace_payload


@dataclass(frozen=True)
class StreamingChunk:
    chunk_type: str
    sequence: int
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class StreamingWorkspacePayload:
    stream_id: str
    workspace_type: str
    chunks: list[StreamingChunk] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def build_streaming_workspace_payload(
    *,
    query: str,
    evidence_index: list[dict[str, Any]] | None,
    role: str = "manager",
) -> StreamingWorkspacePayload:
    workspace = serialise_runtime_workspace_payload(
        build_runtime_workspace_payload(
            query=query,
            evidence_index=evidence_index,
            role=role,
        )
    )

    chunks: list[StreamingChunk] = []
    sequence = 1

    runtime = workspace.get("runtime") if isinstance(workspace.get("runtime"), dict) else {}
    retrieval = runtime.get("retrieved_evidence") if isinstance(runtime.get("retrieved_evidence"), dict) else {}

    chunks.append(
        StreamingChunk(
            chunk_type="retrieval",
            sequence=sequence,
            payload=retrieval,
        )
    )
    sequence += 1

    for card in workspace.get("cards", []) if isinstance(workspace.get("cards"), list) else []:
        chunks.append(
            StreamingChunk(
                chunk_type="card",
                sequence=sequence,
                payload=card,
            )
        )
        sequence += 1

    chunks.append(
        StreamingChunk(
            chunk_type="citations",
            sequence=sequence,
            payload={
                "citation_drawer": workspace.get("citation_drawer", []),
            },
        )
    )

    return StreamingWorkspacePayload(
        stream_id=f"stream:{workspace.get('workspace_type', 'general')}",
        workspace_type=workspace.get("workspace_type", "general"),
        chunks=chunks,
        warnings=workspace.get("warnings", []) if isinstance(workspace.get("warnings"), list) else [],
    )


def serialise_streaming_workspace_payload(payload: StreamingWorkspacePayload) -> dict[str, Any]:
    return {
        "stream_id": payload.stream_id,
        "workspace_type": payload.workspace_type,
        "warnings": payload.warnings,
        "chunks": [
            {
                "chunk_type": chunk.chunk_type,
                "sequence": chunk.sequence,
                "payload": chunk.payload,
            }
            for chunk in payload.chunks
        ],
    }
