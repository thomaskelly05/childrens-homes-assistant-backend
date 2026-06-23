# ORB Records & Documents Convergence Map

**Date:** 2026-06-23  
**Scope:** Audit of existing Records & Drafts / document systems and canonical workspace convergence plan.

## Executive summary

ORB Residential previously persisted “Records & Drafts” via **`orb_saved_outputs`** (mounted at `/saved-outputs/*` and `/orb/standalone/outputs/*`) with **browser localStorage fallback**. This pass introduces the **canonical server-backed Records Workspace** at `/orb/records-workspace/*` using `schemas/orb_records_workspace.py`, while keeping legacy saved outputs parallel for intelligence artefacts until full convergence.

**No second template registry** was created — all template search uses `services/orb_template_library_registry.py` + `services/orb_template_taxonomy_service.py`.

---

## Existing routes

### Mounted (live)

| Router | Prefix | Purpose |
|--------|--------|---------|
| `orb_saved_outputs_launch_routes` | `/saved-outputs/*` | Legacy ORB intelligence saved outputs |
| `orb_saved_output_routes` | `/orb/standalone/outputs/*` | Standalone alias for saved outputs |
| `orb_templates_launch_routes` | `/templates/*` | Canonical template library + taxonomy |
| `recording_draft_routes` | `/recording-drafts/*` | IndiCare OS operational recording drafts |
| `orb_records_workspace_launch_routes` | `/orb/records-workspace/*` | **NEW canonical workspace API** |

### Orphaned (not in `router_loader.py`)

| Router | Prefix | Status |
|--------|--------|--------|
| `workspace_records_routes` | `/workspace-records/*` | OS table lifecycle — **not mounted**; used internally via `WorkspaceRecordsService` |
| `document_library_routes` | `/documents/library/*` | Home-scoped policy library — **not mounted** |
| `universal_records_router` | `/api/universal-records/*` | Legacy universal search — **not mounted** |

---

## Duplicate systems

| System | Store | Role today | Convergence |
|--------|-------|------------|-------------|
| **ORB Records Workspace** | `orb_records_workspace` table / memory | Canonical adult drafts across stations | **Primary** |
| ORB saved outputs | `orb_saved_outputs` | Intelligence artefacts, legacy saves | Parallel — migrate listings to workspace |
| OS recording drafts | `recording_drafts` | Formal care records | Future submit target after adult review |
| Workspace records service | OS tables (`daily_notes`, `incidents`, …) | IndiCare OS operational records | Separate product surface |
| Document library | `documents` | Home policy documents | Separate from ORB workspace |
| localStorage (`orb-saved-outputs-local`) | Browser | Offline fallback for saved outputs | **Not canonical** for workspace |

---

## Current frontend save points (after this pass)

| Station | Save action | Destination |
|---------|-------------|-------------|
| **Chat** | Save to Records & Drafts | `POST /orb/records-workspace/items` (`source_station=chat`) |
| **Chat** | Turn this into a record | Workspace draft with resolved `template_id` / `category` |
| **Dictate** | Save transcript | Workspace (`source_station=dictate`) |
| **Voice** | Save as draft record | Workspace (`source_station=voice`) |
| **Write** | Template generate/export | Handoff — draft save via workspace when exported |
| **Records & Drafts panel** | List/open/edit/archive | `GET/PATCH/DELETE /orb/records-workspace/items` |
| **Communicate** | Save support pack | Workspace (`source_station=communicate`, `template_id=orb_communicate_support_pack_record`) — nav remains hidden unless feature flag |
| **Templates** | Search/browse | `GET /templates/taxonomy/search` etc. |

Confirmation copy: **“Saved to My Drafts”**

---

## Proposed canonical Records Workspace API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orb/records-workspace/items` | Create draft |
| GET | `/orb/records-workspace/items` | List (owner-scoped; manager oversight optional) |
| GET | `/orb/records-workspace/items/{id}` | Get item |
| PATCH | `/orb/records-workspace/items/{id}` | Update draft |
| DELETE | `/orb/records-workspace/items/{id}` | Archive (soft) |
| POST | `/orb/records-workspace/items/{id}/review` | Mark reviewed |
| POST | `/orb/records-workspace/items/{id}/finalise` | Adult finalisation (never automatic) |
| GET | `/orb/records-workspace/summary` | Counts by status/section/station |

### Item fields

`owner_user_id`, `home_id`, `organisation_id`, `child_id` (nullable), `source_station`, `category`, `template_id`, `title`, `body`, `status` (draft/reviewed/finalised/archived), `privacy_classification`, timestamps, `audit_trail`, `metadata`.

---

## Template search API (taxonomy)

| Method | Path |
|--------|------|
| GET | `/templates/taxonomy/search?q=` |
| GET | `/templates/taxonomy/by-station/{station_id}` |
| GET | `/templates/taxonomy/by-category/{category}` |
| GET | `/templates/taxonomy/{template_id}` |

Search matches title, description, lifecycle family, regulation anchors, station availability, and synonyms (missing, MFC, LADO, Reg 45, physical intervention, etc.).

---

## Migration / deprecation notes

1. **`orb_saved_outputs`** — Keep for intelligence output types (briefings, research, comparisons). New station saves should use workspace API.
2. **`workspace_records_routes`** — Remains unmounted; OS operational records are not ORB workspace. Document in router governance.
3. **`document_library_routes`** — Remains unmounted; home document library is separate.
4. **`universal_records_router`** — Deprecated candidate; do not wire without security review.
5. **localStorage** — Retained only for legacy saved-output resilience; workspace items are server-only.
6. **SQL migration** — Apply `sql/210_orb_records_workspace.sql` for PostgreSQL persistence.
7. **OS submission** — `recording_drafts` bridge remains planned; no automatic finalisation to OS.

---

## Privacy & safeguarding

- Workspace list is **owner-scoped** by default; management oversight roles may view others when explicitly enabled.
- Founder analytics must not expose workspace bodies — counts/categories only (`orb_founder_analytics_foundation_service`).
- Review-before-use disclaimer included on create; templates do not guarantee compliance.
- Source chips stored in metadata, stripped from visible body prose.

---

## Blockers remaining

- Full UI for 8 workspace sections (my_documents, saved_templates, etc.) — partial via status/section filters
- Bidirectional sync from legacy `orb_saved_outputs` into workspace sections
- OS `recording_drafts` submit bridge after finalisation
- Mount decision for `workspace_records_routes` / `document_library_routes` (likely remain OS-only)
