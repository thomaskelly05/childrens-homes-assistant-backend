export type RecordingWorkflowId =
  | 'child-profile'
  | 'child-voice'
  | 'wellbeing-check'
  | 'relationship-record'
  | 'daily-note'
  | 'incidents'
  | 'safeguarding'
  | 'missing'
  | 'body-map'
  | 'keywork'
  | 'family-contact'
  | 'education-update'
  | 'health'
  | 'medication-record'
  | 'physical-intervention'
  | 'risk-assessment'
  | 'support-plan'
  | 'shift-handover'
  | 'appointment-outcome'
  | 'documents'
  | 'reg44-action'
  | 'reg45-evidence'

export type RecordingField = {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'datetime-local'
  required?: boolean
  placeholder?: string
  helper?: string
  rows?: number
  options?: string[]
}

export type RecordingSection = {
  title: string
  description?: string
  badge?: string
  fields: RecordingField[]
}

export type RecordingWorkflow = {
  id: RecordingWorkflowId
  routeSegment: string
  eyebrow: string
  title: string
  description: string
  quickActionLabel: string
  tone: string
  primaryField?: string
  regulatoryBadges: string[]
  lifecycle?: string[]
  escalationLifecycle?: string[]
  scope?: Array<'child' | 'home' | 'staff'>
  sourceRecordType?: string
  sccifAreas?: string[]
  qualityStandards?: string[]
  linkage?: string[]
  sections: RecordingSection[]
}

export type SuggestedLink = {
  label: string
  reason: string
  tone: 'blue' | 'amber' | 'red' | 'emerald' | 'purple'
  workflowId?: RecordingWorkflowId
  actionLabel?: string
  fieldPrefill?: Record<string, string>
  tags?: string[]
}

function textarea(
  name: string,
  label: string,
  placeholder: string,
  helper?: string,
  required = false,
  rows = 4
): RecordingField {
  return { name, label, type: 'textarea', placeholder, helper, required, rows }
}

function select(name: string, label: string, options: string[], helper?: string): RecordingField {
  return { name, label, type: 'select', options, helper }
}

function checkbox(name: string, label: string, helper?: string): RecordingField {
  return { name, label, type: 'checkbox', helper }
}

export const standardRecordLifecycle = ['Draft', 'Submitted', 'Reviewed', 'Approved / Returned', 'Archived']
export const extendedRecordLifecycle = ['Escalated', 'Signed off', 'Actioned', 'Closed']

const coreLinkage = ['chronology', 'evidence', 'actions', 'audit trail', 'ORB context', 'reports', 'governance']
const childProgressTags = ['SCCIF experiences and progress', 'Child voice', 'Positive relationships']
const protectionTags = ['SCCIF help and protection', 'Reg 12', 'Reg 13']
const leadershipTags = ['SCCIF leadership and management', 'Quality Standards', 'manager review']
const healthTags = ['SCCIF experiences and progress', 'Health and wellbeing', 'SCCIF help and protection']
const educationTags = ['SCCIF experiences and progress', 'Education', 'Child voice']

const dailyNoteSections: RecordingSection[] = [
  {
    title: 'What happened today?',
    badge: 'Heartbeat',
    description: 'A calm operational note. Record what you saw, what the child said or showed, and what staff did.',
    fields: [
      select('mood', 'Quick wellbeing indicator', ['Settled', 'Positive', 'Anxious', 'Low mood', 'Heightened', 'Withdrawn', 'Mixed'], 'Use the closest plain-language indicator.'),
      textarea('narrative', 'Daily note', 'What did the day feel like for this child? Include facts, support offered, response and outcome.', 'This is the main record Orb and linkage checks use.', true, 6),
      textarea('what_changed_today', 'What changed today?', 'What is different from the last shift, last note or usual routine?', 'Use this for continuity, not analysis.'),
      textarea('what_mattered_today', 'What mattered today?', 'Why did today matter in the child’s lived experience?', 'Small moments can be meaningful evidence.'),
      textarea('emotional_wellbeing', 'Emotional wellbeing', 'How did the child present emotionally? What helped?', 'Include changes from the start or previous shift.'),
      textarea('sleep_routine', 'Sleep / routine', 'Sleep, waking, morning or evening routine, meals, hygiene, settled periods or changes from usual rhythm.'),
      textarea('positive_moments', 'Positive progress / achievements', 'What went well? What is the child building on?', 'Small positives matter in the living story.'),
      textarea('worries_concerns', 'Worries or concerns', 'Any worries, risks, conflict, low mood, self-harm indicators or safeguarding questions?')
    ]
  },
  {
    title: 'Child voice and lived experience',
    badge: 'Relational',
    description: 'Keep the record child-centred without forcing formal language.',
    fields: [
      textarea('child_voice', 'What did the child say or show?', 'Use the child’s words where possible, or describe non-verbal communication.'),
      textarea('wishes_feelings', 'Wishes and feelings', 'How did the child feel about what happened?'),
      textarea('choices_made', 'Choices and participation', 'What choices did the child make? How were they involved?'),
      textarea('participation', 'Participation / advocacy', 'Any advocacy, independent visitor, complaint, family or professional participation?')
    ]
  },
  {
    title: 'Daily life links',
    badge: 'Connected',
    description: 'Only fill what is relevant. These fields help create linked health, education, family and plan context.',
    fields: [
      textarea('school_attendance', 'Education / school', 'Attendance, refusal, timetable changes, virtual school, homework or achievements.'),
      textarea('education_concerns', 'Education concerns', 'Any refusal, exclusion, anxiety, missing learning or follow-up.'),
      textarea('exercise_activity', 'Exercise / activity', 'Outdoor time, hobbies, exercise, play, clubs, independence or meaningful activity.'),
      textarea('physical_health', 'Physical health', 'Injury, illness, pain, sleep, food, appointments or medical advice.'),
      textarea('medication_notes', 'Medication notes', 'Medication given, declined/refused, late, missed or side effects.'),
      textarea('family_time', 'Family time / important relationships', 'Family contact, phone calls, visits, peer or staff relationship moments.'),
      textarea('relationships', 'Relationship dynamics', 'Tensions, repair, trusted adults, key adults or professional contact.')
    ]
  },
  {
    title: 'Follow-up and review',
    badge: 'Actionable',
    description: 'Make the next step obvious for staff and managers.',
    fields: [
      textarea('actions_required', 'Actions required', 'What needs to happen next, by whom and by when?'),
      textarea('plan_links', 'Care plan goals / targets to link', 'Care plan, risk plan, education target, health plan or keywork goal.'),
      textarea('staff_support', 'Staff support / what helped', 'What did adults do that helped, and what should the next adult continue?'),
      textarea('outcomes', 'Outcome / progress', 'What changed by the end of the shift, and what remains unresolved?'),
      checkbox('manager_review_required', 'Manager review required?', 'Use if the record needs QA, sign-off, escalation or threshold decision.'),
      checkbox('new_concern', 'New safeguarding or risk concern?', 'This does not make a conclusion; it flags review.'),
      checkbox('incident', 'Should this continue as an incident?', 'Staff stay in control; this only prepares the route.')
    ]
  }
]

