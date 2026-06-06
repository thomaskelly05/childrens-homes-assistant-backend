# ORB Document Upload Security

## Standalone document upload (`POST /orb/standalone/documents/upload`)

| Rule | Value |
|------|-------|
| Authentication | Required |
| Active ORB access | Required (premium) |
| Allowed extensions | `.txt`, `.md`, `.pdf`, `.docx` |
| Blocked extensions | `.exe`, `.bat`, `.cmd`, `.com`, `.msi`, `.scr`, `.sh`, `.bash`, `.php`, `.html`, `.htm`, `.js`, `.jar`, `.zip`, `.rar` |
| Max decoded size | 10 MB |
| OS ID fields | Rejected (`child_id`, `home_id`, etc.) |
| Storage | User-scoped knowledge library (not OS records) |
| Logging | Metadata only; no raw document text |

## Dictate audio upload (`POST /orb/dictate/transcribe/audio`)

| Rule | Value |
|------|-------|
| Authentication | Required |
| Active ORB access | Required (premium) |
| Allowed extensions | `.webm`, `.wav`, `.mp3`, `.m4a`, `.ogg`, `.mp4`, `.mpeg`, `.flac`, `.aac`, `.opus` |
| Blocked extensions | Executables and script types |
| Max size | 25 MB |
| Temp storage | `_tmp_dictate_uploads/` — deleted after processing |

## Comparison route (`POST /orb/standalone/documents/compare`)

- Same auth and premium requirements as analyse/upload
- AI governance applied via document intelligence services

## localStorage prototypes

Document prototypes in browser localStorage are **local drafts only**, not provider-secure storage. Cleared on sign-out via `clearSensitiveBrowserState()`.

## Tests

- `tests/test_orb_document_upload_security.py`
