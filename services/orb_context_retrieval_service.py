from __future__ import annotations

from typing import Any

from services.orb_cost_optimised_retrieval import orb_cost_optimised_retrieval_service
from services.orb_role_definition_service import orb_role_definition_service


class OrbContextRetrievalService:
    """Active-child retrieval wrapper for Orb OS context."""

    def retrieve(
        self,
        *,
        question: str,
        active_child_id: int | str | None,
        home_id: int | str | None,
        provider_id: int | str | None = None,
        records: list[dict[str, Any]] | None = None,
        current_user: dict[str, Any] | None = None,
        standalone_memory: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        context = {
            "provider_id": provider_id,
            "home_id": home_id,
            "young_person_id": active_child_id,
        }
        pack = orb_cost_optimised_retrieval_service.build_evidence_pack(
            question=question,
            records=records or [],
            context=context,
            current_user=current_user or {},
            settings={"external_ai_enabled": False},
        )
        cited_child_ids = self._citation_child_ids(pack.model_dump(mode="json"), records or [])
        boundary = orb_role_definition_service.enforce("", active_child_id=active_child_id, cited_child_ids=cited_child_ids)
        return {
            "evidence_pack": pack.model_dump(mode="json"),
            "active_child_id": active_child_id,
            "home_id": home_id,
            "standalone_memory_used": False,
            "standalone_memory_present": bool(standalone_memory),
            "cross_child_records_excluded": max(0, len(records or []) - pack.relevant_metadata.get("record_count", 0)),
            "active_child_only": boundary["active_child_only"],
            "retrieval_controls": [
                "metadata first",
                "regulatory graph first",
                "top citations only",
                "no full chronology",
                "no standalone assistant memory",
                "external AI disabled by default",
            ],
        }

    def _citation_child_ids(self, pack: dict[str, Any], records: list[dict[str, Any]]) -> list[int | str]:
        citation_ids = {str(item.get("record_id")) for item in pack.get("citations") or []}
        child_ids: list[int | str] = []
        for record in records:
            if str(record.get("id") or record.get("record_id")) in citation_ids:
                child_id = record.get("young_person_id") or record.get("child_id")
                if child_id is not None:
                    child_ids.append(child_id)
        return child_ids


orb_context_retrieval_service = OrbContextRetrievalService()