export const recordingWorkflows: Record<RecordingWorkflowId, RecordingWorkflow> = {
  'child-profile': {
    id: 'child-profile',
    routeSegment: 'about-me',
    eyebrow: 'About Me',
    title: 'Update About Me',
    description: 'Maintain one child-centred profile using existing identity, communication and formulation sections.',
    quickActionLabel: 'About Me',
    tone: 'Identity, routines, trusted adults and what helps, in the child’s own context.',
    primaryField: 'child_voice_summary',
    regulatoryBadges: ['SCCIF experiences and progress', 'Child voice', 'Positive relationships'],
    lifecycle: ['Draft', 'Child / adult input added', 'Manager review', 'Approved', 'Review due'],
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'young_person_profile',
    sccifAreas: childProgressTags,
    qualityStandards: ['Reg 7', 'Reg 9', 'Reg 11'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Identity and voice',
        badge: 'About me',
        description: 'Use the child’s preferred language wherever possible.',
        fields: [
          { name: 'preferred_name', label: 'Preferred name', type: 'text' },
          { name: 'pronouns', label: 'Pronouns', type: 'text' },
          textarea('child_voice_summary', 'Child voice', 'What does the child want adults to know about them?', undefined, true),
          textarea('cultural_identity', 'Cultural / religious identity', 'Culture, faith, language, food, community and identity needs.'),
          textarea('important_dates', 'Important dates', 'Birthdays, anniversaries, review dates or dates that may affect feelings.')
        ]
      },
      {
        title: 'Communication, sensory needs and routines',
        badge: 'Day to day',
        fields: [
          textarea('communication_style', 'Communication style', 'How does the child communicate comfort, worry, choice or distress?'),
          textarea('sensory_profile', 'Sensory needs', 'Sensory preferences, sensitivities and helpful adjustments.'),
          textarea('routines_and_predictability', 'Routines', 'Morning, evening, sleep, meals, school and transitions.'),
          textarea('known_triggers', 'Triggers / early signs', 'What might unsettle the child and what adults notice first.'),
          textarea('what_helps', 'Calming strategies', 'What helps the child feel safe, settled or listened to.')
        ]
      },
      {
        title: 'People and current plans',
        badge: 'Network',
        fields: [
          textarea('trusted_adults', 'Trusted adults', 'Adults the child seeks out or finds helpful.'),
          textarea('family_network', 'Family network', 'Important family relationships, contact hopes and worries.'),
          textarea('professional_network', 'Professional network', 'Social worker, school, health, therapist, advocate or IRO.'),
          textarea('likes_dislikes', 'Likes and dislikes', 'Interests, strengths, dislikes and things adults should avoid.'),
          textarea('current_plans', 'Current plans', 'Care, risk, health, education, family time or safety plans to keep in view.'),
          { name: 'review_date', label: 'Review date', type: 'date' }
        ]
      }
    ]
  },
  'child-voice': {
    id: 'child-voice',
    routeSegment: 'child-voice',
    eyebrow: 'Child Voice',
    title: 'Add Child Voice',
    description: 'Record what the child communicated, how adults responded and what changed as a result.',
    quickActionLabel: 'Child Voice',
    tone: 'You said, we did, with clear follow-up.',
    primaryField: 'what_child_said',
    regulatoryBadges: ['SCCIF child voice', 'Reg 7', 'Advocacy / complaints'],
    lifecycle: ['Draft', 'Submitted', 'Reviewed', 'Actioned', 'Closed'],
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'keywork_session',
    sccifAreas: ['SCCIF experiences and progress', 'Child voice'],
    qualityStandards: ['Reg 7', 'Reg 9'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'What the child communicated',
        badge: 'Voice',
        fields: [
          textarea('what_child_said', 'What the child said or wanted', 'Use the child’s own words where possible.', undefined, true),
          textarea('how_communicated', 'How they communicated this', 'Words, behaviour, play, silence, drawings, choices or body language.'),
          textarea('adult_response', 'Adult response', 'What did adults do to show the child was listened to?'),
          textarea('what_changed', 'What changed as a result', 'What changed in care, routine, planning or adult response?'),
          textarea('follow_up_needed', 'Follow-up needed', 'Who will do what next and by when?'),
          textarea('advocacy_complaint_link', 'Advocacy / complaint link', 'Advocate, complaint, IRO, social worker or independent visitor.'),
          textarea('you_said_we_did', 'You said, we did', 'Plain words that can be shared back with the child.'),
          textarea('listened_to_evidence', 'How do we know the child was listened to?', 'Evidence of response, change or feedback from the child.')
        ]
      }
    ]
  },
  'wellbeing-check': {
    id: 'wellbeing-check',
    routeSegment: 'wellbeing-check',
    eyebrow: 'Wellbeing',
    title: 'Add Wellbeing Check',
    description: 'Record presentation, regulation, relationships and follow-up so wellbeing trajectory and ORB context stay current.',
    quickActionLabel: 'Wellbeing Check',
    tone: 'Mood, sleep, appetite, relationships and what helped.',
    primaryField: 'mood_presentation',
    regulatoryBadges: ['SCCIF experiences and progress', 'Reg 10', 'Emotional safety'],
    lifecycle: ['Draft', 'Submitted', 'Reviewed', 'Linked to care plan'],
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'health_record',
    sccifAreas: ['SCCIF experiences and progress', 'SCCIF help and protection'],
    qualityStandards: ['Reg 10', 'Reg 7'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Wellbeing picture',
        badge: 'Emotional safety',
        fields: [
          textarea('mood_presentation', 'Mood / presentation', 'How did the child seem and how did this change?', undefined, true),
          textarea('sleep', 'Sleep', 'Settling, waking, nightmares, tiredness or change from usual.'),
          textarea('appetite', 'Appetite', 'Meals, snacks, hydration, appetite changes or worries.'),
          textarea('emotional_regulation', 'Emotional regulation', 'How did the child manage feelings and what support helped?'),
          textarea('relationships', 'Relationships', 'Trusted adults, peers, family and repair moments.'),
          textarea('education_engagement', 'Education engagement', 'Attendance, engagement, refusal, anxiety or achievement.'),
          textarea('sensory_needs', 'Sensory needs', 'Sensory factors that helped or unsettled the child.'),
          textarea('worries', 'Worries', 'Anything the child said, showed or avoided.'),
          textarea('what_helped', 'What helped', 'Adult response, routine, connection, sensory support or choices.'),
          textarea('what_needs_follow_up', 'What needs follow-up', 'Care plan, health, education, family time, action or manager review.')
        ]
      }
    ]
  },
  'relationship-record': {
    id: 'relationship-record',
    routeSegment: 'relationship-record',
    eyebrow: 'Relationships',
    title: 'Add Relationship Record',
    description: 'Record relational moments, repair conversations, family or peer context and the impact for the child.',
    quickActionLabel: 'Relationship Record',
    tone: 'Relationships, repair and impact for the child.',
    primaryField: 'impact_for_child',
    regulatoryBadges: ['SCCIF positive relationships', 'Reg 11', 'Child voice'],
    lifecycle: ['Draft', 'Submitted', 'Reviewed', 'Chronology linked'],
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'family_contact_record',
    sccifAreas: ['SCCIF experiences and progress', 'Positive relationships'],
    qualityStandards: ['Reg 11', 'Reg 7'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Relationship and repair',
        badge: 'Relational',
        fields: [
          { name: 'trusted_adult', label: 'Trusted adult', type: 'text' },
          { name: 'family_contact', label: 'Family contact', type: 'text' },
          { name: 'peer_relationship', label: 'Peer relationship', type: 'text' },
          textarea('repair_conversation', 'Repair conversation', 'What was repaired, revisited or understood?'),
          textarea('positive_interaction', 'Positive interaction', 'What went well and what did adults notice?'),
          textarea('worries_concerns', 'Worries / concerns', 'Pressure, conflict, confusion, rejection, loss or safety worries.'),
          textarea('adult_response', 'Adult response', 'How did adults support connection, boundaries or repair?'),
          textarea('impact_for_child', 'Impact for child', 'What changed for the child or what needs to happen next?', undefined, true)
        ]
      }
    ]
  },
  'daily-note': {
    id: 'daily-note',
    routeSegment: 'daily-note',
    eyebrow: 'Daily Note',
    title: 'Add Daily Note',
    description: 'The daily note is the operational heartbeat: quick, child-centred and able to suggest linked records without forcing branching.',
    quickActionLabel: 'Daily Note',
    tone: 'Start with today, then create linked records only where needed.',
    primaryField: 'narrative',
    regulatoryBadges: ['SCCIF experiences and progress', 'Quality Standards', 'Reg 7', 'Reg 12'],
    lifecycle: standardRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'daily_note',
    sccifAreas: ['SCCIF experiences and progress', 'SCCIF help and protection', 'SCCIF leadership and management'],
    qualityStandards: ['Reg 7', 'Reg 9', 'Reg 12'],
    linkage: coreLinkage,
    sections: dailyNoteSections
  },
  incidents: {
    id: 'incidents',
    routeSegment: 'incidents',
    eyebrow: 'Incident',
    title: 'Add Incident',
    description: 'Capture facts, impact, staff response, child voice, review and linked follow-up.',
    quickActionLabel: 'Incident',
    tone: 'Facts first, support and outcome next.',
    primaryField: 'what_happened',
    regulatoryBadges: ['Reg 12', 'Reg 13', 'SCCIF protection'],
    lifecycle: standardRecordLifecycle,
    escalationLifecycle: extendedRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'incident',
    sccifAreas: protectionTags,
    qualityStandards: ['Reg 12', 'Reg 13', 'Reg 35'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Incident facts',
        fields: [
          { name: 'occurred_at', label: 'When did it happen?', type: 'datetime-local' },
          { name: 'location', label: 'Where?', type: 'text', placeholder: 'Room, community location or school' },
          textarea('what_happened', 'What happened?', 'Record observable facts in sequence.', undefined, true, 6),
          textarea('antecedent_triggers', 'Trigger / antecedent / context', 'What happened before? Avoid unsupported conclusions.'),
          textarea('de_escalation', 'De-escalation attempted', 'Reassurance, space, choices, distraction, key adult, sensory support or other support tried.')
        ]
      },
      {
        title: 'Support, voice and outcome',
        fields: [
          textarea('staff_response', 'Staff response', 'De-escalation, reassurance, safety actions and repair.'),
          textarea('child_voice', 'Child voice', 'What did the child say, show or explain?'),
          textarea('injuries_damage', 'Injuries / damage / impact', 'Include nil returns if relevant.'),
          textarea('restraint_sanction_detail', 'Restraint / sanction detail', 'If used, record type, duration, rationale, checks and debrief. If none, say none.'),
          textarea('safeguarding_consideration', 'Safeguarding consideration', 'Was there any safeguarding threshold, allegation, exploitation or disclosure indicator?'),
          select('reg40_consideration', 'Reg 40 / notification consideration', ['Not required', 'Review required', 'Required', 'Completed']),
          textarea('follow_up_required', 'Follow-up required', 'Debrief, review, plans, family/social worker updates or evidence.'),
          textarea('actions_required', 'Actions', 'Who needs to do what next, and by when?'),
          checkbox('restraint', 'Physical intervention / restraint used?'),
          checkbox('police_informed', 'Police or emergency services involved?'),
          checkbox('manager_review_required', 'Manager review required?')
        ]
      }
    ]
  },
  safeguarding: {
    id: 'safeguarding',
    routeSegment: 'safeguarding',
    eyebrow: 'Safeguarding',
    title: 'Add Safeguarding Follow-up',
    description: 'Record concern, immediate safety action and threshold review without jumping to conclusions.',
    quickActionLabel: 'Safeguarding follow-up',
    tone: 'Review facts, safety action and who must be informed.',
    primaryField: 'concern_summary',
    regulatoryBadges: ['Reg 12', 'Working Together', 'SCCIF protection'],
    lifecycle: ['Draft', 'Submitted', 'Manager threshold review', 'Actions set', 'Closed'],
    escalationLifecycle: extendedRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'safeguarding_record',
    sccifAreas: protectionTags,
    qualityStandards: ['Reg 12', 'Reg 13', 'Working Together'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Concern and safety',
        fields: [
          textarea('concern_summary', 'Concern summary', 'What is the concern and how did it come to light?', undefined, true, 6),
          textarea('observed_disclosed', 'Observed or disclosed facts', 'Separate direct observation from what was reported.'),
          textarea('immediate_safety_actions', 'Immediate safety actions', 'What was done to keep the child safe?'),
          textarea('child_voice', 'Child voice / wishes', 'What did the child say or show about safety?'),
          select('external_referral', 'External referral', ['No', 'Yes - considered', 'Yes - made']),
          textarea('who_informed', 'Who was informed?', 'Manager, social worker, police, LADO, IRO, family where appropriate.'),
          textarea('evidence', 'Evidence / source', 'Source record, screenshot, body map, disclosure note, chronology entry or professional advice.'),
          textarea('actions_required', 'Actions', 'Immediate and follow-up actions, owner and review point.'),
          checkbox('manager_review_required', 'Manager review required?')
        ]
      }
    ]
  },
  missing: {
    id: 'missing',
    routeSegment: 'missing',
    eyebrow: 'Missing episode',
    title: 'Add Missing Episode',
    description: 'Record missing-from-care actions, return circumstances, welfare check and linked safeguarding review.',
    quickActionLabel: 'Missing episode',
    tone: 'Safe return, chronology, return interview and risk plan link.',
    primaryField: 'last_seen',
    regulatoryBadges: ['Reg 12', 'Missing from care protocol', 'SCCIF protection'],
    lifecycle: ['Draft', 'Live episode', 'Returned', 'Return interview', 'Manager review', 'Closed'],
    escalationLifecycle: extendedRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'missing_episode',
    sccifAreas: protectionTags,
    qualityStandards: ['Reg 12', 'Reg 13'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Missing episode',
        fields: [
          { name: 'missing_start', label: 'Missing start', type: 'datetime-local' },
          textarea('last_seen', 'Last seen / circumstances', 'What was known when the child was missing?', undefined, true),
          textarea('timeline', 'Timeline', 'Key times, sightings, contacts, return time and any gaps.'),
          textarea('search_actions', 'Search and notifications', 'Staff actions, known routes, police/social worker notifications.'),
          checkbox('police_informed', 'Police informed?'),
          textarea('return_circumstances', 'Return circumstances and welfare check', 'How did the child return? Presentation, injuries, immediate care.'),
          textarea('return_home_interview', 'Return interview / independent offer', 'Record offer, acceptance or follow-up needed.'),
          textarea('return_presentation', 'Presentation on return', 'Mood, physical presentation, injuries, clothing, hunger, tiredness, intoxication or distress.'),
          checkbox('risk_review_required', 'Risk review required?'),
          textarea('follow_up_actions', 'Follow-up actions', 'Risk plan, exploitation review, keywork, professionals.'),
          checkbox('manager_review_required', 'Manager review required?')
        ]
      }
    ]
  },
  'body-map': {
    id: 'body-map',
    routeSegment: 'body-map',
    eyebrow: 'Health / body map',
    title: 'Add Body Map or Injury Note',
    description: 'Record injury observations, child explanation, advice and follow-up.',
    quickActionLabel: 'Injury / body map',
    tone: 'Factual body observation and health follow-up.',
    primaryField: 'body_map_observation',
    regulatoryBadges: ['Reg 10', 'Reg 12', 'Health evidence'],
    lifecycle: ['Draft', 'Submitted', 'Health / manager review', 'Actioned', 'Closed'],
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'incident',
    sccifAreas: healthTags,
    qualityStandards: ['Reg 10', 'Reg 12'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Observation',
        fields: [
          textarea('body_map_observation', 'What was observed?', 'Size, colour, location and child presentation. Avoid cause assumptions.', undefined, true),
          { name: 'location_on_body', label: 'Location on body', type: 'text' },
          textarea('child_explanation', 'Child explanation / voice', 'What did the child say or show?'),
          textarea('medical_advice', 'Medical advice / action', 'First aid, NHS 111, GP, urgent care, social worker or manager.'),
          checkbox('manager_review_required', 'Manager review required?')
        ]
      }
    ]
  },
  keywork: {
    id: 'keywork',
    routeSegment: 'keywork',
    eyebrow: 'Keywork',
    title: 'Add Keywork Session',
    description: 'Connect direct work to goals, child voice, progress and next steps.',
    quickActionLabel: 'Keywork',
    tone: 'Voice, relationship and progress from starting points.',
    primaryField: 'direct_work_completed',
    regulatoryBadges: ['Reg 7', 'Quality of care', 'SCCIF progress'],
    lifecycle: standardRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'keywork_session',
    sccifAreas: childProgressTags,
    qualityStandards: ['Reg 7', 'Reg 9'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Session',
        fields: [
          { name: 'session_date', label: 'Session date', type: 'date' },
          { name: 'topic', label: 'Topic', type: 'text' },
          textarea('goals_discussed', 'Goal or plan link', 'Care plan, risk plan, education, health or relationship goal.'),
          textarea('direct_work_completed', 'What was explored?', 'Plain language summary of the session.', undefined, true),
          textarea('child_voice', 'Child voice', 'What mattered to the child?'),
          textarea('progress', 'Progress from starting point', 'What has changed or strengthened?'),
          textarea('next_steps', 'Agreed next steps', 'Actions, review date or support needed.'),
          textarea('plan_links', 'Plan links', 'Care plan goal, risk plan, education/health target or keywork goal.')
        ]
      }
    ]
  },
  'family-contact': {
    id: 'family-contact',
    routeSegment: 'family-contact',
    eyebrow: 'Family time',
    title: 'Add Family Contact Record',
    description: 'Link family time to presentation, wishes and follow-up support.',
    quickActionLabel: 'Family contact',
    tone: 'Relationship context and child experience.',
    primaryField: 'during_presentation',
    regulatoryBadges: ['Reg 9', 'Reg 7', 'SCCIF relationships'],
    lifecycle: standardRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'family_contact_record',
    sccifAreas: ['SCCIF experiences and progress', 'Positive relationships', 'Child voice'],
    qualityStandards: ['Reg 7', 'Reg 9', 'Reg 11'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Family contact',
        fields: [
          { name: 'contact_datetime', label: 'When?', type: 'datetime-local' },
          select('contact_type', 'Contact type', ['Phone', 'Video', 'Visit', 'Letter', 'Indirect', 'Other']),
          { name: 'contact_person', label: 'Person / relationship', type: 'text' },
          textarea('before_presentation', 'Before contact', 'How did the child seem before?'),
          textarea('during_presentation', 'During / after contact', 'What happened and how did the child respond?', undefined, true),
          textarea('child_voice', 'Child voice', 'What did the child say, show or ask for about family time?'),
          textarea('positives', 'What went well?', 'Positive relationship moments.'),
          textarea('worries', 'Worries or tensions', 'Any pressure, distress, conflict or safety concern.'),
          textarea('follow_up_support', 'Follow-up support', 'Debrief, plan change, social worker update or keywork.'),
          textarea('linked_risks_actions', 'Linked risks / actions', 'Any risk plan, contact plan or action follow-up to connect.')
        ]
      }
    ]
  },
  'education-update': {
    id: 'education-update',
    routeSegment: 'education-update',
    eyebrow: 'Education',
    title: 'Add Education Update',
    description: 'Record attendance, engagement, achievement, worries and what adults will do next using the education record route.',
    quickActionLabel: 'Education Update',
    tone: 'Learning, belonging, barriers and the support adults put in place.',
    primaryField: 'learning_engagement',
    regulatoryBadges: ['SCCIF experiences and progress', 'Reg 8', 'Education evidence'],
    lifecycle: standardRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'education_record',
    sccifAreas: educationTags,
    qualityStandards: ['Reg 8', 'Reg 7'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Education and learning',
        badge: 'Learning',
        fields: [
          { name: 'record_date', label: 'Record date', type: 'date' },
          select('attendance_status', 'Attendance / engagement', ['Attended', 'Partial attendance', 'Refused', 'Excluded / suspended', 'Not timetabled', 'Home learning', 'Other']),
          { name: 'provision_name', label: 'School / provision', type: 'text' },
          textarea('learning_engagement', 'How was learning for the child?', 'Engagement, anxiety, strengths, barriers, support and what changed.', undefined, true),
          textarea('behaviour_summary', 'Presentation and relationships in education', 'Peer, teacher, transition, transport, routine or relationship context.'),
          textarea('issue_raised', 'Worries or barriers', 'Any refusal, exclusion, bullying, anxiety, missing learning, SEN or safety concern.'),
          textarea('action_taken', 'What did adults do next?', 'Support, calls, timetable changes, virtual school, social worker or plan update.'),
          { name: 'professional_involved', label: 'Professional involved', type: 'text' },
          textarea('achievement_note', 'Achievement / progress', 'What went well, what helped and what this means for the child.')
        ]
      }
    ]
  },
  health: {
    id: 'health',
    routeSegment: 'health',
    eyebrow: 'Health',
    title: 'Add Health / Medication Note',
    description: 'Record health, medication refusal/missed doses and follow-up.',
    quickActionLabel: 'Health / medication',
    tone: 'Health action, medication context and follow-up.',
    primaryField: 'health_update',
    regulatoryBadges: ['Reg 10', 'Health and wellbeing', 'SCCIF health'],
    lifecycle: standardRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'health_record',
    sccifAreas: healthTags,
    qualityStandards: ['Reg 10', 'Reg 12'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Health note',
        fields: [
          textarea('health_update', 'Health update', 'Symptoms, presentation, injury, sleep, nutrition or appointment context.', undefined, true),
          textarea('medication_issue', 'Medication issue', 'Refusal, missed dose, side effect, PRN or stock concern.'),
          textarea('appointment_outcome', 'Appointment outcome if relevant', 'What was decided, changed, prescribed or advised?'),
          textarea('advice_received', 'Advice received', 'NHS, GP, pharmacy, CAMHS or manager advice.'),
          textarea('follow_up', 'Follow-up', 'Monitoring, appointment, medication review or plan update.')
        ]
      }
    ]
  },
  'medication-record': {
    id: 'medication-record',
    routeSegment: 'medication-record',
    eyebrow: 'Medication',
    title: 'Add Medication Record',
    description: 'Record administration, refusal, missed doses, side effects and action taken using the medication record route.',
    quickActionLabel: 'Medication',
    tone: 'Medication facts, checks and manager review if something went wrong.',
    primaryField: 'medication_name',
    regulatoryBadges: ['Reg 10', 'Medication safety', 'Manager review if error'],
    lifecycle: ['Draft', 'Recorded', 'Checked', 'Manager review if error'],
    escalationLifecycle: extendedRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'medication_record',
    sccifAreas: ['SCCIF help and protection', 'Health and wellbeing'],
    qualityStandards: ['Reg 10', 'Reg 12'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Medication administration',
        badge: 'Health',
        fields: [
          { name: 'medication_name', label: 'Medication', type: 'text', required: true },
          { name: 'dose', label: 'Dose', type: 'text' },
          { name: 'administered_time', label: 'Time', type: 'datetime-local' },
          { name: 'administered_by_name', label: 'Administered by', type: 'text' },
          select('administration_status', 'Recorded status', ['administered', 'refused', 'missed', 'error', 'not required']),
          textarea('reason', 'Reason if refused / missed', 'Child explanation, practical issue or clinical advice.'),
          textarea('side_effects', 'Side effects', 'Any side effects, concerns or nil return if relevant.'),
          textarea('action_taken', 'Action taken', 'Monitoring, advice, manager review, pharmacy, GP or social worker update.'),
          checkbox('medication_error', 'Medication error?', 'This prompts manager review.')
        ]
      }
    ]
  },
  'physical-intervention': {
    id: 'physical-intervention',
    routeSegment: 'physical-intervention',
    eyebrow: 'Physical Intervention',
    title: 'Add Physical Intervention / Restraint',
    description: 'Record why intervention was necessary, de-escalation, holds, injury, child and staff debrief and repair work.',
    quickActionLabel: 'Physical Intervention',
    tone: 'Least restrictive, factual and repair-focused.',
    primaryField: 'reason',
    regulatoryBadges: ['Reg 13', 'Reg 35', 'SCCIF protection'],
    lifecycle: ['Draft', 'Submitted', 'Manager review', 'Child debrief', 'Staff debrief', 'Closed'],
    escalationLifecycle: extendedRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'incident',
    sccifAreas: protectionTags,
    qualityStandards: ['Reg 12', 'Reg 13', 'Reg 35'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Intervention and debrief',
        badge: 'Safeguarding',
        fields: [
          textarea('reason', 'Reason', 'What immediate risk made physical intervention necessary?', undefined, true),
          textarea('de_escalation_attempted', 'De-escalation attempted', 'What was tried before intervention and how did the child respond?'),
          { name: 'duration_minutes', label: 'Duration in minutes', type: 'text' },
          textarea('holds_used', 'Holds used', 'Describe holds factually, including least restrictive approach.'),
          textarea('injury', 'Injury', 'Child or staff injury, checks, body map or nil return.'),
          textarea('child_view', 'Child view', 'What did the child say, show or want adults to know?'),
          textarea('staff_debrief', 'Staff debrief', 'Reflection, emotional impact and learning.'),
          textarea('manager_review', 'Manager review', 'Quality, proportionality, notifications, learning and actions.'),
          textarea('repair_work', 'Repair work', 'How adults repaired with the child afterwards.'),
          textarea('plan_update', 'Plan update', 'Risk, behaviour support, health or care plan updates needed.'),
          checkbox('manager_review_required', 'Manager review required?', 'Physical intervention records require manager oversight.')
        ]
      }
    ]
  },
  'risk-assessment': {
    id: 'risk-assessment',
    routeSegment: 'risk-assessment',
    eyebrow: 'Risk',
    title: 'Add Risk Assessment',
    description: 'Record dynamic risk with the child story, known triggers, protective factors, controls and review action.',
    quickActionLabel: 'Risk Assessment',
    tone: 'Risk, safety, relationships and what adults must notice early.',
    primaryField: 'concern_summary',
    regulatoryBadges: ['SCCIF help and protection', 'Reg 12', 'Risk assessment'],
    lifecycle: standardRecordLifecycle,
    escalationLifecycle: extendedRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'risk_assessment',
    sccifAreas: protectionTags,
    qualityStandards: ['Reg 12', 'Reg 13'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Risk picture',
        badge: 'Safety',
        fields: [
          select('category', 'Risk area', ['missing', 'exploitation', 'self-harm', 'aggression', 'online safety', 'substance use', 'health', 'relationships', 'community', 'other']),
          { name: 'title', label: 'Risk assessment title', type: 'text', required: true },
          textarea('concern_summary', 'What is the risk and context?', 'What is happening, what it may mean for the child and why review is needed.', undefined, true),
          textarea('known_triggers', 'Known triggers / early signs', 'What adults should notice early.'),
          textarea('early_warning_signs', 'Early warning signs', 'Small changes in mood, routine, relationships or behaviour.'),
          textarea('contextual_factors', 'Contextual factors', 'Places, people, online context, community, school, family or peer context.'),
          textarea('current_controls', 'Current controls / what helps', 'Protective routines, relationships, boundaries and safeguards.'),
          textarea('deescalation_strategies', 'De-escalation / recovery', 'What adults do before, during and after escalation.'),
          textarea('response_actions', 'Actions and review', 'Who will do what, by when and how the plan will be reviewed.'),
          textarea('child_views', 'Child views', 'What the child says, shows or wants adults to understand.'),
          select('severity', 'Severity', ['low', 'medium', 'high', 'critical']),
          { name: 'review_date', label: 'Review date', type: 'date' }
        ]
      }
    ]
  },
  'support-plan': {
    id: 'support-plan',
    routeSegment: 'support-plan',
    eyebrow: 'Support Plan',
    title: 'Add Support Plan',
    description: 'Translate child voice, formulation, risk and strengths into day-to-day adult practice.',
    quickActionLabel: 'Support Plan',
    tone: 'What adults do every day to help this child feel safe and make progress.',
    primaryField: 'summary',
    regulatoryBadges: ['SCCIF experiences and progress', 'SCCIF help and protection', 'Quality Standards'],
    lifecycle: standardRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'support_plan',
    sccifAreas: ['SCCIF experiences and progress', 'SCCIF help and protection', 'SCCIF leadership and management'],
    qualityStandards: ['Reg 7', 'Reg 9', 'Reg 12'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Plan and practice',
        badge: 'Plan',
        fields: [
          select('plan_type', 'Plan type', ['support_plan', 'care_plan', 'behaviour_support_plan', 'missing_plan', 'health_plan', 'education_plan', 'family_time_plan']),
          { name: 'title', label: 'Plan title', type: 'text', required: true },
          textarea('presenting_need', 'What need is this plan responding to?', 'Use child-centred language and link to lived experience.'),
          textarea('summary', 'What should adults understand?', 'Short practical summary of the plan.', undefined, true),
          textarea('child_voice', 'Child voice', 'What the child says, shows or wants adults to know.'),
          textarea('proactive_strategies', 'What helps before things escalate?', 'Routines, relationships, sensory needs, choices and connection.'),
          textarea('pace_guidance', 'PACE / therapeutic guidance', 'Acceptance, curiosity, empathy and warmth in practice.'),
          textarea('triggers', 'Triggers / things to avoid', 'What can unsettle the child and how adults reduce this.'),
          textarea('protective_factors', 'Strengths and protective factors', 'Relationships, interests, routines, achievements and safe places.'),
          textarea('staff_guidance', 'Guidance for staff', 'What the next adult should do clearly and consistently.'),
          { name: 'review_date', label: 'Review date', type: 'date' }
        ]
      }
    ]
  },
  'shift-handover': {
    id: 'shift-handover',
    routeSegment: 'shift-handover',
    eyebrow: 'Shift Handover',
    title: 'Add Shift Handover',
    description: 'Prepare calm continuity for the next adults using existing handover records, chronology, actions and ORB context.',
    quickActionLabel: 'Shift Handover',
    tone: 'Emotional safety, risks, appointments, medication and key messages for the next shift.',
    primaryField: 'children_summary',
    regulatoryBadges: ['Leadership and management', 'Operational continuity', 'ORB briefing'],
    lifecycle: ['Draft', 'Submitted', 'Accepted by next shift', 'Manager reviewed', 'Archived'],
    escalationLifecycle: extendedRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'handover_record',
    sccifAreas: ['SCCIF leadership and management', 'SCCIF help and protection'],
    qualityStandards: ['Reg 12', 'Reg 13'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Handover details',
        badge: 'Continuity',
        fields: [
          select('shift_type', 'Shift type', ['day', 'late', 'night', 'handover']),
          { name: 'handover_datetime', label: 'Date / time', type: 'datetime-local' },
          { name: 'staff_handing_over', label: 'Staff handing over', type: 'text' },
          { name: 'staff_receiving', label: 'Staff receiving', type: 'text' },
          textarea('children_summary', 'Children summary', 'Brief child-centred summary for the next shift.', undefined, true),
          textarea('risks_to_know', 'Risks to know', 'Risks, triggers, safeguarding signals and what helps.'),
          textarea('emotional_atmosphere', 'Emotional atmosphere', 'What helped children feel settled? Any mood, routine or relationship changes?'),
          textarea('incidents', 'Incidents', 'Incidents or near misses since last handover.'),
          textarea('missing_away', 'Missing / away from home', 'Missing episode, planned away time or return conversation.'),
          textarea('appointments', 'Appointments', 'Appointments due, outcomes to chase or transport.'),
          textarea('medication', 'Medication', 'Medication alerts, refusals, missed doses or checks.'),
          textarea('key_messages', 'Key messages', 'What does the next shift need to know to support emotional safety?'),
          textarea('actions_outstanding', 'Actions outstanding', 'Actions, owner and review point.'),
          textarea('manager_notes', 'Manager notes', 'Senior or manager oversight notes.')
        ]
      }
    ]
  },
  'appointment-outcome': {
    id: 'appointment-outcome',
    routeSegment: 'appointment-outcome',
    eyebrow: 'Appointment',
    title: 'Add Appointment Outcome',
    description: 'Connect professional appointments to health, education, safeguarding and actions.',
    quickActionLabel: 'Appointment outcome',
    tone: 'Professional advice and action link.',
    primaryField: 'appointment_outcome',
    regulatoryBadges: ['Reg 10', 'Reg 9', 'Professional evidence'],
    lifecycle: standardRecordLifecycle,
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'health_record',
    sccifAreas: ['SCCIF experiences and progress', 'Health and wellbeing', 'Education'],
    qualityStandards: ['Reg 9', 'Reg 10'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Appointment outcome',
        fields: [
          { name: 'appointment_datetime', label: 'Appointment date/time', type: 'datetime-local' },
          { name: 'appointment_type', label: 'Appointment type', type: 'text' },
          { name: 'professional_name', label: 'Professional', type: 'text' },
          textarea('appointment_outcome', 'Outcome', 'What was discussed or decided?', undefined, true),
          textarea('advice_received', 'Advice received', 'Professional advice and evidence.'),
          textarea('follow_up', 'Follow-up', 'Actions, next appointment or plan changes.')
        ]
      }
    ]
  },
  documents: {
    id: 'documents',
    routeSegment: 'documents',
    eyebrow: 'Evidence',
    title: 'Attach Document / Evidence',
    description: 'Attach evidence to the child journey, chronology and reporting trail.',
    quickActionLabel: 'Document / evidence',
    tone: 'Evidence-linked and report-ready.',
    primaryField: 'document_summary',
    regulatoryBadges: ['Evidence trail', 'Audit', 'Inspection readiness'],
    lifecycle: ['Draft', 'Submitted', 'Reviewed', 'Signed off', 'Review due', 'Archived'],
    scope: ['child', 'home', 'staff'],
    sourceRecordType: 'document',
    sccifAreas: ['SCCIF experiences and progress', 'SCCIF help and protection', 'SCCIF leadership and management'],
    qualityStandards: ['Reg 7', 'Reg 9', 'Reg 12', 'Reg 13'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Evidence details',
        fields: [
          { name: 'document_title', label: 'Document title', type: 'text', required: true },
          select('document_type', 'Document type', ['About Me', 'My Voice', 'My Relationships', 'My Routines', 'My Sensory Needs', 'My Communication', 'My Education', 'My Health', 'My Family Time', 'My Plans', 'My Safety', 'My Achievements', 'My Journey', 'Statutory Documents', 'Manager Review', 'Reg 44', 'Reg 45', 'Other']),
          textarea('document_summary', 'What does this evidence show?', 'Explain relevance without duplicating the whole document.', undefined, true),
          { name: 'review_date', label: 'Review date', type: 'date' },
          { name: 'owner', label: 'Owner', type: 'text' },
          textarea('impact_for_child', 'Impact for child', 'What does this document change, clarify or evidence for the child?'),
          textarea('linked_chronology', 'Linked chronology', 'Chronology event, date or source record this belongs with.'),
          textarea('follow_up', 'Follow-up / gaps', 'Any action or review needed.')
        ]
      }
    ]
  },
  'reg44-action': {
    id: 'reg44-action',
    routeSegment: 'reg44-action',
    eyebrow: 'Reg 44',
    title: 'Add Reg 44 Action Evidence',
    description: 'Record visitor findings, provider response, actions and impact using the evidence link route.',
    quickActionLabel: 'Reg 44 Action',
    tone: 'Independent visit action, owner, response and impact for children.',
    primaryField: 'action_response',
    regulatoryBadges: ['Reg 44', 'Leadership and management', 'Inspection evidence'],
    lifecycle: ['Scheduled', 'Visit completed', 'Report received', 'Actions created', 'Provider response', 'Closed'],
    scope: ['home', 'staff'],
    sourceRecordType: 'reg44',
    sccifAreas: leadershipTags,
    qualityStandards: ['Reg 44', 'Leadership and Management'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Reg 44 action',
        badge: 'Oversight',
        fields: [
          { name: 'visit_date', label: 'Visit date', type: 'date' },
          { name: 'visitor', label: 'Visitor', type: 'text' },
          textarea('finding', 'Finding / recommendation', 'What was found and why does it matter for children?', undefined, true),
          textarea('action_response', 'Provider response / action', 'What adults will do, owner and timescale.'),
          textarea('impact_for_children', 'Impact for children', 'How will this improve safety, care, progress or voice?'),
          textarea('evidence_reviewed', 'Evidence reviewed', 'Records, child voice, staff feedback, documents or chronology reviewed.')
        ]
      }
    ]
  },
  'reg45-evidence': {
    id: 'reg45-evidence',
    routeSegment: 'reg45-evidence',
    eyebrow: 'Reg 45',
    title: 'Add Reg 45 Evidence',
    description: 'Record quality of care evidence, gaps and improvement actions for the Reg 45 review.',
    quickActionLabel: 'Reg 45 Evidence',
    tone: 'Quality of care evidence, child outcomes, workforce and improvement actions.',
    primaryField: 'evidence_reviewed',
    regulatoryBadges: ['Reg 45', 'Quality of care review', 'Inspection evidence'],
    lifecycle: ['Draft', 'Evidence gathering', 'Manager review', 'RI review', 'Signed off', 'Improvement plan'],
    scope: ['home', 'staff'],
    sourceRecordType: 'reg45',
    sccifAreas: ['SCCIF experiences and progress', 'SCCIF help and protection', 'SCCIF leadership and management'],
    qualityStandards: ['Reg 45', 'Quality of Care', 'Leadership and Management'],
    linkage: coreLinkage,
    sections: [
      {
        title: 'Reg 45 evidence',
        badge: 'Review',
        fields: [
          { name: 'review_period', label: 'Review period', type: 'text' },
          textarea('evidence_reviewed', 'Evidence reviewed', 'Live records, reports, child voice, staff evidence and documents reviewed.', undefined, true),
          textarea('child_outcomes', 'Child outcomes', 'What changed for children and what helped?'),
          textarea('safeguarding', 'Safeguarding', 'Help and protection evidence, gaps and actions.'),
          textarea('workforce', 'Workforce', 'Training, supervision, recording quality and staffing evidence.'),
          textarea('leadership', 'Leadership', 'Management oversight, audit, actions and learning.'),
          textarea('improvement_actions', 'Improvement actions', 'What remains open, by whom and by when?')
        ]
      }
    ]
  }
}

