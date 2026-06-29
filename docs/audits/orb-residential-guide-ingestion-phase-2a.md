# ORB Residential Guide Ingestion Phase 2a

## Scope

This PR ingests the first Tier 1 governed source only:

- **Guide to the Children's Homes Regulations including the Quality Standards**
- Source ID: `dfe_childrens_homes_regulations_guide`
- Publisher: Department for Education
- Version: Version 1.17 FINAL (April 2015)
- Official source URL: `https://www.gov.uk/government/publications/childrens-homes-regulations-including-quality-standards-guide`
- Last verified date: `2026-06-28`

The Guide is stored as committed, structured chunks in `data/orb_residential_ingestion/guide_to_childrens_homes_regulations_chunks.json`.

## What was ingested

- 371 exact Guide chunks.
- Chunks are source-labelled, paragraph-labelled, section-labelled and metadata-governed.
- Chunks are compact; no chunk is intended to represent the whole Guide.
- The committed data is static and deterministic.

## What was not ingested

- The Children's Homes (England) Regulations 2015 were not ingested as a separate full-text source.
- SCCIF was not ingested as a full-text source.
- The full 113-source catalogue was not ingested.
- No local provider policy was ingested.
- No public promise was drafted or published.

## Chunk structure

Each Guide chunk includes:

- `source_id`, `source_title`, `source_type`, `official_url`, `publisher`, `version`, `last_verified_date`
- `section_heading`, `paragraph_reference`, `quality_standard`
- `related_regulations`, `related_workflow_domains`
- `citation_label`, `basis_type`, `quote_allowed`, `retrieval_priority`
- `requires_local_policy`, `professional_judgement_boundary`, `not_to_be_used_for`
- `exact_excerpt`, `text`, `content_hash`

## Quality Standards mapping

Chunks map to the nine Quality Standards:

- Quality and purpose of care
- Children's views, wishes and feelings
- Education
- Enjoyment and achievement
- Health and wellbeing
- Positive relationships
- Protection of children
- Leadership and management
- Care planning

This mapping supports retrieval and source-bundle selection. It does not claim that the Guide guarantees compliance.

## Citation policy

Exact citations are allowed only when a retrieved chunk has:

- `basis_type: exact`
- `source_integrity: full_document`
- `quote_allowed: true`
- an exact excerpt or text body
- a citation label

Guide catalogue metadata and summary-only entries are not exact citations.

The Guide cannot be used to guarantee compliance, replace safeguarding threshold decisions, predict Ofsted judgements, or substitute for local policy.

## Retrieval behaviour

The deterministic retrieval service can select Guide chunks by:

- Quality Standard
- section heading
- workflow domain
- regulation reference where available
- keyword/query
- source ID

This PR does not wire Guide chunks into live ORB answers, routes, frontend behaviour, ORB Voice, Dictate, Write, Communicate, or Chat UI.

## Local policy boundaries

Guide chunks preserve the boundary that adults and managers remain responsible for judgement. Operational decisions may still require provider policy, LSCP procedures, placing authority input, health advice, legal advice, or manager review.

## Cost-control alignment

The retrieval service follows the Phase 2a cost-control design:

- never send the full Guide to the LLM;
- retrieve only relevant chunks;
- cap exact Guide chunks at 3 per bundle;
- select chunks deterministically before any LLM call;
- keep chunks compact enough for small source bundles.

This reduces OpenAI cost by replacing broad source upload with small, pre-filtered source bundles.

## Deferred work

Regulations 2015 and SCCIF remain separate future ingestion phases. They need their own chunking, citation and exclusion tests before any exact citation support is added for those sources.

NR-1 remains open. The public promise remains blocked.
