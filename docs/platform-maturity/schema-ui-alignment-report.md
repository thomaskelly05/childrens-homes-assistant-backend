# Schema to UI Alignment Report

Date: 2026-05-17
Source reviewed: uploaded TablePlus SQL export `indic.sql`
Scope: aligning the current PostgreSQL schema with the personalised IndiCare UI, Connect, profiles, recording, reporting, chronology and inspection/evidence experience.

---

# Executive summary

The current schema is not a small demo database. It already contains a substantial operational model for residential children’s homes.

The schema includes strong foundations for:

- users and staff;
- homes and providers;
- young people;
- young person identity profiles;
- young person photos;
- daily notes;
- incidents;
- safeguarding records;
- missing episodes;
- risk assessments;
- placement plans;
- support plans;
- behaviour support plans;
- chronology events;
- handovers;
- notifications;
- documents;
- therapeutic form templates;
- Reg 44 actions;
- Reg 45 actions;
- inspection evidence and readiness.

This means the next UI should NOT be built as a mock personalised interface.

It should be wired to the existing schema wherever possible.

The key product direction is now:

> use the schema as the operational truth layer, then build a premium personalised UI on top of it.

---

# Core schema-backed UI opportunities

## 1. Adult identity and personalised workspace

Relevant tables already exist:

- `users`
- `staff`
- `staff_home_assignments`
- `staff_shifts`
- `staff_training_records`
- `staff_supervisions`
- `staff_wellbeing_checkins`
- `staff_documents`
- `user_profile_preferences`

### Existing useful fields

`users` already includes:

- `id`
- `email`
- `role`
- `home_id`
- `provider_id`
- `first_name`
- `last_name`
- `staff_profile_id`

`staff` already includes:

- `full_name`
- `role`
- `home_id`
- `provider_id`
- `email`
- `employment_status`
- `line_manager_user_id`
- `line_manager_staff_id`

`user_profile_preferences` already includes:

- `display_name`
- `phone`
- `profile_image_data`
- `theme`
- `accent_color`
- `assistant_default_mode`
- `assistant_tone`
- `compact_mode`
- `email_notifications`
- `notes`

### UI alignment

The adult profile should use these fields immediately to show:

- profile image;
- display/preferred name;
- role;
- home;
- provider;
- contact details;
- assistant preferences;
- dashboard preferences;
- recent operational work.

### Gaps to add or extend

For the Apple/Facebook-like adult profile experience, add or extend support for:

- professional bio/about me;
- therapeutic strengths;
- communication preferences;
- favourite children;
- pinned templates;
- quick actions;
- dashboard widget order;
- dashboard pinned widgets;
- preferred operational focus.

These can be stored initially in profile/dashboard preference JSON fields, but should eventually be typed if heavily used.

---

## 2. Child identity and person-first profile

Relevant tables already exist:

- `young_people`
- `young_person_identity_profile`
- `young_person_communication_profile`
- `young_person_contacts`
- `young_person_photos`
- `young_person_formulations`
- `young_person_health_profile`
- `young_person_education_profile`
- `young_person_all_about_me`

### Existing useful fields

`young_people` already includes:

- `first_name`
- `last_name`
- `preferred_name`
- `date_of_birth`
- `gender`
- `ethnicity`
- `admission_date`
- `placement_status`
- `primary_keyworker_id`
- `summary_risk_level`
- `photo_url`
- `profile_photo_path`
- `profile_photo_updated_at`
- `profile_photo_uploaded_by`
- `provider_id`
- `home_id`

`young_person_identity_profile` already includes:

- `religion_or_faith`
- `cultural_identity`
- `first_language`
- `dietary_needs`
- `interests`
- `strengths_summary`
- `what_matters_to_me`
- `important_dates`
- `identity_documents_summary`
- `aspirations`
- `community_links`

`young_person_photos` already includes:

- `storage_path`
- `original_filename`
- `mime_type`
- `file_size_bytes`
- `uploaded_by`
- `is_active`
- `provider_id`

### UI alignment

The child profile should be schema-backed using these fields.

Above the fold should show:

- profile image;
- preferred name;
- age;
- home;
- placement status;
- key worker;
- what matters to me;
- interests;
- strengths;
- aspirations;
- cultural/religious identity where appropriate;
- first language;
- dietary needs;
- current safety context.

### Gaps to add or extend

For the full person-first profile experience, add or expose:

- what helps me;
- what does not help;
- communication style;
- sensory needs;
- routines;
- important relationships;
- favourite activities;
- child voice summary.

Some of this may already sit in `young_person_communication_profile`, `young_person_all_about_me`, or formulations. The UI should aggregate them into one calm person-first profile rather than requiring staff to know which table stores which detail.

---

## 3. Handover and welcome experience

Relevant tables already exist:

- `handovers`
- `handover_records`
- `handover_items`
- `shift_handover_entries`
- `home_shift_logs`
- `home_shift_priorities`
- `home_announcements`

### Existing useful fields

`handover` includes:

- `home_id`
- `staff_id`
- `environment`
- `incidents`
- `staff_wellbeing`
- `operational_notes`
- `provider_id`
- `handover_date`
- `shift_type`
- `handover_status`
- `approved_by_user_id`

`handover_items` includes:

- `provider_id`
- `handover_record_id`
- `young_person_id`
- `priority`
- `title`
- `summary`
- `action_required`
- `action_owner_user_id`
- `due_date`

`shift_handover_entries` includes:

- `provider_id`
- `home_id`
- `young_person_id`
- `handover_date`
- `shift_from`
- `shift_to`
- `category`
- `title`
- `detail`
- `priority`
- `read_required`
- `read_at`
- `read_by_user_id`
- `created_by_user_id`

### UI alignment

The welcome modal should be powered by these tables.

It should show:

- welcome back adult name;
- home name;
- current shift/date;
- urgent handover items;
- children needing attention;
- unread required handover entries;
- unresolved actions;
- safeguarding/missing follow-up where linked.

### Important design rule

The welcome experience must not invent handover content.

If no handover exists, show:

> No handover has been recorded for this shift yet.

Then offer:

- create handover;
- open Connect;
- view home overview.

---

## 4. Notifications

Relevant tables already exist:

- `notifications`
- `operational_notifications`
- `notifications_centre`
- `home_notifications`
- `notification_queue`
- `compliance_notifications`

### Existing useful fields

`notifications` includes:

- `provider_id`
- `home_id`
- `young_person_id`
- `staff_id`
- `user_id`
- `notification_type`
- `severity`
- `title`
- `message`
- `source_table`
- `source_id`
- `read_at`
- `dismissed_at`
- `due_date`
- `status`

`operational_notifications` includes:

- `provider_id`
- `home_id`
- `young_person_id`
- `staff_id`
- `notification_type`
- `title`
- `message`
- `severity`
- `status`
- `assigned_to_user_id`
- `acknowledged_at`
- `resolved_at`

### UI alignment

The notification bell and notification page should use the schema-backed notification tables.

Notifications should support:

- unread count;
- severity;
- linked child;
- linked source record;
- mark read;
- dismiss;
- open linked item.

Avoid fake notification badges.

---

## 5. Connect / internal communication

The uploaded schema already has generic `messages`, but that table appears tied to AI/conversations rather than home/team operational messaging.

There are also handover and notification tables that support staff communication indirectly.

The newer repo migration for `connect_threads`, `connect_thread_members`, `connect_messages`, `connect_message_reads`, and `connect_notifications` is the right direction for IndiCare Connect.

### UI alignment

IndiCare Connect should be schema-backed using the new Connect tables, not fake messages.

It should support:

- home channel;
- direct messages;
- group threads;
- unread counts;
- notifications;
- linking messages to child/record;
- provider/home scoping.

### Important rule

Do not reuse AI `messages` as staff messaging unless carefully separated.

Staff communication and AI conversation history must remain distinct.

---

## 6. Daily notes and recording experience

Relevant tables already exist:

- `daily_notes`
- `daily_notes_versions`
- `chronology_events`
- `record_workflow_events`
- `record_ai_reviews`

### Existing useful fields

`daily_notes` includes:

- `young_person_id`
- `home_id`
- `note_date`
- `shift_type`
- `mood`
- `presentation`
- `activities`
- `education_update`
- `health_update`
- `family_update`
- `behaviour_update`
- `young_person_voice`
- `positives`
- `actions_required`
- `significance`
- `author_id`
- `workflow_status`
- `manager_review_comment`
- `approved_by`
- `approved_at`
- `returned_at`

### UI alignment

Daily notes are one of the strongest schema-backed workflows.

The UI should emphasise:

- calm recording;
- child voice;
- positives;
- presentation;
- actions required;
- chronology impact;
- manager review status.