export const quickActionOrder: RecordingWorkflowId[] = [
  'child-profile',
  'child-voice',
  'wellbeing-check',
  'relationship-record',
  'daily-note',
  'incidents',
  'safeguarding',
  'missing',
  'body-map',
  'keywork',
  'family-contact',
  'education-update',
  'health',
  'medication-record',
  'physical-intervention',
  'risk-assessment',
  'support-plan',
  'shift-handover',
  'appointment-outcome',
  'documents',
  'reg44-action',
  'reg45-evidence'
]

export type ChildQuickActionItem =
  | {
      id: RecordingWorkflowId
      kind: 'workflow'
      label: string
      description: string
      workflowId: RecordingWorkflowId
    }
  | {
      id: 'add-action' | 'dictate-orb' | 'open-chronology'
      kind: 'route'
      label: string
      description: string
      href: (childId: string) => string
    }

const childOperationalWorkflowIds: RecordingWorkflowId[] = [
  'child-profile',
  'child-voice',
  'wellbeing-check',
  'relationship-record',
  'daily-note',
  'incidents',
  'safeguarding',
  'missing',
  'keywork',
  'education-update',
  'health',
  'family-contact',
  'medication-record',
  'physical-intervention',
  'risk-assessment',
  'support-plan',
  'shift-handover'
]

