# ORB Residential Regulations 2015 Ingestion Phase 2b

## Scope

This PR ingests The Children's Homes (England) Regulations 2015 as a governed, structured, exact source layer for ORB Residential.

It adds:

- a reviewed official source artefact;
- structured Regulations chunks;
- checksum verification;
- deterministic retrieval support;
- tests and audit documentation.

It does **not**:

- wire Regulations retrieval into live ORB answers;
- change frontend behaviour;
- change ORB Voice, Dictate, Write, Communicate or Chat UI;
- touch OS assistant routes;
- weaken NR-1 governance controls;
- draft or publish the public promise;
- ingest SCCIF;
- change existing Guide chunk content.

## Official source provenance

| Field | Value |
| --- | --- |
| Source ID | `childrens_homes_regulations_2015` |
| Source title | The Children's Homes (England) Regulations 2015 |
| Official URL | `https://www.legislation.gov.uk/uksi/2015/541/contents` |
| Publisher | UK legislation |
| Jurisdiction | England |
| Version | SI 2015/541 as published on legislation.gov.uk (verified 2026-06-29) |
| Statutory status | statutory_instrument |
| Citation authority | official_legislation_text |
| Source artefact | `data/orb_residential_ingestion/childrens_homes_regulations_2015_source.txt` |
| Source checksum (SHA-256) | `7bab72781fff7c1ffd1a3a04d1fa90a054e9b9a34017efc608aab5575637b1d5` |
| Chunk artefact | `data/orb_residential_ingestion/childrens_homes_regulations_2015_chunks.json` |
| Chunk checksum (SHA-256) | `825343995c4013c14fe84190304ce94695b005dcda092336fe063e4a1445d9a5` |

The source artefact was generated offline from the official legislation.gov.uk XML export (`/uksi/2015/541/data.xml`) and committed locally. No runtime scraping or live web fetching occurs in the application.

## SignedSection omission

The legislation.gov.uk XML export includes a short **SignedSection** signature block at the end of the Body (ministerial signature text). This block is **omitted** from the committed source artefact and chunk layer because:

- it is not operative regulatory text used for children's homes duties;
- it does not affect Regulations 1–57, Parts or Schedules;
- ORB remains a support tool for professional thinking and safer recording, not a legal advice or compliance-decision service.

Omission of SignedSection does not remove any operative regulation, Part or Schedule content.

## Regulation title indexing

`regulation_title` is populated from official **P1group Title** elements in the legislation.gov.uk XML structure where present (55 of 57 regulations). Regulations **54** and **55** (revocation/consequential provisions) have no P1group title in the official export and remain without a separate title field. Exact quoteable `text` / `exact_excerpt` fields are unchanged.

Title retrieval supports official descriptive titles (for example `protection` → Regulation 12). Regulation-number retrieval remains the primary deterministic index.

## What was ingested

- 100 structured Regulations chunks covering 57 regulations across 7 Parts and 5 Schedules.
- Chunks preserve regulation number, regulation title, Part, Schedule, official reference and exact source text.
- Chunks are compact; no chunk represents the full Regulations as one blob.

## Chunking approach

- Chunk by official regulation or schedule structure where possible.
- Split long regulation or schedule text using deterministic internal splits capped below 1,300 characters.
- Internal splits use `internal_chunk_id` and citation labels containing `internal chunk`.
- Regulation-style labels such as `Regulation 12` are only used where `regulation_number` and `official_reference` are verified.
- Generated metadata is separated from exact source text.

## Regulation-number indexing

- `verified_regulation_numbers` lists all ingested regulation numbers.
- `regulation_index.by_number` maps each verified number to its official reference.
- `regulation_index.by_part` maps each Part to its regulation numbers.
- `regulation_index.by_schedule` maps each Schedule to its official reference.

## Part and Schedule indexing

- `parts` records Part number, Part title and contained regulation numbers.
- `schedules` records Schedule number, Schedule title and official reference.
- Schedule chunks use approved Schedule quote basis after human review.

## Citation label policy

- Regulation text may use official Regulation labels only with verified regulation numbers.
- Internal splits must use clear internal labels including `internal chunk` and the `internal_chunk_id`.
- Generated labels must not look official.
- Metadata cannot be cited as exact source text.
- Guide commentary about Regulations remains separate Guide source text and is not treated as Regulations ingestion.

## Retrieval cap

- Maximum 3 exact Regulations chunks per retrieval request.
- Retrieval never returns the full Regulations as one blob.
- Retrieval is available through `services/orb_residential_regulations_2015_ingestion_service.py` for tests and future wiring only.
- `runtime_answer_wiring_enabled` remains `false`.

## Human review gate

Human review approval is recorded before quote-allowed chunks are accepted. Review confirms:

- source provenance, official URL, version/date and source checksum;
- regulation index and Part/Schedule mapping;
- chunk boundaries, citation labels and `quote_allowed` status;
- related Quality Standards and workflow domain mapping;
- exact source text boundaries and metadata separation;
- Guide commentary separation and no local policy contamination;
- legal advice, compliance guarantee and notification-threshold boundaries;
- checksum recorded.

## Legal advice, compliance and notification boundaries

ORB supports professional thinking and safer recording. ORB does not:

- provide legal advice;
- decide statutory compliance;
- decide notification thresholds;
- decide whether Regulation 40 notification is required;
- replace Registered Manager, provider or Responsible Individual judgement;
- replace safeguarding decision-making;
- guarantee Ofsted outcomes.

Local policy, manager oversight and legal advice may still be required.

## What is not ingested

- SCCIF remains not ingested.
- Guide chunk content remains unchanged.
- No live ORB answer wiring occurred in this PR.
- No route, frontend or OS assistant changes occurred.

## Why SCCIF remains separate

SCCIF is inspection framework material with different citation, indexing and boundary rules. It requires its own source-specific scaffold and human review before any governed ingestion.

## Why Guide commentary remains separate

The DfE Guide explains and interprets the Regulations. Guide chunks may reference Regulations, but Guide commentary is not statutory Regulations text and must not be cited as such.

## Why live ORB wiring remains blocked

Regulations chunks are now available as a governed static source layer, but live ORB answer wiring, routes, frontend surfaces and OS assistant flows remain unchanged until separate answer-policy and wiring tests are completed.

## Verification

Run:

```bash
python3 scripts/verify_orb_regulations_2015_chunks.py
python3 scripts/verify_orb_regulations_2015_manifest.py data/orb_residential_ingestion/childrens_homes_regulations_2015_chunks.json
```

## Remaining work

- Add answer-policy wiring tests before enabling live ORB Regulations retrieval.
- Keep NR-1 open until broader governance review completes.
- Keep the public promise blocked until founder approval.
- Add SCCIF as a separate future governed ingestion phase.

## Current scope confirmation

| Question | Status |
| --- | --- |
| Regulations 2015 source text ingested? | **Yes — structured chunks only** |
| SCCIF ingested? | **No** |
| Guide chunk content changed? | **No** |
| Runtime ORB answer behaviour changed? | **No** |
| Frontend behaviour changed? | **No** |
| ORB Voice, Dictate, Write, Communicate or Chat UI changed? | **No** |
| OS assistant routes changed? | **No** |
| NR-1 weakened? | **No — NR-1 remains open** |
| Public promise drafted or published? | **No — public promise remains blocked** |
