# ORB Knowledge Library (standalone)

## Purpose

Hold **official guidance**, **home/provider documents**, and **uploaded reference material** so ORB can answer and draft with approved context — without storing child records in standalone ORB.

## Structure (Documents & Guidance panel)

| Tab | Content |
|-----|---------|
| Official Guidance | Curated UK government/Ofsted metadata + links |
| My Home Documents | Local prototype store (upload/paste/link/tags) |
| Uploaded Documents | Pointer to analyse/upload flow |
| Analyse a Document | Existing document intelligence lenses |

## Data model

See `frontend-next/lib/orb/knowledge/orb-knowledge-library-types.ts` and `orb_knowledge_library_service.py`.

User uploads via API become `user_uploaded` sources with governance status (default draft until approved).

## Governance

- Official built-in entries: read-only metadata; `needs_review` when URLs change (manual process).
- User/home documents: draft until marked approved.
- Do not treat draft uploads as authoritative in answers.
