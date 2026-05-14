# IndiCare OS button/link audit

Last updated: 2026-05-14

This is the working product-readiness record for visible click targets. Status values:

- Fixed: verified or patched in this sprint.
- Controlled limitation: interactive element explains what is unavailable and confirms no data was written.
- Requires manual QA: route exists, but full workflow must be checked with a running backend/demo tenant.

| Page | Element | Expected action | Current status | Route/API | Fixed | Remaining limitation |
| --- | --- | --- | --- | --- | --- | --- |
| `/login` | Sign in | Authenticate and redirect to `/home` or MFA route | Requires manual QA | `/auth/login`, `/mfa`, `/mfa-setup` | Yes | MFA page is backend-served. |
| `/home` | Child selector cards | Open selected child journey | Fixed | `/young-people/[id]/journey` | Yes | Live child ids required for persistence. |
| `/home` | Current shift CTA | Open shift workspace | Fixed | `/shifts/current` | Yes | None known. |
| Shell sidebar | Primary/recording links | Navigate to existing app routes | Fixed | `/home`, `/chronology`, `/actions`, `/reports`, `/documents`, `/assistant`, recording routes | Yes | Role gates determine visibility. |
| Shell sidebar | Home setup | Open onboarding route | Fixed | `/setup` | Yes | Foundation-level, no live write endpoint yet. |
| Shell header | Notifications | Open notifications | Fixed | `/notifications` | Yes | Notification count uses demo adapter until backend hook replaces it. |
| Mobile nav | Quick actions | Open child-linked recording workflows | Fixed | `/young-people/[id]/[workflow]/new` | Yes | Numeric backend ids required for live save. |
| Mobile nav | Bottom nav | Navigate between core workspaces | Fixed | `/home`, `/shifts/current`, `/young-people`, `/safeguarding`, `/assistant` | Yes | None known. |
| `/young-people/[id]/journey` | Add Daily Note | Open child-linked daily note form | Fixed | `/young-people/[id]/daily-note/new` | Yes | Demo string ids save as local drafts. |
| `/young-people/[id]/journey` | Recording cards | Open matching workflow | Fixed | `/young-people/[id]/[workflow]/new`, document upload mode | Yes | Backend support varies by workflow. |
| `/young-people/[id]/journey` | Timeline/source links | Open source record or chronology | Requires manual QA | `/chronology/[id]`, `/daily-logs/[id]`, etc. | Yes | Source may be unavailable for fallback/demo rows. |
| `/young-people/[id]/[workflow]/new` | Save record | Post to backend or show explicit local draft failure | Fixed | `frontend-next/app/api/recording/route.ts` | Yes | Demo child ids cannot write live records. |
| `/young-people/[id]/[workflow]/new` | Orb draft/wording/suggestion buttons | Modify form text or show notice only | Fixed | Client-side form actions | Yes | No silent record writes. |
| `/daily-logs` | Record links | Open daily note record | Requires manual QA | `/daily-logs/[id]` | Yes | Depends on live/fallback data projection. |
| `/incidents` | Record links | Open incident record | Requires manual QA | `/incidents/[id]` | Yes | Depends on live/fallback data projection. |
| `/safeguarding` | Record links/escalations | Open safeguarding workspace | Requires manual QA | `/safeguarding/[id]`, `/safeguarding/escalations` | Yes | Escalation writeback is backend-dependent. |
| `/risk-assessments` | Risk links | Open risk assessment | Requires manual QA | `/risk-assessments/[id]` | Yes | None known. |
| `/medication` | Medication links | Open medication/health record | Requires manual QA | `/medication/[id]` | Yes | None known. |
| `/keywork` | Keywork links | Open keywork session | Requires manual QA | `/keywork/[id]` | Yes | None known. |
| `/appointments` | Appointment links | Open appointment | Requires manual QA | `/appointments/[id]` | Yes | None known. |
| `/chronology` | Event chips/cards | Open chronology event/source | Requires manual QA | `/chronology/[id]` | Yes | Missing source shows improved not-found recovery. |
| `/actions` | Action cards | Open action detail | Requires manual QA | `/actions/[id]` | Yes | Live completion workflow depends on backend. |
| `/evidence` | Evidence cards | Open evidence detail | Requires manual QA | `/evidence/[id]` | Yes | None known. |
| `/documents` | Document cards | Open document detail | Requires manual QA | `/documents/[id]`, `/documents/regulatory` | Yes | File upload endpoints may be controlled limitations. |
| `/documents/regulatory` | Regulatory document links | Open regulatory document/detail routes | Requires manual QA | `/documents/regulatory/*` | Yes | None known. |
| `/reports` | Template cards | Change draft preview | Fixed | Client-side report generator | Yes | Draft text remains review-required. |
| `/reports` | Export controls | Show controlled limitation, no false success | Fixed | Client-side limitation notice | Yes | PDF/Word/email/save exports not enabled in demo UI. |
| `/reports` | Report links | Open report detail | Requires manual QA | `/reports/[id]`, `/reports/lac-review/[id]`, `/reports/reg45/[id]` | Yes | Depends on seeded/live reports. |
| `/regulatory` | Framework cards | Open regulatory mapping/detail | Requires manual QA | `/regulatory/[id]` | Yes | None known. |
| `/ofsted-readiness` | Readiness links/cards | Navigate to reports/evidence/actions | Requires manual QA | Existing readiness routes | Yes | Evidence completeness depends on seeded/live data. |
| `/shifts/current` | Shift actions | Navigate to handover/actions/records | Requires manual QA | `/handover/current`, `/actions`, record routes | Yes | Backend shift state may be demo-only. |
| `/handover/current` | Handover actions | Open current handover/action routes | Requires manual QA | `/handover/current`, `/actions/[id]` | Yes | Live handover writeback depends on backend. |
| `/notifications` | Notification links | Open linked record | Requires manual QA | Linked record routes | Yes | Fallback notifications may link to demo rows. |
| `/assistant` | Send/voice/interruption | Query assistant or show graceful state | Requires manual QA | Assistant client/runtime APIs | Yes | Attachments and voice previews are explicit limitations. |
| Orb UI | Floating Orb button | Open Orb, captions, fallback text and unavailable state | Requires manual QA | `/orb/*` | Yes | Realtime provider needs env configuration. |
| `/settings` | Orb/settings/setup links | Open settings subroutes | Fixed | `/settings/orb`, `/setup`, `/staff` | Yes | Live admin writes not enabled. |
| `/setup` | Setup wizard links | Navigate setup/supporting workspaces | Fixed | `/home`, `/settings`, `/staff`, `/documents/regulatory`, `/ofsted-readiness`, `/settings/orb` | Yes | Wizard records are informational until onboarding API exists. |
| `/staff` | Role controls | Show controlled limitation for invite/change/deactivate/MFA | Fixed | Client-side notice | Yes | Admin staff endpoint required for writes. |
| Not-found | Recovery links | Explain missing/archived/unauthorized route and recover | Fixed | `/`, `/chronology` | Yes | Does not reveal protected record existence. |

## Route sanity

Run the route sanity check from `frontend-next`:

`npm run route:audit`

The script verifies literal internal links against App Router pages and fails on unresolved literal hrefs.
