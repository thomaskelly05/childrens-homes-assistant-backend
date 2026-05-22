from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from repositories.isn_repository import isn_repository


RELATIONSHIP_FIELDS = {
    "alias": "alias_or_nickname",
    "vehicle": "vehicle_description",
    "postcode": "postcode_prefix",
    "transport_route": "transport_route",
    "digital_handle": "digital_handle",
    "location": "location_text",
}


class ISNRelationshipService:
    """Builds contextual safeguarding relationship graphs from ISN signals."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def graph(self, conn: Any, *, current_user: dict[str, Any], limit: int = 500) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        nodes: dict[str, dict[str, Any]] = {}
        edges: list[dict[str, Any]] = []
        index: dict[str, list[str]] = defaultdict(list)

        for signal in signals:
            signal_node_id = f"signal:{signal.id}"
            nodes[signal_node_id] = {
                "id": signal_node_id,
                "type": "signal",
                "label": signal.title,
                "risk_level": signal.risk_level,
                "signal_type": signal.signal_type,
            }
            for relationship_type, field in RELATIONSHIP_FIELDS.items():
                value = getattr(signal, field, None)
                if not value:
                    continue
                key = str(value).strip().lower()
                relationship_node_id = f"{relationship_type}:{key}"
                nodes.setdefault(
                    relationship_node_id,
                    {
                        "id": relationship_node_id,
                        "type": relationship_type,
                        "label": str(value),
                        "risk_level": signal.risk_level,
                    },
                )
                index[relationship_node_id].append(signal.id)
                edges.append(
                    {
                        "from": signal_node_id,
                        "to": relationship_node_id,
                        "relationship_type": relationship_type,
                    }
                )

        clusters = [
            {
                "node_id": node_id,
                "signal_count": len(signal_ids),
                "linked_signal_ids": signal_ids,
                "risk_level": "high" if len(signal_ids) >= 3 else "medium",
            }
            for node_id, signal_ids in index.items()
            if len(signal_ids) >= 2
        ]
        clusters.sort(key=lambda item: item["signal_count"], reverse=True)

        return {
            "ok": True,
            "nodes": list(nodes.values()),
            "edges": edges,
            "clusters": clusters,
            "totals": {
                "signals": len(signals),
                "nodes": len(nodes),
                "edges": len(edges),
                "clusters": len(clusters),
            },
        }

    def heatmap(self, conn: Any, *, current_user: dict[str, Any], limit: int = 500) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        grouped: dict[str, dict[str, Any]] = {}
        type_counts: dict[str, Counter[str]] = defaultdict(Counter)

        for signal in signals:
            key = (signal.postcode_prefix or signal.location_text or "unknown").strip()
            if not key:
                key = "unknown"
            norm = key.upper()
            grouped.setdefault(
                norm,
                {
                    "key": norm,
                    "label": key,
                    "signal_count": 0,
                    "risk_level": "medium",
                    "linked_signal_ids": [],
                    "signal_types": [],
                },
            )
            grouped[norm]["signal_count"] += 1
            grouped[norm]["linked_signal_ids"].append(signal.id)
            type_counts[norm][signal.signal_type] += 1
            if signal.risk_level in {"high", "critical"}:
                grouped[norm]["risk_level"] = signal.risk_level

        heatmap = []
        for key, item in grouped.items():
            item["signal_types"] = [signal_type for signal_type, _count in type_counts[key].most_common()]
            if item["signal_count"] >= 5 and item["risk_level"] != "critical":
                item["risk_level"] = "high"
            heatmap.append(item)

        heatmap.sort(key=lambda item: item["signal_count"], reverse=True)
        return {"ok": True, "heatmap": heatmap}

    def routes(self, conn: Any, *, current_user: dict[str, Any], limit: int = 500) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        route_counter: Counter[str] = Counter()
        route_signals: dict[str, list[str]] = defaultdict(list)

        for signal in signals:
            if not signal.transport_route:
                continue
            key = signal.transport_route.strip().lower()
            route_counter[key] += 1
            route_signals[key].append(signal.id)

        routes = [
            {
                "route": route,
                "signal_count": count,
                "risk_level": "high" if count >= 3 else "medium",
                "linked_signal_ids": route_signals[route],
            }
            for route, count in route_counter.most_common()
        ]
        return {"ok": True, "routes": routes}


isn_relationship_service = ISNRelationshipService()
