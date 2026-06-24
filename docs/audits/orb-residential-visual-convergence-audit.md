# ORB Residential Visual Convergence Audit

**Date:** June 2026  
**Scope:** Chat, Dictate, Voice, ORB Write, Records & Drafts, shared sidebar/navigation, footer/safeguarding strips, mobile layouts.

## Executive summary

ORB Residential already has strong architecture: one shell, shared recording framework, converged handoffs and premium studio primitives. This pass converges **visual language, station copy and frontline UX clarity** without adding new brains, template systems or admin surfaces.

Chat remains the front door. Voice keeps its dark cinematic workspace. Dictate, Write and Records now share calm ORB station headers, chips, empty states and safeguarding language.

---

## What already feels premium

| Surface | Strengths |
|---------|-----------|
| **Chat / Home** | Calm empty state, luminous ORB card, simple composer, `What do you need help thinking through?`, safety line under composer |
| **Voice** | Cinematic dark workspace, persistent hero + live rail, clear adult-review labelling, audio-not-stored messaging |
| **Records & Drafts** | Clean list/detail split, filter chips, reconnect banner, studio empty state pattern |
| **Shared premium layer** | `OrbStudioHeader`, `OrbStudioEmptyState`, `OrbPremiumTrustStrip`, glass orb mark, residential shell CSS tokens |
| **Safeguarding** | Consolidated copy in `orb-residential-safety-copy.ts`, no compliance-guarantee hype |

---

## What feels generic or inconsistent (before pass)

| Issue | Where |
|-------|--------|
| Dictate read like a generic upload form | Dropdown record selector, `Other / General dictation`, weak hero hierarchy |
| ORB Write felt editor-heavy | Dominant toolbar, buried template entry, `General Dictation` label |
| Records empty state omitted Chat entry | Only Dictate / Write buttons; Communicate shown without feature flag |
| Station subtitles diverged | Write: "Care documentation studio"; Dictate: long technical subtitle |
| Sidebar active state weak | `activeNavId` not wired — stations did not feel equally “selected” |
| Voice post-call actions inconsistent labels | Mixed "Send to Dictate" / "Save to Records" wording |
| Footer copy fragmented | Records mentioned Communicate; Dictate safety strip not aligned |

---

## What feels too software-heavy

- ORB Write toolbar exposed all formatting at once (table, align, clear format)
- Dictate `Output type` grid with 8+ types before capture
- Records filter row on mobile competes with empty state
- Write header stacked record type + title + multiple panel toggles

**Mitigation:** "More formatting" collapse in Write; Dictate record types as 7 calm chips; primary actions promoted (Use a template, Use a template, Save draft, Review).

---

## Inconsistent wording (resolved targets)

| Context | Standard copy |
|---------|---------------|
| Chat | What do you need help thinking through? |
| Dictate | Speak naturally. ORB will structure your words for adult review. |
| Voice | Talk it through with ORB before you write. |
| ORB Write | Draft, review and finalise adult-led records in one calm workspace. |
| Records | Your saved drafts, records and working documents. |
| Footer | ORB supports professional judgement. Review before use and follow local safeguarding procedures. |

Avoid: **General Dictation**, AI-generated hype, compliance guarantee language.

---

## Station-specific UX issues addressed

### Chat
- Added 4 calm home quick actions (Write a record, Reflect on an incident, Find a template, Use home document)
- Slightly wider composer on desktop (`--orb-composer-dock-max: 52rem`)

### Dictate
- Station header + chip-based record types (Quick Record default)
- Recent captures empty state copy aligned
- Consent/safety strip: policy-appropriate recording reminder

### Voice
- Right rail contrast improved (glass panel on dark canvas)
- Tab spacing tightened
- Post-call actions: Create draft record, Open in ORB Write, Save to My Drafts, Summarise conversation, What may be missing?

### ORB Write
- **Use a template** primary chip
- Quick Record replaces General Dictation user-facing label
- Actionable ORB Review panel (child voice, observation/interpretation, follow-up, manager oversight, wording)
- Adult remains responsible for the final record

### Records & Drafts
- Empty: Start in Chat, Start in Dictate, Create in ORB Write
- Communicate hidden unless `NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE=1`
- Layout prepared for drafts / review / finalised filters (existing chips retained)

### Sidebar
- Active station highlighting via `activeNavId`
- ORB Write, Records, Dictate, Voice equally weighted in nav

---

## Recommended shared station design system

Implemented in `components/orb-residential/orb-residential-station-ui.tsx`:

| Primitive | Purpose |
|-----------|---------|
| `OrbResidentialStationHeader` | Title + subtitle + orb badge |
| `OrbResidentialStationBadge` | ORB identity / review badges |
| `OrbResidentialPrimaryActionCard` | Central capture / action surface |
| `OrbResidentialSecondaryActionChips` | Record types, quick actions |
| `OrbResidentialSafetyFooter` | Shared safeguarding strip |
| `OrbResidentialEmptyStateCard` | Records / captures empty states |
| `OrbResidentialReviewRequiredBadge` | Draft review status |
| `OrbResidentialSaveStatusBadge` | Save/sync status |
| `OrbResidentialSourceChip` | Source/guidance chips |
| `OrbResidentialTemplateActionChip` | Template/record type chips |
| `OrbResidentialStationPanel` | Light/dark station container |
| `OrbResidentialMobileStationLayout` | Mobile header/main/footer stack |

Copy source: `lib/orb/orb-residential-station-copy.ts`

Visual tokens: existing ORB residential shell CSS + luminous orb, soft gradients, premium rounded cards.

---

## DOM markers for verification

| Marker | Station |
|--------|---------|
| `data-orb-home-quick-action` | Chat home quick actions |
| `data-orb-residential-station-header` | Shared station headers |
| `data-orb-dictate-subtitle-header` | Dictate |
| `data-orb-write-use-template` | ORB Write |
| `data-orb-write-review-action` | Write review panel actions |
| `data-orb-saved-start-chat` | Records empty |
| `data-orb-voice-create-draft-record` | Voice post-call |
| `data-orb-residential-safety-footer` | Safety strips |
| `data-orb-sidebar-station` + `--active` class | Sidebar |

---

## Remaining blockers

- **Communicate** remains feature-flagged (`NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE=1`) — intentional
- **Records workspace tabs** (My Drafts / Needs Review / Finalised) need backend status grouping for full tab UX — layout/filter chips prepared
- **Backend framework JSON** mirror update recommended for `Quick Record` label parity
- **E2E visual screenshots** not captured in CI — rely on DOM marker tests

---

## Files changed (this pass)

- `lib/orb/orb-residential-station-copy.ts` (new)
- `components/orb-residential/orb-residential-station-ui.tsx` (new)
- `components/orb-residential/orb-residential-visual-convergence.test.ts` (new)
- Copy: `orb-user-facing-names.ts`, `orb-residential-stations.ts`, `orb-residential-copy.ts`, `orb-dictate-capture-copy.ts`, `orb-recording-framework.json`
- Stations: Dictate template selector, Write panel/checklist/toolbar, Voice station, Saved outputs, Sidebar, Care companion
- CSS: `app/orb/orb-residential-shell.css`
