from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from services.child_documents_service import ChildDocumentsService
from services.workspace_records_service import WorkspaceRecordsService


class OperationalMemoryService:
    """One child-centred memory layer built from existing records and DOC OS."""

    def __init__(self) -> None:
        self.records = WorkspaceRecordsService()
        self.documents = ChildDocumentsService()

    def child_memory(self, *, young_person_id: int, current_user: dict[str, Any], days: int = 5) -> dict[str, Any]:
        days = max(1, min(days, 31))
        records = self._recent(self._records_for_child(young_person_id, current_user), days)
        docs = self.documents.list_documents(
            current_user=current_user,
            young_person_id=young_person_id,
            include_archived=True,
            limit=250,
        ).get("documents", [])

        emotional = self._emotional_state(records)
        risk = self._risk_state(records)
        voice = self._child_voice(records)
        strengths = self._strengths(records)
        document_pressure = self._document_pressure(docs, records)
        governance = self._governance(records, docs)
        next_actions = self._next_actions(risk, voice, document_pressure, governance)

        return {
            "ok": True,
            "young_person_id": young_person_id,
            "days": days,
            "summary": self._summary(records, emotional, risk, strengths, voice, document_pressure),
            "metrics": {
                "records": len(records),
                "incidents": len([r for r in records if r.get("record_type") == "incident"]),
                "safeguarding": len([r for r in records if r.get("record_type") == "safeguarding"]),
                "missing": len([r for r in records if r.get("record_type") == "missing"]),
                "documents": len(docs),
                "awaiting_review": governance["awaiting_review"],
            },
            "emotional_state": emotional,
            "risk_state": risk,
            "child_voice": voice,
            "strengths": strengths,
            "document_pressure": document_pressure,
            "governance": governance,
            "next_actions": next_actions,
            "recent_records": records[:12],
            "documents": docs[:25],
            "memory_stream": self._memory_stream(records, docs),
        }

    def _records_for_child(self, young_person_id: int, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        output: list[dict[str, Any]] = []
        for record_type in ["daily", "incident", "safeguarding", "missing"]:
            result = self.records.list_records(
                record_type=record_type,
                current_user=current_user,
                young_person_id=young_person_id,
                include_archived=True,
                limit=100,
            )
            output.extend(result.get("records") or [])
        output.sort(key=lambda row: str(row.get("updated_at") or row.get("created_at") or ""), reverse=True)
        return output

    def _recent(self, records: list[dict[str, Any]], days: int) -> list[dict[str, Any]]:
        threshold = datetime.now(timezone.utc) - timedelta(days=days)
        recent = []
        for record in records:
            stamp = self._parse_date(record.get("updated_at") or record.get("created_at"))
            if stamp is None or stamp >= threshold:
                recent.append(record)
        return recent or records[:12]

    def _parse_date(self, value: Any) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    def _text(self, record: dict[str, Any]) -> str:
        content = record.get("content") if isinstance(record.get("content"), dict) else {}
        parts = [record.get("title"), record.get("summary"), record.get("status")]
        parts.extend(str(value) for value in content.values())
        return " ".join(str(part or "") for part in parts).lower()

    def _emotional_state(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        vocabulary = {
            "anxious": ["anxious", "worried", "panic", "nervous"],
            "dysregulated": ["dysregulated", "escalated", "agitated", "angry", "distressed", "meltdown"],
            "withdrawn": ["withdrawn", "isolated", "quiet", "shut down", "refused"],
            "settled": ["settled", "calm", "regulated", "relaxed"],
            "positive": ["happy", "proud", "enjoyed", "laughed", "achievement", "positive"],
        }
        scores: Counter[str] = Counter()
        for record in records:
            text = self._text(record)
            for state, words in vocabulary.items():
                scores[state] += sum(1 for word in words if word in text)
        dominant = scores.most_common(1)[0][0] if scores and scores.most_common(1)[0][1] > 0 else "not enough evidence"
        return {"dominant": dominant, "scores": dict(scores), "interpretation": self._emotional_interpretation(dominant)}

    def _emotional_interpretation(self, dominant: str) -> str:
        return {
            "anxious": "Recent records suggest anxiety or worry may be present. Adults should record triggers, reassurance offered and what helped.",
            "dysregulated": "Recent records suggest dysregulation or distress. Review triggers, adult response, debrief and behaviour support planning.",
            "withdrawn": "Recent records suggest withdrawal or refusal. Check child voice, emotional safety, relationships and routines.",
            "settled": "Recent records suggest some settled presentation. Capture what is working so it can be repeated.",
            "positive": "Positive memories or progress are visible. Keep evidencing strengths, joy and achievement alongside risk.",
        }.get(dominant, "There is not enough emotional evidence yet. Strengthen records with presentation, child voice and adult response.")

    def _risk_state(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        counts = Counter(record.get("record_type") for record in records)
        signals: list[dict[str, str]] = []
        if counts.get("safeguarding", 0):
            signals.append({"level": "high", "title": "Safeguarding activity", "text": f"{counts['safeguarding']} safeguarding record(s) are visible."})
        if counts.get("missing", 0):
            signals.append({"level": "high", "title": "Missing from care", "text": f"{counts['missing']} missing episode(s) are visible. Review missing plan and return-home work."})
        if counts.get("incident", 0) >= 2:
            signals.append({"level": "medium", "title": "Repeated incidents", "text": f"{counts['incident']} incident record(s) are visible. Review triggers and behaviour support."})
        text = " ".join(self._text(record) for record in records)
        for word, label in [("exploitation", "Exploitation language"), ("self-harm", "Self-harm language"), ("police", "Police involvement"), ("contact", "Family/contact impact")]:
            if word in text:
                level = "high" if word in {"exploitation", "self-harm"} else "medium"
                signals.append({"level": level, "title": label, "text": f"Recent evidence mentions {word}. Consider whether plans need review."})
        level = "high" if any(item["level"] == "high" for item in signals) else "medium" if signals else "low"
        return {"level": level, "signals": signals or [{"level": "low", "title": "No major risk signal found", "text": "Continue recording risk, protective factors and outcomes."}]}

    def _child_voice(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        voice_words = ["child_voice", "voice", "said", "asked", "wanted", "wished", "felt", "showed"]
        voice_records = [record for record in records if any(word in self._text(record) for word in voice_words)]
        gap = len(voice_records) < max(1, len(records) // 3)
        return {"count": len(voice_records), "gap": gap, "message": "Child voice needs strengthening." if gap else "Child voice is visible in recent records."}

    def _strengths(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        words = ["positive", "achievement", "proud", "enjoyed", "happy", "progress", "settled"]
        items = [record for record in records if any(word in self._text(record) for word in words)]
        message = "Positive memories/progress are visible." if items else "Add strengths, achievements and positive memories so the story is not risk-led."
        return {"count": len(items), "items": items[:5], "message": message}

    def _document_pressure(self, documents: list[dict[str, Any]], records: list[dict[str, Any]]) -> dict[str, Any]:
        existing = {document.get("document_type") for document in documents}
        required = ["Placement Plan", "Risk Assessment", "Behaviour Support Plan", "Missing From Care Plan", "Health Care Plan", "Personal Education Plan"]
        missing = [name for name in required if name not in existing]
        text = " ".join(self._text(record) for record in records)
        pressures: list[str] = []
        if "missing" in text and "Missing From Care Plan" in existing:
            pressures.append("Review Missing From Care Plan against recent missing evidence.")
        if any(word in text for word in ["incident", "dysregulated", "trigger", "escalated"]) and "Behaviour Support Plan" in existing:
            pressures.append("Review Behaviour Support Plan against recent incident or emotional regulation evidence.")
        if any(word in text for word in ["safeguarding", "risk", "harm", "exploitation"]) and "Risk Assessment" in existing:
            pressures.append("Review Risk Assessment against recent safeguarding/risk evidence.")
        awaiting = [doc for doc in documents if doc.get("status") in {"submitted_for_review", "ai_improved", "changes_requested"}]
        return {"missing_core": missing, "pressures": pressures, "awaiting_review": awaiting[:10]}

    def _governance(self, records: list[dict[str, Any]], documents: list[dict[str, Any]]) -> dict[str, Any]:
        review_states = {"submitted_for_review", "ai_improved", "changes_requested"}
        awaiting_records = [record for record in records if record.get("status") in review_states]
        awaiting_docs = [document for document in documents if document.get("status") in review_states]
        return {
            "awaiting_review": len(awaiting_records) + len(awaiting_docs),
            "records_awaiting_review": len(awaiting_records),
            "documents_awaiting_review": len(awaiting_docs),
            "approved_documents": len([doc for doc in documents if doc.get("status") == "approved"]),
        }

    def _next_actions(self, risk: dict[str, Any], voice: dict[str, Any], document_pressure: dict[str, Any], governance: dict[str, Any]) -> list[str]:
        actions: list[str] = []
        if risk["level"] == "high":
            actions.append("Review safeguarding/risk records and make sure plans, notifications and manager oversight are updated.")
        if voice.get("gap"):
            actions.append("Strengthen child voice in the next record or direct work session.")
        missing = document_pressure.get("missing_core") or []
        if missing:
            actions.append("Create missing core documents: " + ", ".join(missing[:3]) + ".")
        actions.extend((document_pressure.get("pressures") or [])[:2])
        if governance.get("awaiting_review"):
            actions.append(f"Complete manager review for {governance['awaiting_review']} item(s).")
        return actions[:6] or ["Continue recording lived experience, adult response, outcome and positive progress."]

    def _summary(self, records: list[dict[str, Any]], emotional: dict[str, Any], risk: dict[str, Any], strengths: dict[str, Any], voice: dict[str, Any], document_pressure: dict[str, Any]) -> dict[str, Any]:
        headline = f"{len(records)} recent record(s) found. Emotional presentation appears: {emotional['dominant']}. Risk state: {risk['level']}."
        narrative = f"{emotional['interpretation']} {strengths['message']} {voice['message']}"
        if document_pressure.get("pressures"):
            narrative += " Document review may be needed: " + " ".join(document_pressure["pressures"][:2])
        return {"headline": headline, "narrative": narrative}

    def _memory_stream(self, records: list[dict[str, Any]], documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for record in records[:25]:
            items.append({"kind": "record", "type": record.get("record_type"), "title": record.get("title"), "summary": record.get("summary"), "status": record.get("status"), "date": record.get("updated_at") or record.get("created_at")})
        for doc in documents[:25]:
            items.append({"kind": "document", "type": doc.get("document_type"), "title": doc.get("editable_title") or doc.get("title"), "summary": doc.get("document_group"), "status": doc.get("status"), "date": doc.get("updated_at") or doc.get("created_at")})
        items.sort(key=lambda row: str(row.get("date") or ""), reverse=True)
        return items[:30]
