from __future__ import annotations

import base64
import io
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


class PdfExportService:
    """Professional PDF exports for document-engine records."""

    def export(self, *, document: dict[str, Any], title: str | None = None, watermark: str | None = None) -> dict[str, Any]:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=44, leftMargin=44, topMargin=54, bottomMargin=48)
        styles = getSampleStyleSheet()
        story: list[Any] = [
            Paragraph("Confidential care record", styles["Title"]),
            Paragraph(title or str(document.get("title") or "Care document"), styles["Heading1"]),
            Paragraph(f"Generated {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}", styles["Normal"]),
            Spacer(1, 16),
        ]
        if watermark:
            story.append(Paragraph(watermark, styles["Italic"]))
            story.append(Spacer(1, 10))

        for key, value in (document.get("sections") or {}).items():
            story.append(Paragraph(str(key).replace("_", " ").title(), styles["Heading2"]))
            story.append(Paragraph(str(value or "No content recorded."), styles["BodyText"]))
            story.append(Spacer(1, 10))

        self._append_appendix(story, styles, "Chronology and evidence appendix", document.get("links") or [])
        self._append_appendix(story, styles, "Review history", (document.get("review") or {}).get("events") or [])
        self._append_appendix(story, styles, "Signatures", document.get("signatures") or [])

        doc.build(story, onFirstPage=self._footer, onLaterPages=self._footer)
        payload = buffer.getvalue()
        return {
            "ok": True,
            "profile": "pdf",
            "media_type": "application/pdf",
            "filename": self._filename(document, "pdf"),
            "byte_length": len(payload),
            "content_base64": base64.b64encode(payload).decode("ascii"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "confidentiality_label": "Confidential care record",
        }

    def _append_appendix(self, story: list[Any], styles: Any, heading: str, rows: list[dict[str, Any]]) -> None:
        story.append(PageBreak())
        story.append(Paragraph(heading, styles["Heading2"]))
        if not rows:
            story.append(Paragraph("No linked entries recorded.", styles["BodyText"]))
            return
        table_rows = [["Type", "Title", "Date / role"]]
        for row in rows[:50]:
            table_rows.append([
                str(row.get("link_type") or row.get("type") or "entry"),
                str(row.get("title") or row.get("summary") or row.get("record_id") or row.get("signed_name") or "Source record"),
                str(row.get("date") or row.get("signed_at") or row.get("role") or ""),
            ])
        table = Table(table_rows, colWidths=[120, 260, 120])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(table)

    def _footer(self, canvas: Any, doc: Any) -> None:
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawString(44, 28, "Confidential - authorised children's home record")
        canvas.drawRightString(A4[0] - 44, 28, f"Page {doc.page}")
        canvas.restoreState()

    def _filename(self, document: dict[str, Any], extension: str) -> str:
        title = str(document.get("title") or "care_document").strip().replace(" ", "_")
        return f"{title}.{extension}"


pdf_export_service = PdfExportService()
