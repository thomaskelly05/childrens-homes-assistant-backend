# ORB Residential SCCIF Children's Homes Source-Specific Ingestion Prep

## Purpose

This document defines the source-specific validation scaffold for future ingestion of the Ofsted Social Care Common Inspection Framework (SCCIF): children's homes.

No SCCIF source text is ingested by this PR. Existing Guide chunks are not changed. Existing Regulations 2015 chunks are not changed. Runtime ORB answers, frontend behaviour, ORB Voice, Dictate, Write, Communicate, Chat UI, OS assistant routes and NR-1 governance controls are unchanged.

## Why SCCIF needs source-specific validation

SCCIF is an inspection and evaluation framework, not statutory legislation or practice guidance. It must be indexed by judgement area, evaluation area and inspection evidence theme rather than treated like the Guide or Regulations 2015.

The scaffold requires:

- official source identity;
- official gov.uk URL;
- Ofsted as publisher and England as jurisdiction;
- version/date and last verified date;
- source artefact path and SHA-256 checksum;
- inspection framework status and citation authority;
- explicit grade-prediction and compliance-guarantee boundaries;
- human review before any future quote-allowed exact citation use.

## Manifest requirements

The SCCIF children's homes manifest must include `source_id`, `source_title`, `official_url`, `publisher`, `jurisdiction`, `version`, `last_verified_date`, `source_file_path`, `source_file_checksum`, `framework_status`, `citation_authority`, `ingestion_scope`, `excluded_sections`, `requires_human_review`, `allowed_quote_basis`, `professional_judgement_boundary`, `not_to_be_used_for`, `judgement_area_index_required`, `evaluation_area_index_required`, `inspection_evidence_theme_index_required`, `grade_prediction_blocked` and `compliance_guarantee_blocked`.

Validation lives in `scripts/verify_orb_sccif_children_homes_manifest.py`.

## Judgement-area indexing

Future SCCIF framework text chunks must carry a verified `judgement_area` aligned to the three SCCIF judgement areas for children's homes:

- overall experiences and progress of children;
- how well children are helped and protected;
- effectiveness of leaders and managers.

Judgement-area labels are only allowed when the judgement area has been verified against the official source artefact and indexed in `judgement_area_index`.

## Evaluation-area indexing

Future chunks must preserve `evaluation_area` where SCCIF evaluation criteria apply within a judgement area. Evaluation-area labels must not be treated as Ofsted grade predictions.

## Inspection evidence theme indexing

Future chunks must preserve `inspection_evidence_theme` where the SCCIF framework links evidence themes to inspection thinking. Themes support evidence review and inspection preparation; they do not decide inspection readiness or predict outcomes.

## Citation label handling

Citation labels must distinguish:

- SCCIF framework text;
- headings;
- generated metadata;
- Guide commentary about inspection;
- Regulations commentary about inspection duties.

Official SCCIF labels are only allowed where a verified official section/reference or verified judgement area exists. Internal splits must use clear internal labels that include `internal chunk` and the `internal_chunk_id`. Generated labels must not look official. Metadata cannot be cited as exact source text.

## SCCIF remains separate from Guide and Regulations

SCCIF chunks must not treat embedded Guide or Regulations references as SCCIF ingestion. Guide and Regulations chunks remain separate governed sources with their own validation scaffolds. This PR does not change Guide or Regulations chunk content and does not wire any of these sources into live ORB answers.

## Grade-prediction and inspection-outcome boundaries

ORB can support:

- evidence review;
- inspection preparation;
- reflection against SCCIF themes.

ORB cannot:

- predict Ofsted judgements or grades;
- decide inspection readiness;
- guarantee an Ofsted outcome;
- decide statutory compliance;
- replace Registered Manager, Responsible Individual, provider or inspector judgement.

Local policy, manager oversight and professional judgement remain required.

The verifier rejects wording such as:

- ORB predicts the Ofsted judgement.
- ORB guarantees the inspection outcome.
- ORB decides the home is inspection ready.
- ORB confirms this evidence meets outstanding.
- ORB determines the home is good.
- ORB grades the home.
- ORB decides SCCIF compliance.
- ORB replaces Ofsted judgement.
- ORB replaces Registered Manager judgement.
- ORB guarantees compliance.

Safe wording may say ORB supports inspection preparation and evidence review; that ORB does not predict Ofsted judgements or decide inspection readiness; that Ofsted makes inspection judgements; and that Registered Manager, Responsible Individual and provider judgement remain responsible.

## Human review gate

Human review must approve official source identity, official URL, version/date, source checksum, judgement area mapping, evaluation area mapping, inspection evidence theme mapping, chunk boundaries, citation labels, `quote_allowed` status, related Quality Standards mapping, related Regulations mapping, related workflow domain mapping, grade-prediction boundary wording, compliance-guarantee boundary wording, Guide/Regulations separation, no local policy contamination, no overclaiming, and checksum recorded before quote-allowed chunks are accepted as exact citations.

## Checksum and provenance

The source file checksum is required before any chunk generation. Future SCCIF chunk payload checksums must align with the controlled source-to-chunk pipeline policy: SHA-256 over canonical JSON, with generation timestamps such as `generated_at` excluded from deterministic checksum input.

## Before actual SCCIF ingestion

Future ingestion must:

- add a reviewed local source artefact;
- record the source artefact SHA-256 checksum;
- generate judgement-area, evaluation-area and inspection-evidence-theme tagged chunks from that artefact;
- verify exact source text boundaries;
- add canonical chunk checksum validation;
- obtain human review approval;
- add separate retrieval and answer-policy tests before any live ORB wiring.

## Current scope confirmation

| Question | Status |
| --- | --- |
| SCCIF source text ingested? | **No** |
| Regulations 2015 chunk content changed? | **No** |
| Guide chunk content changed? | **No** |
| Runtime ORB answer behaviour changed? | **No** |
| Frontend behaviour changed? | **No** |
| ORB Voice, Dictate, Write, Communicate or Chat UI changed? | **No** |
| OS assistant routes changed? | **No** |
| NR-1 weakened? | **No — NR-1 remains open** |
| Public promise drafted or published? | **No — public promise remains blocked** |

## Remaining future work

- Ingest the official SCCIF children's homes source text in a separate governed PR.
- Add checksum-pinned SCCIF chunk artefacts only after human review.
- Add runtime retrieval and exact citation wiring only after source-specific ingestion tests pass.
- Keep SCCIF retrieval separate from Guide and Regulations retrieval policies.
