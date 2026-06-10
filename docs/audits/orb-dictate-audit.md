# ORB Dictate Audit (Phase 6)

**API:** `routers/orb_dictate_routes.py` (`/orb/dictate`)  
**UI:** `components/orb-standalone/orb-dictate-station.tsx`, `orb-dictate-studio.tsx`

---

## Pipeline

```
Record audio → POST /transcribe (or /transcribe/audio)
    → POST /analyze (brain + template awareness)
    → POST /prepare-write (handoff payload)
    → POST /finalise
    → POST /generate (document)
    → POST /save | POST /export
    → Optional: open in ORB Write (?station=orb_write)
```

Realtime path: `POST /realtime/session` for live dictation.

---

## Feature checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Recording flow | **Ready** | Browser MediaRecorder |
| Live transcript | **Ready** | Realtime session |
| Speaker separation | **Partial** | `test_orb_dictate_speaker.py` (7 tests) — present but not primary UX |
| Safeguarding prompts | **Ready** | Analysis includes framework checks |
| Missing information prompts | **Ready** | `missing_evidence_checks` from recording framework |
| Document generation | **Ready** | `/generate` endpoint |
| Template selection | **Ready** | `/templates`, recording framework |
| Editing workflow | **Ready** | `/edit` endpoint + studio UI |
| Export workflow | **Ready** | `/export` + Write handoff |
| Privacy/GDPR wording | **Ready** | Safety disclaimer on all outputs; session privacy tests |
| Child details storage | **Controlled** | Saved to user-scoped `orb_saved_outputs`; not in telemetry metadata |
| Mobile/tablet | **Ready** | `orb-dictate-mobile-experience.tsx` |
| Same ORB brain | **Yes** | `test_orb_dictate_brain_parity.py` (9 tests) |

---

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /templates` | Available dictate templates |
| `GET /recording-framework` | Full framework metadata |
| `POST /transcribe` | Text transcript processing |
| `POST /transcribe/audio` | Audio upload transcription |
| `POST /edit` | AI edit of transcript |
| `POST /analyze` | Brain analysis + gaps |
| `POST /prepare-write` | Write station handoff |
| `POST /finalise` | Lock transcript for generation |
| `POST /generate` | Produce document |
| `POST /save` | Persist note |
| `POST /export` | Export document |
| `GET/DELETE /notes/{id}` | Note CRUD |

---

## Assessment questions

### Could a support worker use this after a shift?

**Yes, with training.** The flow mirrors natural post-shift dictation: speak → see transcript → get professional document → export. Mobile layout supports tablet use on sofa/office. **Blockers:** mic permission, network required, must understand "draft not final record".

### Would a registered manager trust the output?

**Conditionally.** Framework-enforced sections (child voice, safeguarding, manager oversight) build trust. **Managers should not sign off without edit** — disclaimers are correct. Incident/missing types have strongest structure.

### Does it save real time?

**Yes** for workers who struggle with typing. Fast path for daily notes tested (`test_orb_daily_note_deterministic_fast_path.py`). Full analysis path slower but adds value.

### Is it safe enough for launch?

**Yes for pilot** with:
- Prominent draft disclaimers (present)
- Safeguarding analysis prompts (present)
- No auto-submission to statutory bodies (correct)
- Brain parity with chat (verified in tests)
- Session privacy (`test_orb_dictate_session_privacy.py`)

**Not yet for unsupervised launch** without:
- Live safeguarding scenario QA on generated outputs
- Clear retention/deletion policy in UI
- Provider policy alignment messaging

---

## Test coverage

| File | Tests |
|------|-------|
| `test_orb_dictate_routes.py` | 16 |
| `test_orb_dictate_write_routes.py` | 4 |
| `test_orb_dictate_finalise_handoff.py` | 2 |
| `test_orb_dictate_brain_parity.py` | 9 |
| `test_orb_dictate_brain_analysis.py` | 3 |
| `test_orb_dictate_template_aware_analysis.py` | 3 |
| `test_orb_dictate_speaker.py` | 7 |
| `test_orb_dictate_access.py` | 3 |
| `test_dictate_ai_governance.py` | present |
| E2E `e2e/orb-dictate.spec.ts` | present |

**Backend dictate tests pass in full suite context.** Strongest ORB surface after chat for launch readiness.

---

## Gaps

1. Speaker diarisation not primary — multi-staff debriefs harder
2. No offline record-and-sync
3. No direct MAR chart integration
4. Template picker overlap with Templates station — can confuse
5. Long audio timeout behaviour not audited live

---

## Verdict

**ORB Dictate is the strongest launch candidate** after chat. Pipeline is complete, brain-connected, well-tested, and mobile-aware. **Recommend as hero feature for pilot marketing.**
