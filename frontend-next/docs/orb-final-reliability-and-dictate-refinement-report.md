# ORB Final Reliability and Dictate Refinement Report

Sprint: ORB Residential Final Reliability and Dictate Refinement Pass.

## 1. Error audit

| Failure | Route / client | Root cause | Fix | Fallback |
|---------|----------------|------------|-----|----------|
| 401 on `/auth/me` | `auth-context` → `authFetch` | Expired or missing session cookie | Session gate marks auth degraded; stops dependent ORB API spam | Local profile + localStorage projects/drafts/outputs |
| 401 on `/orb/projects` | `orb-projects-client` | Same session issue | `fetchOrbProjectsResilient` + seed ID guards | `readOrbProjectsMemory` / workspace local projects |
| 500 on `/orb/projects/*` | `syncOrbProjectsToServer` | Server errors on PATCH/POST for seed/legacy IDs | Debounced sync; `isValidOrbProjectIdForApi` filter | Keep local projects visible; reconnect banner |
| 500 on `/orb/standalone/outputs/summary` | `standalone-client` | Backend saved-outputs unavailable | `fetchOrbSavedOutputsSummaryResilient` | Local saved outputs count from `orb-saved-outputs-local` |
| 500 on knowledge sources/summary | `standalone-client` | Knowledge API failure | Built-in `OrbKnowledgeBuiltinPanel` always shown on residential; soft error copy | Built-in residential library (Regs, SCCIF, safeguarding, etc.) |
| OAuth CORS/preflight | `OrbAuthButton` + Next `Link` | Client navigation/prefetch to external OAuth | `navigateOrbOAuthStart` via `window.location.assign` | Disabled provider = non-clickable button |
| Station reconnect while “signed in” | Station panels | APIs fail but cookies look valid | `OrbStationReconnectBanner` + session gate suppress | Local content + single reconnect message |
| Saved outputs empty with local data | `orb-saved-outputs-panel` | API error cleared list | `listOrbSavedOutputsResilient` merges local store | Show local items + intentional copy |

## 2. OAuth navigation fix

- `lib/orb/orb-oauth-navigation.ts` — full-page navigation only.
- `OrbAuthButton` uses button + `window.location.assign` for OAuth start URLs; `return_url` preserved from query (`%2Forb`).
- `prefetch={false}` on non-OAuth links.

## 3. Auth / session fallback

- `lib/orb/orb-session-gate.ts` — debounced suppress after 401/500.
- Wired from `auth-context` on `/auth/me` success/failure.
- Account modal `localContentMode` explains local ORB content until reconnect.

## 4. Projects fallback

- `lib/orb/orb-projects-resilience.ts` — resilient fetch, seed ID guards, debounced sync.
- `orb-care-companion` uses resilient fetch/sync.

## 5. Saved outputs fallback

- `lib/orb/orb-saved-outputs-local.ts` + `orb-saved-outputs-resilience.ts`.
- Panel shows local/mixed storage with reconnect banner.

## 6. Knowledge fallback

- Built-in resources extended (return home, supervision, Reg 44/45, complaints, restraint, equality, children's voice).
- Soft error message; built-ins always browsable on residential.

## 7. Summary fix

- Saved outputs summary uses resilient wrapper (no sidebar crash).
- Knowledge summary failure does not hide built-ins.

## 8. Find / replace

- `lib/orb/dictate/orb-dictate-find-replace.ts`
- `OrbDictateFindReplacePanel` in Studio — match count, replace all, match case, protect direct quotes.

## 9. Anonymise / replace names

- `lib/orb/dictate/orb-dictate-anonymise-preview.ts` — preview before apply; presets for young person, roles, initials.

## 10. Section-level diff highlighting

- `lib/orb/dictate/orb-dictate-diff.ts`
- Assistant preview shows changed sections (before/after) + Apply / Keep as suggestion / Cancel.

## 11. Tone lock

- `lib/orb/dictate/orb-dictate-tone-lock.ts` — persisted in draft metadata; edits include tone instruction.

## 12. Record readiness

- `lib/orb/dictate/orb-dictate-readiness.ts` — Not ready / Needs review / Good draft / Strong draft with reasons and disclaimer.

## 13. Draft reconnect sync

- `lib/orb/dictate/orb-dictate-draft-sync.ts` + `OrbDictateDraftSyncPrompt` — user-confirmed per-draft sync.

## 14. Autosave polish

- States: Saving…, Saved to ORB, Saved locally, Reconnect to sync, Save failed.
- Last saved time, Save now, version history unchanged.

## 15. Export polish

- `withDictateExportDraftNotice` includes readiness and tone lock metadata.

## 16. Modal / UI premium polish

- Softer account stat cards; local mode banner.
- Knowledge / saved outputs reconnect copy.

## 17. ORB Dictate viewport fix

- Modal `max-height` uses `100dvh` with safe areas; `orb-dictate-studio-scroll` + station body flex.

## 18. Playwright E2E

- `e2e/orb-dictate.spec.ts` — scaffold with `NEXT_PUBLIC_E2E_TEST_MODE=1`; full mocked flow documented as follow-up.

## 19. Tests / build

Run:

```bash
cd frontend-next && npm run test:orb && npm run typecheck && npm run build
cd .. && source .venv/bin/activate && python -m pytest tests/test_orb_dictate_routes.py tests/test_orb_dictate_speaker.py -q
```

## 20. Remaining non-blockers

- Full Playwright flow with mocked dictate generate/edit endpoints in CI.
- Server-side fix for persistent `/orb/projects` 500 on specific legacy IDs (client now guards).
- Optional: merge local + server saved outputs conflict UI (keep both) for edge sync cases.
