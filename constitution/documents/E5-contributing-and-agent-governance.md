# E5 — Contributing & Agent Governance

| Field | Value |
|---|---|
| Document ID | E5 |
| Layer | L3 — Engineering Principles |
| Version | 1.0 |
| Status | **Ratified — Version 1** |
| Ratified | 2026-06-26 (founder ratification) |
| Owner | Engineering Owner (Tom Kelly, interim) |
| Fills | The missing `CONTRIBUTING.md` referenced by `CLAUDE.md` (evidence E37) |
| Reads with | `CLAUDE.md`, `AGENTS.md` (referenced, not modified) |
| Evidence base | `constitution/phase-1-discovery/` |

This document governs how humans **and AI agents** contribute. It **fills the missing
`CONTRIBUTING.md`** reference (Phase 1 §14) and **references** `CLAUDE.md` and `AGENTS.md`
without modifying them.

---

## 1. Who this governs

- Human contributors.
- **AI coding agents.** This is not hypothetical: `CLAUDE.md` and `AGENTS.md` exist
  specifically to instruct AI agents. **VERIFIED** (both files read in Phase 1). This
  constitution and its documents are binding on agents too.

---

## 2. Contribution rules (VERIFIED — from CLAUDE.md / AGENTS.md)

- **Read before writing**; identify current route/state/API/data flow; state the assumption;
  make the smallest safe change (E1; `CLAUDE.md` "Working standard").
- **Do not break working `/orb` routes; chat is the front door** unless the founder changes
  it (`CLAUDE.md` non-negotiables).
- **No duplicate routes, stations, prompts, or state systems** (`CLAUDE.md`).
- **Test the thing changed and the nearest working flow** (E6).
- **Communicate back plainly:** what changed, why, what was tested, what was not, risks,
  whether anything working was touched. Do not say "complete" unless implemented and verified
  (`CLAUDE.md` "Communication back to Tom").

---

## 3. Branch, review, and release discipline

- Work on a feature branch; land via reviewed PR (release control governed by E3).
- Do **not** modify ratified constitutional documents, `CLAUDE.md`, or
  `ORB_ENGINEERING_PRINCIPLES.md` without an explicitly proposed, versioned, approved change
  (founder condition; C1 Article 8).
- Significant architectural/safeguarding decisions are recorded as ADRs (E4).

---

## 4. Agent-specific governance

- Agents must honour the constitutional hierarchy (00) and the binding charters (O4
  Safeguarding, O5 Privacy).
- Agents must not introduce AI behaviour that silently creates, edits, saves, sends, or
  escalates records without adult review (C1 Article 4; O4).
- Agents must use evidence labels and separate Current State from Future Vision when
  producing governance or documentation (C1 Article 7).
- **ORB supports reflection, recording and evidence gathering. Adults remain responsible for
  judgement, safeguarding escalation and final records** — agents do not change this line.

---

## 5. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| `CONTRIBUTING.md` missing (referenced by `CLAUDE.md`) | VERIFIED (E37) | This document fills it. |
| Test fixture fragility documented in AGENTS.md | VERIFIED | Some `test_*.py` are not pytest tests; governed by E6. |
| No enforced contribution gate in CI beyond ORB scenarios | VERIFIED (E34) | Governed by E6/E3. |

---

## 6. Current State vs Future Vision

**Current State (VERIFIED).** Strong contribution guidance for humans and agents exists in
`CLAUDE.md` and `AGENTS.md`, but the referenced `CONTRIBUTING.md` does not exist and there is
no enforced contribution gate beyond the ORB quality scenarios.

**Future Vision (NOT YET BUILT).** A complete contributor onboarding referencing this
constitution; enforced PR gates (E6); the constitution surfaced to agents at session start.

---

## 7. What this document does not claim
- It does **not** modify `CLAUDE.md`, `AGENTS.md`, or `ORB_ENGINEERING_PRINCIPLES.md`.
- It does **not** claim contribution rules are currently enforced by tooling.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 3) | Initial draft presented for founder review. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder. Any change requires an explicitly proposed, versioned, approved amendment. |
