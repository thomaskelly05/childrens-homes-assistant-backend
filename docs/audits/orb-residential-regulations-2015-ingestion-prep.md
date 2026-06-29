# ORB Residential Regulations 2015 Source-Specific Ingestion Prep

## Purpose

This document defines the source-specific validation scaffold for future ingestion of The Children's Homes (England) Regulations 2015.

No Regulations 2015 source text is ingested by this PR. SCCIF is not ingested. Existing Guide chunks are not changed. Runtime ORB answers, frontend behaviour, ORB Voice, Dictate, Write, Communicate, Chat UI, OS assistant routes and NR-1 governance controls are unchanged.

## Why Regulations 2015 need source-specific validation

The Regulations are legal/regulatory source material. They must be indexed by regulation number, Part and Schedule where applicable, rather than treated like general guidance or Guide commentary.

The scaffold requires:

- official source identity;
- official legislation.gov.uk URL;
- publisher and jurisdiction;
- version/date and last verified date;
- source artefact path and SHA-256 checksum;
- statutory status and citation authority;
- explicit legal advice and compliance guarantee boundaries;
- human review before any future quote-allowed exact citation use.

## Manifest requirements

The Regulations 2015 manifest must include `source_id`, `source_title`, `official_url`, `publisher`, `jurisdiction`, `version`, `last_verified_date`, `source_file_path`, `source_file_checksum`, `statutory_status`, `citation_authority`, `ingestion_scope`, `excluded_sections`, `requires_human_review`, `allowed_quote_basis`, `professional_judgement_boundary`, `not_to_be_used_for`, `regulation_index_required`, `part_index_required`, `schedule_index_required`, `legal_advice_boundary` and `compliance_guarantee_blocked`.

Validation lives in `scripts/verify_orb_regulations_2015_manifest.py`.

## Regulation-number indexing

Future regulation text chunks must carry a verified `regulation_number`, `regulation_title` and `official_reference`. Regulation-style labels such as `Regulation 12` are only allowed when that regulation number and official reference have been verified against the official source artefact.

Internal splits must use clear internal labels that include `internal chunk` and the `internal_chunk_id`.

## Part and Schedule indexing

Future chunks must preserve `part_number` and `part_title` where a regulation belongs to a Part. Schedule text must preserve `schedule_number` and `schedule_title` where applicable.

Schedule chunks may be quote-allowed only when they contain exact Schedule source text, have approved human review, and use an approved Schedule quote basis.

## Citation label handling

Citation labels must distinguish:

- Regulation text;
- headings;
- Schedules;
- generated metadata;
- Guide commentary about regulations.

Generated labels must not look official. Metadata cannot be cited as exact source text. Embedded references to Regulations inside Guide chunks remain Guide commentary and are not treated as Regulations 2015 ingestion.

## Legal advice and compliance boundaries

ORB can support professional thinking and recording. ORB cannot provide legal advice, decide statutory compliance, replace registered manager/provider judgement, decide whether an event meets a notification threshold, or guarantee Ofsted outcomes.

Local policy and manager oversight may still be required.

## Human review gate

Human review must approve official source identity, official URL, version/date, source checksum, regulation index, Part/Schedule index, citation labels, exactness of source text, metadata separation, Guide commentary separation, legal advice boundary and compliance guarantee boundary before quote-allowed chunks are accepted as exact citations.

Human review must also confirm chunk boundaries, `quote_allowed` status, related Quality Standards mapping, related workflow domain mapping, no local policy contamination, no overclaiming, and checksum recorded.

Safe boundary wording does not cancel out unsafe claims. The verifier must reject wording that says or implies ORB decides statutory or legal compliance, decides notification thresholds, decides Regulation 40 notification requirements, confirms something is not notifiable, replaces Registered Manager/provider/Responsible Individual/safeguarding/legal judgement, gives legal advice, guarantees compliance or Ofsted outcomes, predicts Ofsted judgements, decides inspection readiness, or determines that a home or incident meets a statutory threshold.

Safe wording may say ORB supports professional thinking, safer recording and evidence review; that ORB does not provide legal advice, decide statutory compliance, decide notification thresholds, or replace professional judgement; and that local policy, manager oversight and legal advice may be required.

## Checksum and provenance

The source file checksum is required before any chunk generation. Future Regulations chunk payload checksums must align with the controlled source-to-chunk pipeline policy: SHA-256 over canonical JSON, with generation timestamps such as `generated_at` excluded from deterministic checksum input.

Checksum recomputation cannot bypass validation failures. A future actual Regulations ingestion PR must include chunk checksum validation, source artefact checksum validation, and reviewer inspection of source/chunk diffs before any checksum change is accepted.

## Before actual Regulations ingestion

Future ingestion must:

- add a reviewed local source artefact;
- record the source artefact SHA-256 checksum;
- generate regulation-numbered chunks from that artefact;
- verify Part/Schedule indexing;
- verify exact source text boundaries;
- add canonical chunk checksum validation;
- obtain human review approval;
- add separate retrieval and answer-policy tests before any live ORB wiring.

## Current scope confirmation

| Question | Status |
| --- | --- |
| Regulations 2015 source text ingested? | **No** |
| SCCIF ingested? | **No** |
| Guide chunk content changed? | **No** |
| Runtime ORB answer behaviour changed? | **No** |
| Frontend behaviour changed? | **No** |
| ORB Voice, Dictate, Write, Communicate or Chat UI changed? | **No** |
| OS assistant routes changed? | **No** |
| NR-1 weakened? | **No — NR-1 remains open** |
| Public promise drafted or published? | **No — public promise remains blocked** |

## Remaining future work

- Ingest the official Regulations 2015 source text in a separate governed PR.
- Add checksum-pinned Regulations chunk artefacts only after human review.
- Add runtime retrieval and exact citation wiring only after source-specific ingestion tests pass.
- Keep SCCIF as a separate future source-specific scaffold and ingestion step.
