export type RecordingWorkflowId =
  | 'daily-note'
  | 'incidents'
  | 'safeguarding'
  | 'missing'
  | 'body-map'
  | 'keywork'
  | 'family-contact'
  | 'health'
  | 'appointment-outcome'
  | 'documents'

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
    sections: [
      {
        title: 'Evidence details',
        fields: [
          { name: 'document_title', label: 'Document title', type: 'text', required: true },
          select('document_type', 'Document type', ['Care plan', 'Risk assessment', 'Education', 'Health', 'Family time', 'LAC review', 'Reg 44', 'Reg 45', 'Other']),
          textarea('document_summary', 'What does this evidence show?', 'Explain relevance without duplicating the whole document.', undefined, true),
          textarea('follow_up', 'Follow-up / gaps', 'Any action or review needed.')
        ]
      }
    ]
  }
}

export const quickActionOrder: RecordingWorkflowId[] = [
  'daily-note',
  'incidents',
  'safeguarding',
  'missing',
  'body-map',
  'keywork',
  'family-contact',
  'health',
  'appointment-outcome',
  'documents'
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
  'daily-note',
  'incidents',
  'safeguarding',
  'missing',
  'keywork',
  'health',
  'family-contact'
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
      workflowId: 'health',
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
