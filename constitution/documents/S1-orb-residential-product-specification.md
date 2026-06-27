# S1 — ORB Residential Product Specification

| Field | Value |
|---|---|
| Document ID | S1 |
| Layer | L6 — Product Specifications |
| Version | 1.0 |
| Status | **Ratified — Version 1 (Named Risk NR-1 caveat remains OPEN)** |
| Ratified | 2026-06-26 (founder ratification; NR-1 caveat remains open — see §4. Surface inventory remains existence-only until behaviour is verified via E6.) |
| Owner | Product Owner (Tom Kelly, interim) |
| Inherits | C1, 00, O1–O5, E1–E6, A1–A2, P1 (all higher layers) |
| Evidence base | `constitution/phase-1-discovery/` |

ORB Residential is the **first product** governed by the IndiCare Intelligence Constitution.
This specification inherits every higher-layer standard and charter. It is deliberately honest
about the difference between **surfaces that exist in the codebase** and **behaviour/quality
verified in discovery** — most features are VERIFIED to *exist* (routers/services are present)
but their depth was not exercised (no code run in discovery, E49).

**ORB supports reflection, recording and evidence gathering. Adults remain responsible for
judgement, safeguarding escalation and final records.**

---

## 1. What ORB Residential is

A standalone ORB Care Companion plus OS-linked surfaces that help adults in residential
children's homes think, write, record, evidence, and reflect. **VERIFIED** (existence) — the
`assistant_orb` router group and 34 `routers/orb_*.py` modules (evidence E21–E22); standalone
identity grounded in the Ofsted Quality Standards and care values
(`assistant/prompts.py`, E54–E55).

---

## 2. Surfaces (VERIFIED existence; behaviour depth UNVERIFIED)

Present as routers/services in the repository (Phase 1 read the loader and one router, not all
bodies — so existence is VERIFIED, behaviour is INFERRED/UNVERIFIED):

- **Chat (front door)** — standalone + embedded (`orb_standalone_routes`, `assistant_routes`).
- **Documents & knowledge** — `orb_document_routes`, `orb_knowledge_routes`,
  `orb_home_documents_routes`.
- **Records workspace & templates** — `orb_records_workspace_launch_routes`,
  `orb_template_routes`, `orb_templates_launch_routes`.
- **Shift builder & handover** — `orb_shift_builder_routes`.
- **Saved outputs & projects** — `orb_saved_output_routes`, `orb_projects_routes`.
- **Voice & Dictate** — `orb_voice_*`, `orb_dictate_routes`, `orb_communicate_routes`.
- **Billing & pilot** — `orb_billing_routes`, `orb_pilot_routes`.
- **Privacy, quality lab, evaluation** — `orb_privacy_routes`, `orb_quality_lab_routes`,
  `orb_evaluation_platform_routes`.

**Honest limit:** this is a surface inventory, not a verified feature-quality statement.

---

## 3. Standalone vs embedded boundary (VERIFIED — binding)

The standalone assistant must **not** access live OS child records; only the embedded OS
assistant uses scoped operational context. **VERIFIED** — `docs/ai-safety.md` (E32); guarded by
`OrbResidentialGuardMiddleware`. This is a safeguarding and privacy boundary (O4, O5).

---

## 4. AI, Voice, and Dictate — with Named Risk NR-1 visible (binding)

Per P1 §6 and A2 Named Risk NR-1, ORB Residential's AI claims are constrained:

- **ORB Chat** — the primary chat path is **governed** (privacy decision, redaction, usage)
  via `assistant/llm_provider.py` `stream_chat` and `ai_external_call_governance` (A1, A2).
- **ORB Dictate (speech-to-text)** — the transcription call in
  `services/ai_external_call_governance.py:384` is **governed** (redacts inputs). Whether
  *every* dictate flow routes through it was **not** separately verified (UNVERIFIED).
- **ORB Voice (TTS)** — **Named Risk NR-1 applies directly.** `services/orb_voice_tts_service.py:354`
  uses a **raw OpenAI client** and sends `input=text` with **no** governance call visible. This
  is a **direct egress path that requires specific attention before any live use involving real
  child, staff, home, or safeguarding information** (founder position, 2026-06-26).

**Binding claim constraint:** ORB Residential must **not** claim that all its AI egress is
governed until NR-1 is fixed or formally re-verified (A2; E6 §4a). Marketing, in-product copy,
and pilot materials must respect this.

---

## 5. Commercial (O3)

Billing/subscription surfaces exist (`orb_billing_routes`, `db/orb_subscription_db.py`,
`db/orb_usage_commercial_db.py`, Stripe). **VERIFIED** (existence). Pricing must be affordable
for children's homes; commercial sustainability (value-rank #9) never overrides safeguarding,
privacy, or truthfulness (O3).

---

## 6. Inherited binding charters

- **Safeguarding (O4):** ORB never makes safeguarding decisions; surfaces urgency; keeps the
  adult responsible; banned determinations enforced in prompts (A1 §2).
- **Privacy (O5):** typed data classification, redaction before external AI, no identifiable
  data in logs; the standalone surface is record-isolated.

---

## 7. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| AI egress not fully governed (Named Risk NR-1) | OPEN — high-priority pre-launch | ORB Voice TTS direct path; adapter path uneven (A2). |
| Feature behaviour/quality not verified in discovery | UNVERIFIED (E49) | Surfaces exist; depth not exercised. |
| Memory tenancy/retention unverified | UNVERIFIED | A2 §5. |
| Per-router auth enforcement unverified | UNVERIFIED | E2 S2 (Q4/A6). |

---

## 8. Current State vs Future Vision

**Current State (VERIFIED existence / UNVERIFIED depth).** ORB Residential has a broad set of
implemented surfaces (chat, documents, records, shift, voice, dictate, billing, quality).
Its governed chat path is real; ORB Voice TTS is a direct egress under NR-1; feature quality was
not exercised in discovery.

**Future Vision (NOT YET BUILT).** NR-1 closed so AI/Voice/Dictate claims can be made; verified
feature quality via the E6 gate; an independent Product Owner; LifeEcho and future products
specified beneath the same standards.

---

## 9. What this specification does not claim
- It does **not** claim guaranteed compliance, safety, security, or automated safeguarding.
- It does **not** claim all AI egress is governed (NR-1).
- It does **not** assert feature behaviour or quality beyond the existence of surfaces.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 4) | Initial draft presented for founder review. NR-1 kept visible across AI/Voice/Dictate claims. |
| 1.0 | 2026-06-26 | **Ratified — Version 1 (NR-1 caveat OPEN)** | Ratified by the Founder. Surface inventory remains existence-only until behaviour is verified via E6. ORB Voice TTS remains constrained by NR-1 and must not be used in live provider contexts involving real child/staff/home/safeguarding information until the egress risk is fixed or formally justified. Any change requires an explicitly proposed, versioned, approved amendment. |
