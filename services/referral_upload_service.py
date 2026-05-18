from __future__ import annotations

from typing import Any

TEXTUAL_CONTENT_TYPES = {
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/json",
    "application/xml",
    "text/xml",
    "text/html",
}

TEXTUAL_EXTENSIONS = {".txt", ".csv", ".md", ".json", ".xml", ".html", ".htm"}


class ReferralUploadService:
    @staticmethod
    def can_extract_text(*, filename: str | None, content_type: str | None) -> bool:
        name = (filename or "").lower()
        if content_type in TEXTUAL_CONTENT_TYPES:
            return True
        return any(name.endswith(ext) for ext in TEXTUAL_EXTENSIONS)

    @staticmethod
    def extract_text_from_bytes(*, content: bytes, filename: str | None, content_type: str | None) -> dict[str, Any]:
        if not ReferralUploadService.can_extract_text(filename=filename, content_type=content_type):
            return {
                "extraction_status": "metadata_only",
                "extracted_text": "",
                "message": "File stored as referral metadata. Text extraction for this file type should be handled by the full document OCR/parser pipeline.",
            }

        for encoding in ("utf-8", "utf-16", "latin-1"):
            try:
                text = content.decode(encoding).strip()
                return {
                    "extraction_status": "extracted" if text else "empty",
                    "extracted_text": text,
                    "encoding": encoding,
                    "message": "Text extracted from uploaded referral document.",
                }
            except Exception:
                continue

        return {
            "extraction_status": "failed",
            "extracted_text": "",
            "message": "Could not decode referral document text safely.",
        }
