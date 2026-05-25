# SCCIF and Quality Standards alignment layer

## Purpose

Maps safe operational metadata from IndiCare modules to:

- **SCCIF judgement areas** (children's homes): overall experiences and progress; helped and protected; leadership and management.
- **Nine Quality Standards** under the Children's Homes Regulations.

This supports manager oversight and inspection **preparation**. It does **not** predict inspection outcomes, generate grades, or claim compliance.

## Official sources

- [SCCIF: children's homes](https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes/social-care-common-inspection-framework-sccif-childrens-homes)
- [Guide to the Children's Homes Regulations, including the Quality Standards (v1.17)](https://assets.publishing.service.gov.uk/media/5a7f1b54ed915d74e33f45f0/Guide_to_Children_s_Home_Standards_inc_quality_standards_Version__1.17_FINAL.pdf)

Import these in Knowledge Library (`sccif_childrens_homes`, `quality_standards_guide` families) for ORB exact citations.

## API

| Route | Description |
|-------|-------------|
| `GET /sccif-alignment/health` | Service health |
| `GET /sccif-alignment/dashboard` | Full alignment dashboard |
| `GET /sccif-alignment/judgements` | SCCIF judgement area registry |
| `GET /sccif-alignment/quality-standards` | Quality Standards registry |
| `GET /sccif-alignment/evidence` | Evidence items only |
| `GET /sccif-alignment/gaps` | Evidence gaps only |

Mirrored under `/api/sccif-alignment/*`. Auth required. Metadata only.

## UI

- Dashboard: `/intelligence/sccif`
- Care Hub: Inspection readiness card → `/intelligence/sccif`
- Manager daily brief: SCCIF / Quality Standards section
- Cross-links: recording governance, handover, staff profile, ISN digest

## Evidence strengths

| Value | Meaning |
|-------|---------|
| `strong_evidence` | Submitted/approved metadata in scope |
| `partial_evidence` | Operational metadata, flags, counts |
| `prompt_only` | Draft — not inspection proof |
| `route_hint_only` | Navigate to module; no aggregate summary |
| `not_yet_wired` | No collector |
| `not_safe_to_summarise` | HR/safeguarding bodies excluded |

## Safety boundaries

1. No compliance claims.
2. No Ofsted grades.
3. No outcome prediction.
4. Drafts ≠ completed evidence.
5. No raw bodies in cards.
6. Standalone `/orb` cannot access alignment APIs.
7. ORB links use `/assistant/orb` only.
8. Manager judgement required.

## ORB support

Modes: `ofsted_evidence_review`, `manager_daily_brief`, `safeguarding_themes`, `record_quality_review`. Queries are generic — no child/staff/draft IDs in URLs.

## Inspection readiness workspace

Reg 44 / Reg 45 evidence support packs are available at `/intelligence/inspection-readiness`. The SCCIF dashboard cross-links to generate Reg 44 and Reg 45 packs from aligned metadata. See `docs/reg44-reg45-evidence-pack-builder.md`.

## Future work

- Exact citation integration via Knowledge Library import
- Per-child journey synthesis hooks (metadata only)
- Deeper Reg 44 document ingestion (metadata only)
