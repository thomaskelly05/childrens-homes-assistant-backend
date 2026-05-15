from __future__ import annotations

import html
from datetime import datetime, timezone
from typing import Any

from services.docx_export_service import docx_export_service
from services.pdf_export_service import pdf_export_service
from services.document_template_service import document_template_service


class DocumentExportService:
    """Controlled exports with explicit limitations for unavailable formats."""

    def export(self, *, document: dict[str, Any], profile: str = "print_html") -> dict[str, Any]:
        template = document_template_service.get_template(str(document.get("template_id")))
        if profile == "pdf":
            return {**pdf_export_service.export(document=document, title=template.title), "status": "ready"}
        if profile == "docx":
            return {**docx_export_service.export(document=document, title=template.title), "status": "ready"}
        if profile != "print_html":
            return {"ok": False, "status": "unavailable", "profile": profile, "message": "This export profile is not available."}
        return {
            "ok": True,
            "status": "ready",
            "profile": "print_html",
            "filename": f"{str(document.get('title') or template.title).replace(' ', '_')}.html",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "confidentiality_label": "Confidential care record",
            "content": self._html(document=document, template_title=template.title),
        }

    def _html(self, *, document: dict[str, Any], template_title: str) -> str:
        sections = document.get("sections") or {}
        links = document.get("links") or []
        signatures = document.get("signatures") or []
        body = "".join(f"<section><h2>{html.escape(str(key).replace('_', ' ').title())}</h2><p>{html.escape(str(value))}</p></section>" for key, value in sections.items())
        appendix = "".join(f"<li>{html.escape(str(item.get('link_type')))}: {html.escape(str(item.get('title') or item.get('record_id')))}</li>" for item in links)
        sigs = "".join(f"<li>{html.escape(str(sig.get('signed_name')))} - {html.escape(str(sig.get('role')))} - {html.escape(str(sig.get('signed_at')))}</li>" for sig in signatures)
        return (
            "<!doctype html><html><head><meta charset='utf-8'><title>"
            + html.escape(str(document.get("title") or template_title))
            + "</title><style>body{font-family:Inter,Arial,sans-serif;max-width:860px;margin:40px auto;line-height:1.65;color:#0f172a}section{break-inside:avoid;margin:24px 0}.label{font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:#64748b}</style></head><body>"
            + "<p class='label'>Confidential care record - inspection ready print view</p>"
            + f"<h1>{html.escape(str(document.get('title') or template_title))}</h1>"
            + body
            + "<h2>Chronology, evidence and actions appendix</h2><ul>"
            + appendix
            + "</ul><h2>Review and signatures</h2><ul>"
            + sigs
            + "</ul></body></html>"
        )


document_export_service = DocumentExportService()
