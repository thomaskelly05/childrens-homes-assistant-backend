# ORB Residential Controlled Source-to-Chunk Pipeline Scaffold

## Purpose

This document defines the repeatable scaffold for future ORB Residential Tier 1 source ingestion.

No new source is ingested by this scaffold. The Children's Homes Regulations 2015 are not ingested. SCCIF is not ingested. The existing Guide chunk JSON remains the accepted Phase 2a artefact.

The scaffold exists to prevent statutory source ingestion becoming a manual, one-off process. It defines manifest, input, chunking, citation, checksum, provenance, validation and human review rules before any future source can become an exact citation source.

## Current scope

- Offline script: `scripts/orb_source_to_chunk_pipeline.py`.
- Tests: `tests/test_orb_source_to_chunk_pipeline.py`.
- Runtime answer behaviour: unchanged.
- Frontend behaviour: unchanged.
- ORB Voice, Dictate, Write, Communicate and Chat UI: unchanged.
- OS assistant routes: unchanged.
- NR-1 remains open.
- The public promise remains blocked.

## Source manifest

Every future source must have a manifest before chunk generation:

- `source_id`
- `source_title`
- `source_type`
- `official_url`
- `publisher`
- `version`
- `last_verified_date`
- `jurisdiction`
- `statutory_status`
- `citation_authority`
- `source_file_path`
- `source_file_checksum`
- `ingestion_scope`
- `excluded_sections`
- `requires_human_review`
- `allowed_quote_basis`
- `not_to_be_used_for`
- `professional_judgement_boundary`

The manifest records the source authority and the reviewed local artefact. A source file checksum must exist before chunks are generated.

## Input rules

- Source text must come from an approved official source or a committed reviewed source artefact.
- No uncontrolled runtime scraping is permitted.
- No live web fetching is permitted during runtime.
- Local policy sources require upload and review.
- Third-sector and lived-experience sources must be marked reflective/practice-only.
- Source file checksum must be recorded before chunk generation.

These rules protect citation trust by ensuring ORB quotes only from reviewed, stable text rather than transient web output.

## Chunk generation rules

- Chunk by official structure where possible.
- Preserve official paragraph or regulation references only where genuinely present.
- Never generate paragraph labels that look official.
- Use `internal_chunk_id` for generated splits.
- Distinguish source text from generated metadata.
- Preserve exact source text where `quote_allowed: true`.
- Cap chunk size.
- Preserve section heading, regulation number, Quality Standard, SCCIF judgement area, workflow domains and citation boundaries where applicable.

Chunking supports source-bundle retrieval by keeping chunks small, mapped and deterministic. ORB can then select a small relevant bundle instead of sending whole documents to an LLM, reducing OpenAI cost.

## Citation label policy

- Official references may only be used if genuinely present in the source.
- Internal chunk IDs must be clearly labelled as internal.
- Generated references must never be exposed as official paragraph labels.
- Exact citations require exact source text.
- Metadata cannot be cited as exact source text.
- Embedded references must be labelled by source context.
- No source may be used to guarantee compliance.
- No SCCIF source may be used to predict an Ofsted grade.

Citation labels must help adults see what is source text, what is metadata, and where professional judgement remains required.

## Checksum and provenance policy

- Algorithm: SHA-256.
- Canonical JSON: sorted keys, compact separators, UTF-8, `ensure_ascii=False`.
- Excluded from chunk checksum: `provenance.chunk_json_sha256` and `provenance.generated_at`.
- Source file checksum: SHA-256 over the committed reviewed source artefact.
- Chunk file checksum: SHA-256 over canonical chunk payload JSON.
- Generation timestamps are audit metadata and do not affect the canonical chunk checksum.
- Reviewer sign-off metadata must be recorded before quote-allowed chunks are accepted.
- If a checksum changes, reviewers must inspect the chunk diff and source artefact diff before accepting a new checksum.
- Audit trail must include source manifest, source file checksum, chunk checksum, generation date, reviewer, and review confirmations.

## Validation rules

The scaffold validates:

- required manifest and chunk metadata fields;
- exact chunk count when specified;
- maximum chunk size;
- official/internal reference separation;
- `quote_allowed` safety;
- no compliance guarantee wording;
- no SCCIF grade prediction wording;
- source-specific exclusions;
- local policy caveats;
- checksum match;
- all required mappings where specified.

The current scaffold also guards that Regulations 2015 and SCCIF remain reserved future sources and are not ingested by this PR.

## Human review gate

Human review is required before any generated chunk can be treated as an exact citation source.

Review must confirm:

- source provenance;
- official URL;
- version/date;
- chunk boundaries;
- citation labels;
- `quote_allowed` status;
- regulation, Quality Standard and SCCIF mapping;
- no misleading references;
- no overclaiming;
- no local policy contamination;
- checksum recorded.

Without approved review metadata, quote-allowed chunks fail validation.

## Future-source readiness

The next Tier 1 sources remain future work:

- Children's Homes Regulations 2015: use this scaffold with a regulation-number index, schedule-aware chunking, exact statutory text boundaries, and regulation citation labels only where genuinely present.
- SCCIF children’s homes: use this scaffold with judgement-area tags, evaluation criteria boundaries, evidence framing, and explicit grade-prediction prohibition.

Neither source is ingested in this PR.

## Remaining future work

- Add a reviewed local source artefact for the next approved source.
- Generate chunks from that artefact through this scaffold in a separate PR.
- Add source-specific validation for regulation-number indexing.
- Add source-specific validation for SCCIF judgement-area tagging.
- Keep exact citation wiring behind separate governed retrieval and answer-policy tests.
- Keep the public promise blocked until NR-1 and source governance are resolved.
