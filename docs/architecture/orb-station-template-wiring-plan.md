# ORB Station–Template Wiring Plan

**Status:** Foundation — metadata and API ready; UI wiring is follow-up

## Principle

One canonical registry (`orb_template_library_registry.py`) + taxonomy metadata (`orb_template_taxonomy_service.py`). Stations consume via search, handoff, and save pathways — no per-station duplicate registries.

## Station capabilities

### Chat (`station=chat`)

| Capability | Status | Implementation |
|------------|--------|----------------|
| Suggest relevant templates after answers | Planned | Taxonomy search by contract family + message keywords |
| "Turn this into a record" | Partial | Handoff to Write/Dictate via `orb-write-template-handoff.ts` |
| "Use a template for this" | Partial | `orb_template_copilot_service.resolve_template_id` |

**Wiring:** After answer repair, call `orb_template_taxonomy_service.search(query, station="chat")` and surface top 3 templates with save destination.

### Dictate (`station=dictate`)

| Capability | Status | Implementation |
|------------|--------|----------------|
| Adult dictates naturally | Live | `orb_dictate_service.py` |
| ORB suggests matching template | Live | Dictate registry + framework bridge |
| Structures transcript into template | Live | Section prompts from selected template |
| Adult reviews before save | Live | Dictate capture station review step |

**Wiring:** Map `dictate_note_type` ↔ taxonomy `template_id` via recording framework.

### Voice (`station=voice`)

| Capability | Status | Implementation |
|------------|--------|----------------|
| Voice conversation creates draft records | Partial | Transcript → Write handoff |
| ORB suggests template after spoken content | Planned | Taxonomy search on transcript summary |
| Save to Records & Documents | Planned | `schemas/orb_records_workspace.py` |

### ORB Write (`station=write`)

| Capability | Status | Implementation |
|------------|--------|----------------|
| Template library visible/searchable | Live | Template picker + framework |
| Generate full drafts from templates | Live | `orb_template_generation_service` |
| Reports, summaries, reviews, evidence notes | Live | Recording framework groups |

### Records & Drafts (`station=records`)

| Capability | Status | Implementation |
|------------|--------|----------------|
| My Drafts / Records / Documents sections | Planned | `schemas/orb_records_workspace.py` |
| Templates used history | Planned | Audit trail on workspace items |
| Export / copy / print | Partial | Export on templates; draft export planned |
| Status lifecycle | Partial | OS recording drafts have status; ORB unified model planned |

**Sections:** `my_drafts`, `my_records`, `my_documents`, `saved_templates`, `recently_generated`, `needs_review`, `finalised`, `archived`

### Communicate (`station=communicate`)

| Capability | Status | Implementation |
|------------|--------|----------------|
| Support-pack templates | Live | `orb_communicate_support_pack_service.py` |
| Easy-read / visual-card suggestions | Live | Frontend generator |
| Communication reflection records | Live | `orb_communicate_support_pack_record` |
| Launch nav visibility | Hidden | Feature flag required |

### Templates station (`station=templates`)

| Capability | Status |
|------------|--------|
| Full library search | Live |
| Taxonomy lifecycle browse | Live — `GET /templates/taxonomy` |
| Handoff to Write/Dictate | Live |
| Generate / export | Live |

## API endpoints (this pass)

```
GET /templates/taxonomy
GET /templates/taxonomy/lifecycle-groups
GET /templates/taxonomy/coverage
GET /templates/taxonomy/station-wiring
GET /templates/taxonomy/regulation-anchors
GET /templates/taxonomy/{template_id}
```

Query params: `lifecycle_group`, `station`, `regulation_anchor`, `search`, `include_enriched`

## Save destinations

| Destination | Use |
|-------------|-----|
| `records_drafts` | In-progress adult work |
| `records_final` | Reviewed care records |
| `documents` | Policy/plan documents |
| `handover` | Shift handover |
| `reports` | Reg 44/45, inspection evidence |
| `communicate_pack` | Communication support materials |
| `standalone_saved` | ORB saved outputs (no OS link) |

## Risks

- Registry drift between framework JSON mirrors remains a maintenance risk
- Chat/Voice save-to-records requires workspace persistence (not in this pass)
- Communicate must remain feature-flagged until governance sign-off