export const childOperationalQuickActions: ChildQuickActionItem[] = [
  ...childOperationalWorkflowIds.map((workflowId): ChildQuickActionItem => {
    const workflow = recordingWorkflows[workflowId]
    return {
      id: workflowId,
      kind: 'workflow' as const,
      label: workflow.quickActionLabel,
      description: workflow.tone,
      workflowId: workflow.id
    }
  }),
  {
    id: 'add-action',
    kind: 'route' as const,
    label: 'Add Action',
    description: 'Create a clear next step linked to this child.',
    href: (childId: string) => `/actions?young_person_id=${encodeURIComponent(childId)}&intent=new`
  },
  {
    id: 'open-chronology',
    kind: 'route' as const,
    label: 'Open Chronology',
    description: 'Return to the child chronology without changing context.',
    href: (childId: string) => `/young-people/${encodeURIComponent(childId)}/chronology`
  },
  {
    id: 'dictate-orb',
    kind: 'route' as const,
    label: 'Dictate with Orb',
    description: 'Open Orb with this child already in context.',
    href: (childId: string) => `/assistant?mode=dictate&youngPersonId=${encodeURIComponent(childId)}`
  }
]

export type ChildQuickActionContext = {
  workflow?: 'recording' | 'qa' | 'oversight' | 'journey' | 'mobile'
  role?: string | null
  unresolvedActions?: number
}

