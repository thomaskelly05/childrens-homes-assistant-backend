from __future__ import annotations

"""Automated public knowledge feeding for ORB Residential.

Runs the standalone ORB knowledge pipeline without manual uploads:
1. Seed canonical registries.
2. Refresh curated canonical sources.
3. Discover new public evidence candidates.
4. Import a capped number of new sources.
5. Rebuild/read the evidence graph summary.

This is intentionally conservative and controlled by environment flags. It does
not access IndiCare OS records.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

from services.orb_evidence_graph_service import orb_evidence_graph_service
from services.orb_public_source_discovery_service import orb_public_source_discovery_service
from services.orb_source_refresh_service import orb_source_refresh_service

logger = logging.getLogger("indicare.orb_knowledge_automation")


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int, *, minimum: int = 1, maximum: int = 500) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except Exception:
        value = default
    return max(minimum, min(value, maximum))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class OrbKnowledgeAutomationService:
    def config(self) -> dict[str, Any]:
        return {
            "enabled": _env_bool("ORB_KNOWLEDGE_AUTOMATION_ENABLED", False),
            "interval_seconds": _env_int("ORB_KNOWLEDGE_AUTOMATION_INTERVAL_SECONDS", 86400, minimum=300, maximum=604800),
            "refresh_limit": _env_int("ORB_KNOWLEDGE_REFRESH_LIMIT", 8, minimum=1, maximum=100),
            "discovery_limit": _env_int("ORB_KNOWLEDGE_DISCOVERY_LIMIT", 10, minimum=1, maximum=100),
            "approve_imports": _env_bool("ORB_KNOWLEDGE_AUTO_APPROVE_IMPORTS", True),
            "force_refresh": _env_bool("ORB_KNOWLEDGE_FORCE_REFRESH", False),
            "include_indexed": _env_bool("ORB_KNOWLEDGE_INCLUDE_INDEXED", False),
            "standalone": True,
            "os_records_accessed": False,
        }

    def status(self) -> dict[str, Any]:
        graph = orb_evidence_graph_service.build_graph(limit_sources=500)
        return {
            "status": "ready",
            "config": self.config(),
            "source_refresh": orb_source_refresh_service.status(),
            "discovery": orb_public_source_discovery_service.status(),
            "evidence_graph_summary": graph.get("summary"),
            "standalone": True,
            "os_records_accessed": False,
        }

    async def run_once(self, *, reason: str = "manual") -> dict[str, Any]:
        cfg = self.config()
        started_at = _now_iso()
        logger.info("Starting ORB knowledge automation run reason=%s", reason)
        refresh_result = await orb_source_refresh_service.refresh_all(
            limit=cfg["refresh_limit"],
            force=cfg["force_refresh"],
            include_indexed=cfg["include_indexed"],
        )
        discovery_result = await orb_public_source_discovery_service.discover_and_import(
            limit=cfg["discovery_limit"],
            approve_now=cfg["approve_imports"],
        )
        graph = orb_evidence_graph_service.build_graph(limit_sources=750)
        completed_at = _now_iso()
        return {
            "success": True,
            "reason": reason,
            "started_at": started_at,
            "completed_at": completed_at,
            "config": cfg,
            "refresh": refresh_result,
            "discovery_import": discovery_result,
            "evidence_graph_summary": graph.get("summary"),
            "standalone": True,
            "os_records_accessed": False,
        }

    async def loop(self) -> None:
        cfg = self.config()
        if not cfg["enabled"]:
            logger.info("ORB knowledge automation disabled")
            return
        interval = cfg["interval_seconds"]
        logger.info("ORB knowledge automation enabled interval_seconds=%s", interval)
        while True:
            try:
                await self.run_once(reason="scheduled")
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("ORB knowledge automation scheduled run failed")
            await asyncio.sleep(interval)


orb_knowledge_automation_service = OrbKnowledgeAutomationService()


async def orb_knowledge_automation_loop() -> None:
    await orb_knowledge_automation_service.loop()
