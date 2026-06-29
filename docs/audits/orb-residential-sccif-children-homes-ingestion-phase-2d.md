# ORB Residential SCCIF Children's Homes Ingestion — Phase 2d

## Purpose

This document records governed offline ingestion of the official Ofsted Social Care Common Inspection Framework (SCCIF): children's homes as structured chunks for ORB Residential.

SCCIF source text **is ingested** in this phase. Guide chunk content is **not changed**. Regulations 2015 chunk content is **not changed**. Runtime ORB answers, frontend behaviour, ORB Voice, Dictate, Write, Communicate, Chat UI, OS assistant routes and NR-1 governance controls are **unchanged**.

## What was ingested

| Item | Value |
| --- | --- |
| Source title | Social care common inspection framework (SCCIF): children's homes |
| Official URL | https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes/social-care-common-inspection-framework-sccif-childrens-homes |
| Publisher | Ofsted |
| Jurisdiction | England |
| Source artefact | `data/orb_residential_ingestion/ofsted_sccif_childrens_homes_source.txt` |
| Source checksum (SHA-256) | `ae8f14adc73641033f7334891882d63a15ceefacf4a0222de43792470e31f313` |
| Chunk artefact | `data/orb_residential_ingestion/ofsted_sccif_childrens_homes_chunks.json` |
| Chunk checksum (SHA-256) | `3fa492dd96361db84a30f1e2eba222be7615e41a74b07bc0a9f04841158a57cd` |
| Chunk count | 951 |

## Official source provenance

The source artefact was generated from a reviewed GOV.UK HTML export of the official SCCIF children's homes publication. Build-time extraction only; no runtime scraping or live web fetching.

## Chunking approach

Chunks are derived from the official govspeak HTML structure:

- section headings (`h2`/`h3`/`h4`) preserved as structural metadata;
- evaluation criteria and call-to-action benchmark text preserved as `framework_text`;
- heading-only blocks are not quote-allowed;
- long passages split at paragraph boundaries with clear internal chunk labels;
- chunk size capped below 1300 characters.

## Indexing

| Index | Purpose |
| --- | --- |
| `judgement_area_index` | Maps SCCIF judgement areas including the three core judgement areas and inspection framework context |
| `evaluation_area_index` | Maps required evidence areas and grade-band benchmarks |
| `inspection_evidence_theme_index` | Maps evidence themes and criterion text |

## Citation label policy

- Official SCCIF labels require verified `official_reference` and/or verified `judgement_area`.
- Internal splits use `internal chunk` plus `internal_chunk_id`.
- Generated labels must not look official.
- Metadata is not quote-allowed.
- Guide and Regulations commentary content kinds are rejected as SCCIF ingestion.

## Retrieval cap

`retrieval_policy.maximum_exact_chunks = 3`

The ingestion service never returns the full SCCIF blob and does not send the full SCCIF to an LLM.

## Human review gate

Human review approval is recorded in the chunk artefact with confirmations for provenance, URL, version/date, checksum, judgement/evaluation/theme mapping, citation labels, quote_allowed status, related mappings, boundary wording, contamination checks, and no overclaiming.

## Boundaries enforced

- ORB supports inspection preparation, evidence review and reflection against SCCIF themes.
- ORB does not predict Ofsted judgements or grades.
- ORB does not decide inspection readiness.
- ORB does not confirm evidence meets Outstanding/Good/Requires Improvement/Inadequate.
- ORB does not guarantee inspection outcomes or statutory compliance.
- ORB does not replace Ofsted, inspector, Registered Manager, Responsible Individual or provider judgement.

## Separation from Guide and Regulations

SCCIF chunks are stored in a separate artefact with separate validation and retrieval policy. Guide and Regulations checksums are verified unchanged by the SCCIF chunk verifier.

## What is not ingested

- No other new statutory or guidance sources.
- No local policy uploads.
- No runtime answer wiring.

## Why live ORB wiring remains blocked

Structured SCCIF chunks are available offline for deterministic retrieval tests and future governed wiring only. Live ORB answer wiring remains blocked in this PR. Live ORB answer behaviour, frontend surfaces and OS assistant routes are unchanged in this PR.

## Remaining future work

- Wire SCCIF retrieval into live ORB answers only after separate answer-policy tests pass.
- Keep Guide and Regulations retrieval policies separate.
- Maintain checksum-pinned verification on source or chunk changes.

## Current scope confirmation

| Question | Status |
| --- | --- |
| SCCIF source text ingested? | **Yes — offline governed artefact only** |
| Guide chunk content changed? | **No** |
| Regulations 2015 chunk content changed? | **No** |
| Runtime ORB answer behaviour changed? | **No** |
| Frontend behaviour changed? | **No** |
| ORB Voice, Dictate, Write, Communicate or Chat UI changed? | **No** |
| OS assistant routes changed? | **No** |
| NR-1 weakened? | **No — NR-1 remains open** |
| Public promise drafted or published? | **No — public promise remains blocked** |
