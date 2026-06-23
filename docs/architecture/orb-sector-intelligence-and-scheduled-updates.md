# ORB Sector Intelligence & Scheduled Updates — Architecture

**Status:** Architecture plan — no blind scraping; approved source registry required

## Goal

Future capability for managers to see what changed in children's homes regulation, guidance and sector learning — with clear sources, review status, and links to affected templates and policies.

## Principles

1. **Approved source registry only** — no blind scraping of unreliable sources
2. **Every update includes:** source URL, date retrieved, summary, relevance, review status
3. **No child/staff identifiable data** in sector reports
4. **Do not claim compliance** — updates are "consider reviewing" prompts
5. **Governance review** before surfacing to all homes

## Future dashboard modal

### "What changed this week?"

- Curated list of approved updates from scheduled checks
- Grouped by: legislation, Ofsted, SCCIF, safeguarding learning, policy consultations

### "What this may mean for children's homes"

- Plain-English summary of practice implications
- Linked regulation/practice anchors from `orb_regulation_practice_anchor_service`

### "Manager action to consider"

- Non-prescriptive checklist (e.g. "Review missing from care policy if guidance updated")
- Escalation to RI/provider if systemic

### "Templates potentially affected"

- Cross-reference `orb_template_taxonomy_service` by regulation anchor
- e.g. SCCIF update → templates with `sccif_*` anchors

### "Policies to review"

- Cross-reference `OrbHomeDocumentType` uploads at home
- e.g. physical intervention guidance change → `physical_intervention_policy`

## Scheduled check categories (future)

| Category | Example sources | Frequency |
|----------|-----------------|-----------|
| Legislation updates | legislation.gov.uk, DfE | Weekly |
| Ofsted updates | gov.uk/ofsted | Weekly |
| SCCIF updates | gov.uk SCCIF publications | On publish |
| Serious case reviews | National Child Safeguarding Practice Review Panel | Monthly |
| Safeguarding learning reviews | Local/national published reviews | Monthly |
| Consultation updates | gov.uk consultations | Weekly |
| Children's social care policy | DfE, Ofsted | Weekly |
| Residential childcare news | Approved RSS/registry only | Daily |
| Case law / guidance | Courts, professional bodies | Monthly |

## Approved source registry (planned schema)

```python
class OrbSectorSource(BaseModel):
    id: str
    title: str
    url: str
    publisher: str
    source_type: Literal["legislation", "ofsted", "dfe", "safeguarding", "news", "case_law"]
    trust_level: Literal["official", "approved_secondary"]
    check_frequency: str
    active: bool = True
```

## Update record schema (planned)

```python
class OrbSectorUpdate(BaseModel):
    id: str
    source_id: str
    source_url: str
    date_retrieved: str
    title: str
    summary: str
    relevance: str  # why it matters for children's homes
    review_status: Literal["pending", "approved", "dismissed", "needs_legal_review"]
    regulation_anchors: list[str]
    affected_template_ids: list[str]
    affected_policy_types: list[str]
    manager_actions: list[str]
    reviewed_by: str | None
    reviewed_at: str | None
```

## Existing building blocks

| Component | Path | Role |
|-----------|------|------|
| Sector intelligence agent | `frontend-next/lib/founder/agents/sector-intelligence-agent.ts` | Stub — needs live aggregates |
| ORB sector evidence pipeline | `services/orb_sector_evidence_pipeline_service.py` | Evidence ingestion |
| ORB public evidence intelligence | `services/orb_public_evidence_intelligence_service.py` | Public source processing |
| Knowledge library | `services/orb_knowledge_library_service.py` | Official doc ingest |
| SCCIF alignment | `services/sccif_alignment_registry_service.py` | Anchor mapping |
| Learning ledger | `sql/209_orb_learning_ledger.sql` | Anonymised patterns |

## Pipeline architecture (future)

```
Scheduled job (governance-approved sources only)
  → fetch / check for updates
  → parse + summarise (human review queue for high-impact)
  → match regulation anchors + templates + policy types
  → review_status: pending → approved
  → surface in manager dashboard modal
  → audit log: what was shown, when, to whom
```

## What we will not do

- Scrape unreliable or unverified sources
- Auto-change templates or policies without human review
- Include identifiable case details in sector updates
- Present updates as legal advice or compliance guarantees

## Implementation phases

### Phase 1 (this pass)

- Architecture document
- Link to regulation anchor map and template taxonomy
- Approved source registry schema design

### Phase 2

- Source registry service + admin UI for approved sources
- Manual update ingestion workflow

### Phase 3

- Scheduled checks for official sources only
- Manager dashboard modal with review queue

### Phase 4

- Template/policy impact suggestions
- Pilot with selected homes before general release

## Risks

- Legal review needed before automating legislation summaries
- Source availability and format changes
- Risk of over-notification — needs relevance scoring
- Sector intelligence agent currently stubbed
