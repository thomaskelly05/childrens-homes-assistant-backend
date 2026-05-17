# IndiCare Connect + Identity Experience Audit

## Scope

Audited the FastAPI backend, legacy frontend, and Next.js frontend for identity, profile, notifications, handover, dashboard, child profile, and messaging surfaces.

## Schema-backed today

- Authentication/session identity is live through `/auth/me` and `/account/me`.
- Account profile preferences are stored in `user_profile_preferences`.
- Shift handover has live operational routes at `/handover/current` and `/handover/history` when `os_shift_sessions` and related tables exist.
- Legacy notifications use a `notifications` table via `/notifications`.
- Young person overview pages read live OS APIs and show empty states when records are missing.
- New sprint foundation adds auto-run tables for `connect_threads`, `connect_thread_members`, `connect_messages`, `connect_message_reads`, `connect_notifications`, `handover_entries`, and `user_dashboard_preferences`.

## Static/demo content found

- `frontend-next/lib/indicare/demo-data.ts` contains static children, staff, notifications, incidents, logs, reports and audit records.
- `frontend-next/lib/operations/shift-data.ts` used static staff, children, incidents and handover content on staff workspace paths.
- `frontend-next/app/staff/me/page.tsx` and `frontend-next/app/staff/me/recording/page.tsx` used the hardcoded staff id `staff-abi`.
- `frontend-next/app/login/page.tsx` prefilled demo credentials and displayed demo-user guidance.
- `frontend-next/components/notification-centre.tsx` contains hardcoded notification cards.
- `frontend-next/components/indicare/reporting-foundation.tsx` listed static children in a live report form.

## Profile data that exists

- Users: `id`, `email`, `role`, `home_id`, `provider_id`, `first_name`, `last_name`, active/archive fields where available.
- Account profile preferences: display name, phone, profile image data URL, theme/accent, assistant preferences, compact mode, email notification preference and notes.
- Staff profile service aggregates optional lifecycle, supervision, probation, induction, appraisal, exit and academy data when tables exist.
- Child overview maps preferred name, age, risk, key worker, placement status, legal status and care-planning fields when returned by OS APIs.

## Profile data still missing or optional

- Adult profile: about me, professional strengths, therapeutic approach, availability/status, pinned documents/templates and assigned children need consistent persisted columns or profile-extension storage.
- Child profile: what matters to me, what helps, communication style, sensory needs, important people, interests and current safety context are only shown when returned by live APIs.
- Avatar/photo storage is local-file/data-URL based; longer term object storage with metadata stripping and checksum storage is safer.

## Messaging and notification tables

- Existing legacy Connect migration used `connect_channels`; sprint routes use the requested thread/message tables.
- Existing `/notifications` route reads `notifications`; sprint routes expose `/api/notifications` backed by `connect_notifications`.
- New Connect message writes create user-specific `connect_notifications` for thread members.

## Handover tables

- Existing operational handover uses shift/session tables through `ShiftRepository`.
- Sprint migration adds `handover_entries` for a minimal schema-backed “Today’s Handover” when shift tables are absent or not yet populated.

## Migration needs

- Auto-run migration `backend/db/migrations/20260517_identity_connect.sql` installs Connect, notifications, handover entries and dashboard preferences.
- Existing manual migrations under `migrations/` are not auto-run by the startup migration runner.
- Adult/child profile extension fields need a follow-up migration once the exact field ownership model is agreed.

## Safe to demo

- Authentication, profile empty states, Connect empty inbox, notification empty queue, dashboard preference defaults, and today/handover empty summaries are safe because they do not fabricate operational content.
- Real Connect messages are safe to demo only after creating live threads/messages as an authenticated user within the correct provider/home scope.

## Not safe to demo on live routes

- Static staff/child names from `indicareData`.
- Fake handover cards and notification cards.
- Prefilled demo login credentials.
- Hardcoded adult ids such as `staff-abi`.