export function contextualChildQuickActions(context: ChildQuickActionContext = {}) {
  const byId = new Map(childOperationalQuickActions.map((action) => [action.id, action]))
  const requested = context.workflow === 'qa'
    ? ['open-chronology', 'add-action', 'documents', 'dictate-orb']
    : context.workflow === 'oversight'
      ? ['open-chronology', 'documents', 'add-action', 'dictate-orb']
      : context.workflow === 'mobile'
        ? ['daily-note', 'open-chronology', 'dictate-orb']
        : context.unresolvedActions
          ? ['daily-note', 'safeguarding', 'add-action', 'open-chronology', 'dictate-orb']
          : ['daily-note', 'safeguarding', 'keywork', 'open-chronology', 'dictate-orb']
  return requested.map((id) => byId.get(id as ChildQuickActionItem['id'])).filter(Boolean) as ChildQuickActionItem[]
}

export function childQuickActionHref(childId: string, action: ChildQuickActionItem) {
  if (action.kind === 'route') return action.href(childId)
  const workflow = recordingWorkflows[action.workflowId]
  const mode = workflow.id === 'documents' ? 'upload' : 'new'
  return `/young-people/${encodeURIComponent(childId)}/${workflow.routeSegment}/${mode}`
}

const suggestionRules: Array<{
  test: RegExp
  suggestion: SuggestedLink
}> = [
  {
    test: /\b(injur|bruise|cut|mark|body map|pain|hurt|swollen|medical|first aid)\b/i,
    suggestion: {
      label: 'Create linked health / injury record',
      actionLabel: 'Create linked record',
      workflowId: 'body-map',
      reason: 'The note mentions injury, pain or medical observation. A health/body-map record may prevent duplicate re-writing.',
      tone: 'amber',
      tags: ['health', 'evidence']
    }
  },
  {
    test: /\b(restraint|held|physical intervention|restrictive|sanction|assault|aggression|threw|hit|kicked)\b/i,
    suggestion: {
      label: 'Continue as incident',
      actionLabel: 'Continue as incident',
      workflowId: 'incidents',
      reason: 'Incident language was detected. Staff can carry the daily note context into an incident record.',
      tone: 'red',
      tags: ['incident', 'manager-review']
    }
  },
  {
    test: /\b(police|ambulance|emergency|lado|strategy discussion|social worker informed|external agency)\b/i,
    suggestion: {
      label: 'Add safeguarding follow-up',
      actionLabel: 'Add safeguarding follow-up',
      workflowId: 'safeguarding',
      reason: 'External agency or threshold language should be visible to safeguarding review.',
      tone: 'red',
      tags: ['safeguarding', 'external-agency']
    }
  },
  {
    test: /\b(missing|abscond|left the home|whereabouts|returned|return interview|unauthorised absence)\b/i,
    suggestion: {
      label: 'Create missing episode record',
      actionLabel: 'Create linked record',
      workflowId: 'missing',
      reason: 'Missing-from-care wording was identified. Link the episode, return welfare check and risk review.',
      tone: 'red',
      tags: ['missing', 'safeguarding']
    }
  },
  {
    test: /\b(family|mum|dad|mother|father|aunt|uncle|sibling|contact|phone call|visit)\b/i,
    suggestion: {
      label: 'Link family contact',
      actionLabel: 'Create linked record',
      workflowId: 'family-contact',
      reason: 'Family time or important relationship context can be connected to the child story.',
      tone: 'purple',
      tags: ['family-time', 'relationships']
    }
  },
  {
    test: /\b(medication|medicine|tablet|dose|refus|declined meds|missed dose|side effect|prn)\b/i,
    suggestion: {
      label: 'Medication follow-up',
      actionLabel: 'Create linked record',
      workflowId: 'medication-record',
      reason: 'Medication wording was found. A health record/action can keep administration follow-up clear.',
      tone: 'amber',
      tags: ['medication', 'health']
    }
  },
  {
    test: /\b(low mood|self[- ]?harm|suicid|worthless|cutting|unsafe|exploitation|disclos|scared|threat)\b/i,
    suggestion: {
      label: 'Safeguarding review suggestion',
      actionLabel: 'Add safeguarding follow-up',
      workflowId: 'safeguarding',
      reason: 'The note contains emotional risk or safeguarding language. This is a review prompt, not a conclusion.',
      tone: 'red',
      tags: ['safeguarding', 'wellbeing']
    }
  },
  {
    test: /\b(school refusal|refused school|education refusal|excluded|suspended|virtual school|timetable|homework|school anxiety)\b/i,
    suggestion: {
      label: 'Education concern linkage',
      actionLabel: 'Create action',
      workflowId: 'daily-note',
      reason: 'Education concern language should connect to chronology, actions and education plan evidence.',
      tone: 'blue',
      tags: ['education', 'action']
    }
  },
  {
    test: /\b(action|follow up|review|call|book|update|check|complete|arrange)\b/i,
    suggestion: {
      label: 'Create action',
      actionLabel: 'Create action',
      reason: 'Follow-up wording was detected. Create an explicit action so it is not lost at handover.',
      tone: 'emerald',
      tags: ['action']
    }
  },
  {
    test: /\b(care plan|risk plan|placement plan|education plan|health plan|goal|target|starting point)\b/i,
    suggestion: {
      label: 'Link to care plan goal',
      actionLabel: 'Link to care plan goal',
      reason: 'Plan or goal wording was found. Link the record to progress from starting points.',
      tone: 'blue',
      tags: ['plan-link', 'progress']
    }
  }
]