The dashboard should surface daily note follow-up only where the database shows follow-up required.

---

## 7. Safeguarding and missing episodes

Relevant tables already exist:

- `safeguarding_records`
- `safeguarding_flags`
- `contextual_safeguarding_profiles`
- `missing_episodes`
- `chronology_events`

The latest repo work has also added first-class safeguarding/missing domain migrations and services.

### UI alignment

The UI should now treat safeguarding and missing as first-class operational domains.

Use real tables and new domain services.

Child profiles should show:

- active safeguarding context;
- active/recent missing episodes;
- unresolved follow-up;
- return-home interview status;
- safety planning context.

Do not show fake safeguarding summaries.

---

## 8. Risk assessments and plans

Relevant tables already exist:

- `risk_assessments`
- `risk_reviews`
- `placement_plans`
- `placement_plan_versions`
- `support_plans`
- `behaviour_support_plans`
- `safety_plans`
- `direct_work_plans`
- `family_contact_plans`
- `pathway_plans`
- `os_young_person_care_plan_sections`

### UI alignment

The child profile should show live plan/risk summaries from these tables.

Do not auto-edit these plans from daily notes.

Instead, daily notes/safeguarding/missing should create:

- review prompts;
- operational suggestions;
- chronology pattern indicators;
- linked evidence.

Human review and sign-off remain mandatory.

---

## 9. Documents and templates

Relevant tables already exist:

- `documents`
- `therapeutic_form_templates`
- `statutory_documents`
- `home_documents`
- `young_person_essential_documents`
- `child_documents`
- `child_document_versions`
- `child_document_comments`

### UI alignment

The Document OS should use:

- `therapeutic_form_templates` for real template registry;
- `documents` for created documents;
- child/home/staff document tables where appropriate;
- chronology/evidence links where available.

The UI should not present templates as static fake content.

---

## 10. Inspection, Reg 44 and Reg 45

Relevant tables already exist:

- `reg44_visits`
- `reg44_findings`
- `reg44_actions`
- `reg45_reviews`
- `reg45_review_themes`
- `reg45_actions`
- `inspection_evidence_facts`
- `inspection_readiness_runs`
- `inspection_scores`
- `inspection_improvement_actions`
- `inspection_dashboard_snapshots`

### UI alignment

Inspection readiness and action plans should use these tables.

The platform should surface:

- open Reg 44 actions;
- open Reg 45 actions;
- overdue actions;
- evidence gaps;
- linked documents;
- linked chronology.

Do not claim automatic Reg 44/45 completion unless the action/evidence records exist.

---

# Recommended UI data model

The best next UI should aggregate schema-backed data into these experience bundles:

## `/api/me/workspace`

Should aggregate:

- user profile;
- staff profile;
- profile preferences;
- dashboard preferences;
- favourite children;
- unread notifications;
- unread Connect;
- today handover;
- my actions;
- recent activity.

## `/api/young-people/{id}/profile-bundle`

Should aggregate:

- young_people;
- identity profile;
- communication profile;
- contacts;
- photos;
- risk summaries;
- active plans;
- recent chronology;
- safeguarding/missing context;
- documents/evidence.

## `/api/homes/{id}/operational-bundle`

Should aggregate:

- home details;
- current children;
- handover;
- open safeguarding;
- missing follow-up;
- open notifications;
- open Reg 44/45 actions;
- evidence gaps;
- recent chronology.

These bundles should power the Apple-style personalised UI.

---

# Immediate build recommendations

## 1. Do not add more fake UI

The schema is rich enough to support real identity, handover, notifications, Connect, plans and risk summaries.

## 2. Build experience bundles

Instead of each page querying many isolated endpoints, create backend bundle endpoints that align to the UI:

- adult workspace;
- child profile;
- home operational overview.

## 3. Use real empty states

Where no schema data exists, show calm empty states.

## 4. Keep ORB separate

ORB should use the same operational bundles where permission allows, but must remain a copilot, not an authority.

---

# Conclusion

The current schema strongly supports the next IndiCare UI direction.

The UI should now be built around three live schema-backed experiences:

1. Adult workspace.
2. Child person-first profile.
3. Home operational overview.

These should be personalised, Apple-like, calm, vibrant and deeply connected to operational truth.

The database already contains much of what is needed.

The main remaining task is not inventing data.

It is aggregating and presenting the existing schema in a coherent, premium, human-centred way.
