from __future__ import annotations

from io import BytesIO
from typing import Any
from zipfile import ZipFile
import re
import xml.etree.ElementTree as ET

TEXTUAL_CONTENT_TYPES = {
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/json",
    "application/xml",
    "text/xml",
    "text/html",
}

PDF_CONTENT_TYPES = {"application/pdf"}
WORD_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}

TEXTUAL_EXTENSIONS = {".txt", ".csv", ".md", ".json", ".xml", ".html", ".htm"}
PDF_EXTENSIONS = {".pdf"}
WORD_EXTENSIONS = {".docx", ".doc"}


class ReferralUploadService:
    @staticmethod
    def _name(filename: str | None) -> str:
        return (filename or "").lower().strip()

    @staticmethod
    def is_pdf(*, filename: str | None, content_type: str | None) -> bool:
        name = ReferralUploadService._name(filename)
        return content_type in PDF_CONTENT_TYPES or any(name.endswith(ext) for ext in PDF_EXTENSIONS)

    @staticmethod
    def is_word(*, filename: str | None, content_type: str | None) -> bool:
        name = ReferralUploadService._name(filename)
        return content_type in WORD_CONTENT_TYPES or any(name.endswith(ext) for ext in WORD_EXTENSIONS)

    @staticmethod
    def can_extract_text(*, filename: str | None, content_type: str | None) -> bool:
        name = ReferralUploadService._name(filename)
        if content_type in TEXTUAL_CONTENT_TYPES:
            return True
        if ReferralUploadService.is_pdf(filename=filename, content_type=content_type):
            return True
        if ReferralUploadService.is_word(filename=filename, content_type=content_type):
            return True
        return any(name.endswith(ext) for ext in TEXTUAL_EXTENSIONS)

    @staticmethod
    def _extract_text_file(content: bytes) -> dict[str, Any]:
        for encoding in ("utf-8", "utf-16", "latin-1"):
            try:
                text = content.decode(encoding).strip()
                return {
                    "extraction_status": "extracted" if text else "empty",
                    "extracted_text": text,
                    "encoding": encoding,
                    "parser": "text_decode",
                    "message": "Text extracted from uploaded referral document.",
                }
            except Exception:
                continue
        return {
            "extraction_status": "failed",
            "extracted_text": "",
            "parser": "text_decode",
            "message": "Could not decode referral document text safely.",
        }

    @staticmethod
    def _extract_pdf(content: bytes) -> dict[str, Any]:
        errors: list[str] = []
        try:
            from pypdf import PdfReader  # type: ignore

            reader = PdfReader(BytesIO(content))
            text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
            return {
                "extraction_status": "extracted" if text else "empty",
                "extracted_text": text,
                "parser": "pypdf",
                "page_count": len(reader.pages),
                "message": "Text extracted from uploaded PDF referral document.",
            }
        except Exception as error:
            errors.append(f"pypdf: {error}")

        try:
            from PyPDF2 import PdfReader  # type: ignore

            reader = PdfReader(BytesIO(content))
            text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
            return {
                "extraction_status": "extracted" if text else "empty",
                "extracted_text": text,
                "parser": "PyPDF2",
                "page_count": len(reader.pages),
                "message": "Text extracted from uploaded PDF referral document.",
            }
        except Exception as error:
            errors.append(f"PyPDF2: {error}")

        return {
            "extraction_status": "metadata_only",
            "extracted_text": "",
            "parser": "pdf_optional",
            "parser_errors": errors[-3:],
            "message": "PDF uploaded, but no available PDF parser could extract text in this runtime. Store metadata and process through OCR/parser pipeline.",
        }

    @staticmethod
    def _extract_docx(content: bytes) -> dict[str, Any]:
        errors: list[str] = []
        try:
            import docx  # type: ignore

            document = docx.Document(BytesIO(content))
            text = "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text).strip()
            return {
                "extraction_status": "extracted" if text else "empty",
                "extracted_text": text,
                "parser": "python-docx",
                "message": "Text extracted from uploaded Word referral document.",
            }
        except Exception as error:
            errors.append(f"python-docx: {error}")

        try:
            with ZipFile(BytesIO(content)) as archive:
                xml_bytes = archive.read("word/document.xml")
            root = ET.fromstring(xml_bytes)
            texts = [node.text or "" for node in root.iter() if node.tag.endswith("}t") and node.text]
            text = re.sub(r"\s+", " ", " ".join(texts)).strip()
            return {
                "extraction_status": "extracted" if text else "empty",
                "extracted_text": text,
                "parser": "docx_zip_xml",
                "message": "Text extracted from uploaded Word referral document.",
            }
        except Exception as error:
            errors.append(f"docx_zip_xml: {error}")

        return {
            "extraction_status": "metadata_only",
            "extracted_text": "",
            "parser": "docx_optional",
            "parser_errors": errors[-3:],
            "message": "Word document uploaded, but no available parser could extract text in this runtime. Store metadata and process through OCR/parser pipeline.",
        }

    @staticmethod
    def extract_text_from_bytes(*, content: bytes, filename: str | None, content_type: str | None) -> dict[str, Any]:
        name = ReferralUploadService._name(filename)

        if ReferralUploadService.is_pdf(filename=filename, content_type=content_type):
            return ReferralUploadService._extract_pdf(content)

        if name.endswith(".docx") or content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return ReferralUploadService._extract_docx(content)

        if ReferralUploadService.is_word(filename=filename, content_type=content_type):
            return {
                "extraction_status": "metadata_only",
                "extracted_text": "",
                "parser": "legacy_doc_unsupported",
                "message": "Legacy .doc referral document uploaded. Store metadata and process through OCR/parser pipeline.",
            }

        if not ReferralUploadService.can_extract_text(filename=filename, content_type=content_type):
            return {
                "extraction_status": "metadata_only",
                "extracted_text": "",
                "parser": "unsupported_metadata_only",
                "message": "File stored as referral metadata. Text extraction for this file type should be handled by the full document OCR/parser pipeline.",
            }

        return ReferralUploadService._extract_text_file(content)
