"""Document OS inspection readiness — re-export for legacy /inspection routes."""

from services.document_os_core import InspectionReadinessService, inspection_readiness_service

__all__ = ["InspectionReadinessService", "inspection_readiness_service"]
