from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any

STORE_DIR = Path(__file__).resolve().parents[1] / "runtime_data"
STORE_PATH = STORE_DIR / "standalone_intelligence_store.json"
_LOCK = RLock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _empty_store() -> dict[str, Any]:
    return {"projects": {}}


def _load() -> dict[str, Any]:
    with _LOCK:
        if not STORE_PATH.exists():
            return _empty_store()
        try:
            data = json.loads(STORE_PATH.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                return _empty_store()
            data.setdefault("projects", {})
            return data
        except Exception:
            return _empty_store()


def _save(data: dict[str, Any]) -> None:
    with _LOCK:
        STORE_DIR.mkdir(parents=True, exist_ok=True)
        STORE_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _project_summary(project: dict[str, Any]) -> str:
    uploads = project.get("uploads") or []
    pins = project.get("pinnedOutputs") or []
    chats = project.get("messages") or []
    topics: list[str] = project.get("recentTopics") or []
    parts = [project.get("description") or "Standalone children’s residential care AI project."]
    if uploads:
        parts.append(f"Files uploaded: {len(uploads)}.")
    if pins:
        parts.append(f"Pinned outputs: {len(pins)}.")
    if chats:
        parts.append(f"Conversation messages: {len(chats)}.")
    if topics:
        parts.append("Recent themes: " + ", ".join(topics[:6]) + ".")
    return " ".join(parts)


def _default_actions(mode: str | None) -> list[str]:
    mode = (mode or "ofsted").lower()
    if mode == "safeguarding":
        return ["Create chronology", "Review safeguarding threshold", "Extract missing information", "Generate manager review"]
    if mode == "records":
        return ["Improve wording", "Check child voice", "Review chronology", "Create manager summary"]
    if mode == "practice":
        return ["Generate reflective prompts", "Review relational practice", "Summarise emotional themes", "Create learning actions"]
    return ["Prepare evidence summary", "Generate inspection questions", "Identify evidence gaps", "Create leadership actions"]


def _normalise_project(project: dict[str, Any]) -> dict[str, Any]:
    project.setdefault("id", _id("project"))
    project.setdefault("name", "New Project")
    project.setdefault("description", "Standalone IndiCare Intelligence project.")
    project.setdefault("mode", "ofsted")
    project.setdefault("messages", [])
    project.setdefault("uploads", [])
    project.setdefault("pinnedOutputs", [])
    project.setdefault("evidenceSummaries", [])
    project.setdefault("recentTopics", [])
    project.setdefault("suggestedActions", _default_actions(project.get("mode")))
    project.setdefault("createdAt", _now())
    project["updatedAt"] = project.get("updatedAt") or project["createdAt"]
    project["memorySummary"] = project.get("memorySummary") or _project_summary(project)
    return project


def list_projects(user_id: int) -> list[dict[str, Any]]:
    data = _load()
    projects = [p for p in data["projects"].values() if p.get("userId") == user_id]
    return sorted((_normalise_project(p) for p in projects), key=lambda p: p.get("updatedAt", ""), reverse=True)


def create_project(user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    data = _load()
    project = _normalise_project({
        "id": _id("project"),
        "userId": user_id,
        "name": payload.get("name") or "New Project",
        "description": payload.get("description") or "Standalone IndiCare Intelligence project.",
        "mode": payload.get("mode") or "ofsted",
        "createdAt": _now(),
        "updatedAt": _now(),
    })
    data["projects"][project["id"]] = project
    _save(data)
    return project


def get_project(user_id: int, project_id: str) -> dict[str, Any] | None:
    data = _load()
    project = data["projects"].get(project_id)
    if not project or project.get("userId") != user_id:
        return None
    return _normalise_project(project)


def update_project(user_id: int, project_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
    data = _load()
    project = data["projects"].get(project_id)
    if not project or project.get("userId") != user_id:
        return None
    for key in ("name", "description", "mode", "memorySummary", "suggestedActions"):
        if key in patch and patch[key] is not None:
            project[key] = patch[key]
    project["updatedAt"] = _now()
    project["memorySummary"] = project.get("memorySummary") or _project_summary(project)
    data["projects"][project_id] = _normalise_project(project)
    _save(data)
    return data["projects"][project_id]


def add_message(user_id: int, project_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    data = _load()
    project = data["projects"].get(project_id)
    if not project or project.get("userId") != user_id:
        return None
    message = {
        "id": _id("msg"),
        "role": payload.get("role") or "user",
        "content": str(payload.get("content") or "")[:120000],
        "conversationId": payload.get("conversationId"),
        "createdAt": _now(),
    }
    project.setdefault("messages", []).append(message)
    _update_topics(project, message["content"])
    project["updatedAt"] = _now()
    project["memorySummary"] = _project_summary(project)
    data["projects"][project_id] = _normalise_project(project)
    _save(data)
    return message


def list_messages(user_id: int, project_id: str) -> list[dict[str, Any]] | None:
    project = get_project(user_id, project_id)
    if not project:
        return None
    return project.get("messages") or []


def add_upload(user_id: int, project_id: str, filename: str, text: str) -> dict[str, Any] | None:
    data = _load()
    project = data["projects"].get(project_id)
    if not project or project.get("userId") != user_id:
        return None
    summary = evidence_summary(text, filename)
    upload = {
        "id": _id("upload"),
        "name": filename,
        "text": text[:200000],
        "summary": summary,
        "tags": _tags_for_text(text),
        "uploadedAt": _now(),
    }
    project.setdefault("uploads", []).append(upload)
    project.setdefault("evidenceSummaries", []).append({
        "id": _id("evidence"),
        "uploadId": upload["id"],
        "title": f"Evidence summary: {filename}",
        "summary": summary,
        "createdAt": _now(),
    })
    _update_topics(project, text)
    project["updatedAt"] = _now()
    project["memorySummary"] = _project_summary(project)
    data["projects"][project_id] = _normalise_project(project)
    _save(data)
    return upload


def add_pin(user_id: int, project_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    data = _load()
    project = data["projects"].get(project_id)
    if not project or project.get("userId") != user_id:
        return None
    pin = {
        "id": _id("pin"),
        "title": payload.get("title") or "Pinned output",
        "content": str(payload.get("content") or "")[:120000],
        "type": payload.get("type") or "output",
        "createdAt": _now(),
    }
    project.setdefault("pinnedOutputs", []).append(pin)
    _update_topics(project, pin["content"])
    project["updatedAt"] = _now()
    project["memorySummary"] = _project_summary(project)
    data["projects"][project_id] = _normalise_project(project)
    _save(data)
    return pin


def search_project(user_id: int, project_id: str, query: str) -> list[dict[str, Any]] | None:
    project = get_project(user_id, project_id)
    if not project:
        return None
    q = (query or "").lower().strip()
    if not q:
        return []
    results: list[dict[str, Any]] = []
    sources = []
    sources.extend({"sourceType": "message", **m} for m in project.get("messages", []))
    sources.extend({"sourceType": "upload", **u} for u in project.get("uploads", []))
    sources.extend({"sourceType": "pin", **p} for p in project.get("pinnedOutputs", []))
    for item in sources:
        haystack = " ".join(str(item.get(k) or "") for k in ("content", "text", "summary", "title", "name")).lower()
        if q in haystack or any(token in haystack for token in q.split() if len(token) > 3):
            results.append({
                "id": item.get("id"),
                "sourceType": item.get("sourceType"),
                "title": item.get("title") or item.get("name") or item.get("role") or "Result",
                "excerpt": _excerpt(haystack, q),
                "createdAt": item.get("createdAt") or item.get("uploadedAt"),
            })
    return results[:20]


def evidence_summary(text: str, filename: str = "document") -> dict[str, Any]:
    clean = str(text or "")
    lower = clean.lower()
    return {
        "mainThemes": _themes(lower),
        "risksIdentified": _find_terms(lower, ["missing", "risk", "harm", "incident", "police", "exploitation", "injury", "self-harm"]),
        "leadershipImplications": _find_terms(lower, ["manager", "oversight", "review", "audit", "supervision", "training"]),
        "inspectionRelevance": _find_terms(lower, ["ofsted", "quality standard", "regulation", "sccif", "evidence", "impact"]),
        "missingEvidence": _find_terms(lower, ["unknown", "not recorded", "missing information", "not provided", "unclear"]),
        "suggestedActions": ["Review evidence gaps", "Consider manager oversight", "Check chronology completeness"],
        "plainSummary": _plain_summary(clean, filename),
    }


def export_project(user_id: int, project_id: str) -> str | None:
    project = get_project(user_id, project_id)
    if not project:
        return None
    html = [
        "<!doctype html><html><head><meta charset='utf-8'><title>IndiCare Intelligence Export</title>",
        "<style>body{font-family:Arial,sans-serif;line-height:1.55;color:#142033;padding:32px}h1{color:#0969ff}.card{border:1px solid #dbe4f0;border-radius:16px;padding:16px;margin:14px 0}</style>",
        "</head><body>",
        f"<h1>{_html(project.get('name'))}</h1>",
        f"<p>{_html(project.get('memorySummary'))}</p>",
        "<h2>Uploads</h2>",
    ]
    for upload in project.get("uploads", []):
        html.append(f"<div class='card'><strong>{_html(upload.get('name'))}</strong><p>{_html((upload.get('summary') or {}).get('plainSummary'))}</p></div>")
    html.append("<h2>Pinned Outputs</h2>")
    for pin in project.get("pinnedOutputs", []):
        html.append(f"<div class='card'><strong>{_html(pin.get('title'))}</strong><pre>{_html(pin.get('content'))}</pre></div>")
    html.append("</body></html>")
    return "".join(html)


def _themes(lower: str) -> list[str]:
    themes = []
    mapping = {
        "Safeguarding": ["safeguarding", "risk", "harm", "exploitation"],
        "Missing from care": ["missing", "absent", "police"],
        "Recording quality": ["record", "chronology", "daily log"],
        "Leadership": ["manager", "oversight", "review", "audit"],
        "Ofsted": ["ofsted", "quality standard", "inspection"],
        "Reflective practice": ["reflection", "trauma", "relational", "co-regulation"],
    }
    for label, terms in mapping.items():
        if any(term in lower for term in terms):
            themes.append(label)
    return themes or ["Residential care practice"]


def _find_terms(lower: str, terms: list[str]) -> list[str]:
    return [term for term in terms if term in lower][:8]


def _plain_summary(text: str, filename: str) -> str:
    clean = re.sub(r"\s+", " ", text or "").strip()
    if not clean:
        return f"{filename} was uploaded but no readable text was extracted."
    return clean[:420] + ("..." if len(clean) > 420 else "")


def _tags_for_text(text: str) -> str:
    return " • ".join(_themes((text or "").lower())[:3])


def _update_topics(project: dict[str, Any], text: str) -> None:
    topics = project.setdefault("recentTopics", [])
    for theme in _themes((text or "").lower()):
        if theme not in topics:
            topics.insert(0, theme)
    del topics[8:]


def _excerpt(haystack: str, query: str) -> str:
    index = haystack.find(query)
    if index < 0:
        index = 0
    start = max(0, index - 80)
    end = min(len(haystack), index + 220)
    return haystack[start:end]


def _html(value: Any) -> str:
    return str(value or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
