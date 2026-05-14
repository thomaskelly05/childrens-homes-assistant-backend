import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { RecordingWorkflowId, SuggestedLink } from '@/lib/child-journey/workflows'

const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '')

type RecordingRequest = {
  childId?: string
  workflowId?: RecordingWorkflowId
  values?: Record<string, string>
  suggestions?: SuggestedLink[]
}

type ForwardResult = {
  ok: boolean
  status: number
  payload: Record<string, any>
}

function nowIso() {
  return new Date().toISOString()
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function yes(value?: string) {
  return String(value || '').toLowerCase().startsWith('yes')
}

function text(values: Record<string, string>, keys: string[]) {
  return keys
    .map((key) => values[key])
    .filter((value) => value && value.trim())
    .join('\n\n')
}

function hasSuggestion(suggestions: SuggestedLink[] | undefined, label: string) {
  return (suggestions || []).some((suggestion) => suggestion.label.toLowerCase().includes(label.toLowerCase()))
}

function linkingSummary(suggestions: SuggestedLink[] | undefined) {
  const labels = (suggestions || []).map((suggestion) => suggestion.label).slice(0, 6)
  return labels.length ? `Suggested links reviewed by staff: ${labels.join('; ')}.` : undefined
}

function severity(values: Record<string, string>, suggestions?: SuggestedLink[]) {
  if (hasSuggestion(suggestions, 'safeguarding') || yes(values.manager_review_required) || yes(values.risk_review_required)) return 'high'
  if (yes(values.new_concern) || yes(values.incident) || yes(values.self_harm_concern) || yes(values.exploitation_concern)) return 'high'
  return 'medium'
}

async function forward(path: string, body: Record<string, any>): Promise<ForwardResult> {
  const cookieHeader = (await cookies()).toString()
  const response = await fetch(`${BACKEND_ORIGIN}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {})
    },
    body: JSON.stringify(body)
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, any>
  return { ok: response.ok, status: response.status, payload }
}

function dailyPayload(values: Record<string, string>, suggestions?: SuggestedLink[]) {
  const actions = values.actions_required || values.follow_up_required
  return {
    note_date: todayIsoDate(),
    shift_type: 'day',
    status: 'draft',
    workflow_status: yes(values.manager_review_required) ? 'submitted' : 'draft',
    title: 'Daily note',
    narrative: values.narrative,
    mood: values.mood,
    presentation: text(values, ['narrative', 'emotional_wellbeing', 'sleep_routine', 'behaviour_presentation', 'relationships', 'worries_concerns']),
    activities: text(values, ['positive_moments', 'routines_completed', 'exercise_activity', 'choices_made', 'participation']),
    education_update: text(values, ['school_attendance', 'education_engagement', 'achievements', 'education_concerns', 'school_communication']),
    health_update: text(values, ['sleep_quality', 'night_observations', 'physical_health', 'emotional_health', 'medication_notes', 'appointments', 'food_nutrition']),
    family_update: text(values, ['family_time', 'family_response', 'peer_relationships', 'staff_relationships']),
    behaviour_update: text(values, ['behaviour_presentation', 'de_escalation_support', 'nurture_repair', 'staff_support']),
    young_person_voice: text(values, ['child_voice', 'wishes_feelings']),
    positives: text(values, ['positive_moments', 'achievements', 'progress', 'outcomes']),
    actions_required: actions,
    significance: severity(values, suggestions),
    create_follow_up_task: Boolean(actions),
    link_to_chronology: true,
    link_to_support_plans: Boolean(values.plan_links),
    manager_review_needed: yes(values.manager_review_required),
    safeguarding_concern: yes(values.new_concern) || yes(values.allegation) || yes(values.self_harm_concern) || yes(values.exploitation_concern) || hasSuggestion(suggestions, 'safeguarding'),
    link_monthly_reviews: true,
    link_quality_standards: true,
    manager_review_comment: linkingSummary(suggestions)
  }
}

function incidentPayload(values: Record<string, string>, suggestions?: SuggestedLink[], incidentType = 'other') {
  const actions = values.actions_required || values.follow_up_required
  const restraintUsed = yes(values.restraint_sanction) || yes(values.restraint)
  return {
    incident_datetime: values.occurred_at || values.missing_start || nowIso(),
    incident_type: incidentType,
    severity: severity(values, suggestions),
    risk_level: severity(values, suggestions),
    location: values.location || values.location_on_body,
    description: text(values, [
      'what_happened',
      'concern_summary',
      'observed_disclosed',
      'last_seen',
      'timeline',
      'search_actions',
      'return_circumstances',
      'body_map_observation'
    ]),
    narrative: text(values, ['what_happened', 'concern_summary', 'observed_disclosed', 'last_seen', 'return_circumstances', 'body_map_observation']),
    manager_review_status: yes(values.manager_review_required) || incidentType !== 'other' ? 'pending' : 'draft',
    follow_up_required: actions || values.follow_up_actions || values.immediate_safety_actions,
    outcome: text(values, ['injuries_damage', 'return_circumstances', 'return_home_interview', 'return_presentation', 'staff_action']),
    antecedent: values.antecedent_triggers || values.known_triggers,
    presentation: values.return_presentation,
    staff_response: values.staff_response || values.immediate_safety_actions || values.staff_action,
    trauma_informed_formulation: values.de_escalation || values.safeguarding_consideration || values.risk_review_required,
    child_voice: values.child_voice || values.child_words || values.child_explanation,
    restorative_follow_up: values.follow_up_actions || actions,
    manager_review_comment: [yes(values.manager_review_required) ? 'Manager review requested from recording workflow.' : undefined, linkingSummary(suggestions)].filter(Boolean).join(' ') || undefined,
    physical_intervention_used: restraintUsed,
    physical_intervention_type: restraintUsed ? values.restraint_sanction_detail || 'Recorded in workflow' : undefined,
    body_map_required: incidentType === 'health_incident' || Boolean(values.body_map_observation),
    body_map_json: values.body_map_observation ? {
      observation: values.body_map_observation,
      location_on_body: values.location_on_body,
      child_explanation: values.child_explanation,
      medical_advice: values.medical_advice
    } : undefined,
    external_notification_required: values.reg40_consideration === 'Required' || yes(values.police_informed) || values.external_referral === 'Yes - made',
    external_notification_details: text(values, ['reg40_consideration', 'police_informed', 'external_referral', 'who_informed', 'evidence'])
  }
}

function keyworkPayload(values: Record<string, string>) {
  return {
    session_date: values.session_date || todayIsoDate(),
    topic: values.topic,
    purpose: values.goals_discussed,
    summary: text(values, ['direct_work_completed', 'progress']),
    child_voice: values.child_voice,
    reflective_analysis: values.progress,
    actions_agreed: values.next_steps,
    next_session_date: undefined,
    status: 'draft'
  }
}

function familyPayload(values: Record<string, string>) {
  return {
    contact_datetime: values.contact_datetime || nowIso(),
    contact_type: values.contact_type,
    contact_person: values.contact_person,
    supervision_level: undefined,
    location: undefined,
    pre_contact_presentation: values.before_presentation,
    post_contact_presentation: text(values, ['during_presentation', 'after_presentation', 'positives']),
    child_voice: values.child_voice || values.wishes_feelings,
    concerns: values.worries || values.linked_risks_actions,
    follow_up_required: Boolean(values.follow_up_support || values.linked_risks_actions)
  }
}

function healthPayload(values: Record<string, string>, appointment = false) {
  const summary = appointment
    ? text(values, ['appointment_outcome', 'advice_received'])
    : text(values, ['health_update', 'medication_issue', 'appointment_outcome', 'advice_received'])
  return {
    record_type: appointment ? 'appointment_outcome' : values.medication_issue ? 'medication_health_note' : 'health_note',
    title: appointment ? values.appointment_type || 'Appointment outcome' : 'Medication / health note',
    summary,
    professional_name: values.professional_name,
    outcome: values.follow_up || values.appointment_outcome || values.advice_received,
    follow_up_required: Boolean(values.follow_up),
    next_action_date: undefined,
    event_datetime: values.appointment_datetime || nowIso()
  }
}

function documentEvidencePayload(childId: string, values: Record<string, string>) {
  return {
    title: values.document_title,
    description: values.document_summary || values.follow_up,
    evidence_type: 'document',
    source_type: 'document',
    source_id: childId,
    young_person_id: Number(childId),
    linked_regulation: values.document_type,
    tags: ['child_journey', 'uploaded_document']
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RecordingRequest
  const childId = body.childId
  const workflowId = body.workflowId
  const values = body.values || {}
  const suggestions = body.suggestions || []

  if (!childId || !workflowId) {
    return NextResponse.json({ ok: false, error: 'Choose a child and workflow before saving.' }, { status: 400 })
  }

  const childPath = `/young-people/${encodeURIComponent(childId)}`
  let path = ''
  let payload: Record<string, any> = {}
  let routeType: string = workflowId

  if (workflowId === 'daily-note') {
    path = `${childPath}/daily-notes`
    payload = dailyPayload(values, suggestions)
    routeType = 'daily-logs'
  } else if (workflowId === 'incidents') {
    path = `${childPath}/incidents`
    payload = incidentPayload(values, suggestions)
    routeType = 'incidents'
  } else if (workflowId === 'safeguarding') {
    path = `${childPath}/incidents`
    payload = incidentPayload(values, suggestions, 'safeguarding_concern')
    routeType = 'incidents'
  } else if (workflowId === 'missing') {
    path = `${childPath}/incidents`
    payload = incidentPayload(values, suggestions, 'missing_from_placement')
    routeType = 'incidents'
  } else if (workflowId === 'body-map') {
    path = `${childPath}/incidents`
    payload = incidentPayload(values, suggestions, 'health_incident')
    routeType = 'incidents'
  } else if (workflowId === 'keywork') {
    path = `${childPath}/keywork`
    payload = keyworkPayload(values)
    routeType = 'keywork'
  } else if (workflowId === 'family-contact') {
    path = `${childPath}/family/records`
    payload = familyPayload(values)
    routeType = 'family-contact'
  } else if (workflowId === 'health') {
    path = `${childPath}/health-records`
    payload = healthPayload(values)
    routeType = 'health'
  } else if (workflowId === 'appointment-outcome') {
    path = `${childPath}/health-records`
    payload = healthPayload(values, true)
    routeType = 'health'
  } else if (workflowId === 'documents') {
    path = '/os/evidence/attach'
    payload = documentEvidencePayload(childId, values)
    routeType = 'evidence'
  } else {
    return NextResponse.json({ ok: false, error: 'This recording workflow is not supported yet.' }, { status: 400 })
  }

  if (!Number.isFinite(Number(childId)) && path.startsWith('/young-people/')) {
    return NextResponse.json({
      ok: true,
      status: 'draft',
      routeType,
      message: 'Draft captured in the recording workflow. Live persistence needs a numeric child id from the backend.',
      limitation: 'Demo child ids cannot be written to the live young-people endpoints.'
    })
  }

  const result = await forward(path, payload)
  const recordId = result.payload.id || result.payload.record_id || result.payload.evidence_id || result.payload.record?.id

  if (!result.ok) {
    if (workflowId === 'documents') {
      return NextResponse.json({
        ok: true,
        status: 'draft',
        routeType,
        message: 'Document evidence draft captured, but the live evidence endpoint was unavailable.',
        limitation: `Live save failed: ${result.status}`
      })
    }
    return NextResponse.json({
      ok: false,
      error: result.payload.detail || result.payload.error || `Live save failed with status ${result.status}. Nothing was silently faked.`
    }, { status: result.status || 502 })
  }

  return NextResponse.json({
    ok: true,
    status: 'saved',
    recordId: recordId ? String(recordId) : undefined,
    routeType,
    sourceType: workflowId,
    message: result.payload.message || 'Record saved and linked to the child journey.',
    workflow: result.payload.workflow
  })
}
