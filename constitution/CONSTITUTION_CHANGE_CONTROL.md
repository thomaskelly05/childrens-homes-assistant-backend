# Constitution Change Control

| Field | Value |
|---|---|
| Document ID | CC |
| Layer | Cross-cutting (governs changes to all constitutional documents) |
| Version | 1.0 |
| Status | **Ratified — Version 1** |
| Ratified | 2026-06-26 (founder ratification) |
| Owner | Founder (Tom Kelly, interim) |
| Authority | The governing process for all future constitutional amendments, versioning, urgent safety amendments, founder ratification, and future delegated authority. |
| Reads with | `README.md`, `documents/00-constitutional-hierarchy.md`, `documents/C1` (Article 9) |

This document defines **how the IndiCare Intelligence Constitution may be changed**. Its
purpose is to preserve history and **prevent silent edits to ratified governance**. It makes
no claim of guaranteed compliance, safety, or security; it defines a process.

---

## 1. Principles of change

1. **No silent edits.** A ratified document is never edited in place without a recorded,
   versioned amendment. Every change leaves a trail in the document's version history.
2. **Truthfulness first.** Change control serves truthfulness (value-rank #4): the record of
   *what changed, when, why, and by whose authority* must be accurate.
3. **The hierarchy holds during change.** A change to a lower-tier document may never
   contradict a higher-tier document (see `00`); if it would, the higher tier must be amended
   first or the change is refused.
4. **Binding charters are protected.** Changes touching Safeguarding (O4) or Data Protection &
   Privacy (O5) carry the highest scrutiny (see §5).

---

## 2. Document states and versioning

- **Draft (0.x)** — `Drafted — awaiting founder review. Not yet ratified.`
- **Ratified (1.0)** — `Ratified — Version 1`, with a ratification date.
- **Amendment (1.1, 1.2, …)** — a *minor* versioned change to a ratified document that
  corrects, clarifies, or cross-references **without changing substance**. Marked
  `Ratified — Version 1.x` with a reason in the version history.
- **Major revision (2.0, …)** — a *substantive* change to a ratified document's meaning or
  obligations. Requires a fresh ratification decision (§4).

Every document carries a **Version history** table; every state change adds a row with
version, date, status, and notes.

---

## 3. Amendment proposals

A change begins as a proposal that states:

1. **Which document(s)** and section(s) are affected.
2. **What changes** and **why** (the problem or inconsistency being resolved).
3. **Substance vs consistency** — whether it is a minor amendment (1.x) or a major revision
   (2.0). Consistency amendments (typos, cross-references, correcting stale facts to match a
   later founder decision) are minor; changes to obligations are major.
4. **Hierarchy check** — confirmation it does not contradict a higher tier.
5. **Evidence** — labels for any new factual claim (VERIFIED / DERIVED / INFERRED / FUTURE
   VISION / UNVERIFIED / OUT OF SCOPE).

*Example already applied:* the v1.1 consistency amendment to C1, O4, O5 (2026-06-26) corrected
stale Data Protection wording and added the canonical NR-1 cross-reference — a minor amendment,
no substance changed.

---

## 4. Ratification authority

- **Current state (VERIFIED — founder decision, 2026-06-26).** The **Founder (Tom Kelly,
  interim)** is the sole ratifier of constitutional documents and amendments. This
  concentration is a recorded bus-factor/independence risk (O2 §5).
- A draft becomes ratified, or an amendment takes effect, **only** on explicit founder
  approval, recorded in the document's version history.
- Ratification of a change does **not** resolve any open risk it documents (e.g. ratifying a
  document that carries NR-1 does not close NR-1).

---

## 5. Urgent safety amendments

Where a change is needed to protect a child, prevent a safeguarding or privacy harm, or close
an active security exposure:

1. The change may be **expedited** — proposed and ratified in a single step by the Founder
   (or, in future, the relevant binding-charter owner under delegated authority, §6).
2. It is **still recorded** — no expedited change skips the version-history trail.
3. It must be **reviewed after the fact** within a reasonable period to confirm the expedited
   change was correct and complete.
4. Safety (value-rank #1–#2) and privacy (#5) justify expedition; commercial pressure (#9) or
   speed (#10) never do.

---

## 6. Future delegated authority (FUTURE VISION — not yet in effect)

Today all ratification authority sits with the Founder. As the governance roles in O2 are
filled, authority may be delegated so that:

- the **Safeguarding Lead** (once appointed) ratifies or co-signs changes to O4 and
  safeguarding-relevant content;
- an **independent/external DPO function** (once established) ratifies or co-signs changes to
  O5 and privacy-relevant content;
- the **Engineering / AI Safety / Release owners** co-sign changes within their layers.

This delegation is **not yet in effect** — it is recorded as the intended direction so that
independence can replace concentration over time (O2 §5–§6).

---

## 7. Protected and out-of-scope files

- `CLAUDE.md` and `ORB_ENGINEERING_PRINCIPLES.md` are **referenced, not modified** by the
  Constitution. Any change to them must be a **separate, versioned proposal** presented for
  founder review — never an inline edit made as part of constitutional work.
- **Code is never changed by a constitutional amendment.** Where the Constitution identifies a
  needed code change (e.g. NR-1 remediation), that is a separate engineering change proposal
  governed by E1/E3/E6 — not part of the document amendment.

---

## 8. Record-keeping

- The authoritative history of each document is its **version history table**.
- Cross-document changes (like the v1.1 consistency amendment) should be traceable from each
  affected document and, where relevant, summarised in the commit message.
- `README.md` reflects the current version of each document and the status of open named risks.

---

## Current State vs Future Vision

**Current State.** Change control operates through per-document version history, the founder as
sole ratifier, and the rule that ratified documents and the two protected files are not edited
silently. The v1.1 consistency amendment is the first worked example.

**Future Vision (NOT YET BUILT).** Delegated ratification as governance roles are filled (§6);
possibly a lightweight tooling check that flags edits to ratified documents lacking a new
version-history row.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 1.0 (draft) | 2026-06-26 | Drafted — awaiting founder review | Initial change-control document created during limited finalisation; defines amendment, versioning, ratification, urgent safety changes, future delegated authority, and protection of ratified governance and the two referenced files. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder as the governing process for future constitutional amendments, versioning, urgent safety amendments, founder ratification, and future delegated authority. Any change requires an explicitly proposed, versioned, approved amendment. |