export function workflowFromRouteSegment(segment: string) {
  return Object.values(recordingWorkflows).find((workflow) => workflow.routeSegment === segment)
}

export function extractSuggestedLinks(values: Record<string, string>): SuggestedLink[] {
  const text = Object.values(values).join('\n').toLowerCase()
  const seen = new Set<string>()
  const suggestions: SuggestedLink[] = []

  suggestionRules.forEach((rule) => {
    if (!rule.test.test(text) || seen.has(rule.suggestion.label)) return
    suggestions.push(rule.suggestion)
    seen.add(rule.suggestion.label)
  })

  if (!String(values.child_voice || values.wishes_feelings || '').trim()) {
    suggestions.push({
      label: 'Add child voice',
      actionLabel: 'Suggest child voice prompts',
      reason: 'No child voice is recorded yet. Add what the child said, showed, chose or felt if known.',
      tone: 'purple',
      tags: ['child-voice']
    })
  }

  if (!String(values.actions_required || values.follow_up_required || '').trim() && suggestions.some((item) => ['red', 'amber'].includes(item.tone))) {
    suggestions.push({
      label: 'Clarify follow-up',
      actionLabel: 'Suggest follow-up questions',
      reason: 'The record has risk or health indicators but no clear next step yet.',
      tone: 'amber',
      tags: ['follow-up']
    })
  }

  return suggestions.slice(0, 8)
}

export function buildLinkedWorkflowHref(childId: string, suggestion: SuggestedLink) {
  if (!suggestion.workflowId || suggestion.workflowId === 'daily-note') return null
  const workflow = recordingWorkflows[suggestion.workflowId]
  const mode = workflow.id === 'documents' ? 'upload' : 'new'
  return `/young-people/${encodeURIComponent(childId)}/${workflow.routeSegment}/${mode}`
}
