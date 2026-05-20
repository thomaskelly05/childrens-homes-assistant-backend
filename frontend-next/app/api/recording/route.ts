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
  intent?: 'draft' | 'submit'
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

function liveSaveError(result: ForwardResult) {
  if (process.env.NODE_ENV === 'development') {
    return result.payload.detail || result.payload.error || `Live save failed with status ${result.status}.`
  }
  if (result.status === 401 || result.status === 403) return "I couldn't verify access to that record just now. Nothing was saved to the live record."
  if (result.status === 404) return 'This record workspace is not available yet. Nothing was saved to the live record.'
  return 'The live record could not be saved just now. Your local draft is still available.'
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

async function forward(path: string, body: Record<string, any> = {}, csrfToken?: string | null, method = 'POST'): Promise<ForwardResult> {
  const cookieHeader = (await cookies()).toString()
  const response = await fetch(`${BACKEND_ORIGIN}${path}`, {
    method,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {})
    },
    body: method === 'GET' ? undefined : JSON.stringify(body)
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, any>
  return { ok: response.ok, status: response.status, payload }
}

function dailyPayload(values: Record<string, string>, suggestions?: SuggestedLink[], intent: 'draft' | 'submit' = 'draft') {
  const actions = values.actions_required || values.follow_up_required
  return {
    note_date: todayIsoDate(),
    shift_type: 'day',
    status: 'draft',
    workflow_status: intent === 'submit' || yes(values.manager_review_required) ? 'submitted' : 'draft',
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

function educationPayload(values: Record<string, string>) {
  return {
    record_date: values.record_date || todayIsoDate(),
    attendance_status: values.attendance_status,
    provision_name: values.provision_name,
    behaviour_summary: values.behaviour_summary,
    learning_engagement: values.learning_engagement,
    issue_raised: values.issue_raised,
    action_taken: values.action_taken,
    professional_involved: values.professional_involved,
    achievement_note: values.achievement_note
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

function riskPayload(values: Record<string, string>) {
  return {
    category: values.category || 'other',
    title: values.title || 'Risk assessment',
    concern_summary: values.concern_summary,
    known_triggers: values.known_triggers,
    early_warning_signs: values.early_warning_signs,
    contextual_factors: values.contextual_factors,
    current_controls: values.current_controls,
    deescalation_strategies: values.deescalation_strategies,
    response_actions: values.response_actions,
    child_views: values.child_views,
    severity: values.severity || 'medium',
    likelihood: values.likelihood || 'medium',
    review_date: values.review_date,
    approval_status: 'draft',
    status: 'active'
  }
}

function supportPlanPayload(values: Record<string, string>) {
  return {
    plan_type: values.plan_type || 'support_plan',
    title: values.title || 'Support plan',
    presenting_need: values.presenting_need,
    summary: values.summary,
    child_voice: values.child_voice,
    proactive_strategies: values.proactive_strategies,
    pace_guidance: values.pace_guidance,
    triggers: values.triggers,
    protective_factors: values.protective_factors,
    staff_guidance: values.staff_guidance,
    review_date: values.review_date,
    approval_status: 'draft',
    status: 'draft'
  }
}

function childProfilePayloads(values: Record<string, string>) {
  return [
    {
      pathSuffix: '',
      method: 'PATCH',
      body: {
        preferred_name: values.preferred_name
      }
    },
    {
      pathSuffix: '/identity-profile',
      method: 'PUT',
      body: {
        religion_or_faith: values.religion_or_faith,
        cultural_identity: values.cultural_identity,
        interests: values.likes_dislikes,
        strengths_summary: values.strengths_summary,
        what_matters_to_me: text(values, ['pronouns', 'child_voice_summary']),
        important_dates: values.important_dates
      }
    },
    {
      pathSuffix: '/communication-profile',
      method: 'PUT',
      body: {
        communication_style: values.communication_style,
        sensory_profile: values.sensory_profile,
        routines_and_predictability: values.routines_and_predictability,
        what_helps: values.what_helps,
        what_to_avoid: values.likes_dislikes
      }
    },
    {
      pathSuffix: '/formulations',
      method: 'PUT',
      body: {
        relational_context: text(values, ['trusted_adults', 'family_network', 'professional_network']),
        known_triggers: values.known_triggers,
        protective_factors: values.current_plans,
        what_helps: values.what_helps,
        regulation_strategies: values.what_helps,
        child_voice_summary: values.child_voice_summary,
        review_date: values.review_date
      }
    }
  ].map((item) => ({
    ...item,
    body: Object.fromEntries(Object.entries(item.body).filter(([, value]) => value !== undefined && value !== ''))
  })).filter((item) => Object.keys(item.body).length > 0)
}

function childVoicePayload(values: Record<string, string>) {
  return {
    session_date: todayIsoDate(),
    topic: 'Child voice',
    purpose: values.how_communicated,
    summary: text(values, ['what_child_said', 'adult_response', 'what_changed', 'you_said_we_did']),
    child_voice: values.what_child_said,
    reflective_analysis: values.listened_to_evidence,
    actions_agreed: values.follow_up_needed || values.advocacy_complaint_link,
    status: 'draft'
  }
}

function wellbeingPayload(values: Record<string, string>) {
  return {
    record_type: 'wellbeing_check',
    title: 'Wellbeing check',
    summary: text(values, ['mood_presentation', 'sleep', 'appetite', 'emotional_regulation', 'relationships', 'worries', 'what_helped']),
    outcome: values.what_needs_follow_up,
    follow_up_required: Boolean(values.what_needs_follow_up),
    event_datetime: nowIso()
  }
}

function relationshipPayload(values: Record<string, string>) {
  return {
    contact_datetime: nowIso(),
    contact_type: values.family_contact ? 'family' : values.peer_relationship ? 'peer' : 'relationship',
    contact_person: values.family_contact || values.peer_relationship || values.trusted_adult || 'Relationship record',
    supervision_level: undefined,
    location: undefined,
    pre_contact_presentation: values.worries_concerns,
    post_contact_presentation: text(values, ['positive_interaction', 'repair_conversation', 'impact_for_child']),
    child_voice: values.child_voice,
    concerns: values.worries_concerns,
    follow_up_required: Boolean(values.worries_concerns || values.impact_for_child)
  }
}

function medicationPayload(values: Record<string, string>) {
  return {
    medication_name: values.medication_name,
    dose: values.dose,
    scheduled_time: values.administered_time,
    administered_time: values.administered_time || nowIso(),
    status: values.administration_status || 'administered',
    refusal_reason: values.reason,
    omission_reason: values.administration_status === 'missed' ? values.reason : undefined,
    error_flag: yes(values.medication_error) || values.administration_status === 'error',
    error_details: text(values, ['side_effects', 'action_taken']),
    manager_review_status: yes(values.medication_error) || values.administration_status === 'error' ? 'pending' : 'not_required'
  }
}

function handoverPayload(values: Record<string, string>) {
  return {
    shift_type: values.shift_type || 'handover',
    handover_datetime: values.handover_datetime,
    title: 'Shift Handover',
    summary: text(values, ['staff_handing_over', 'staff_receiving', 'children_summary', 'emotional_atmosphere', 'key_messages']),
    risks_to_monitor: text(values, ['risks_to_know', 'incidents', 'missing_away', 'medication']),
    positive_updates: values.emotional_atmosphere,
    actions_required: values.actions_outstanding || values.manager_notes,
    status: 'draft'
  }
}

function documentEvidencePayload(childId: string, values: Record<string, string>) {
  return {
    title: values.document_title || values.finding || values.review_period || 'Child journey evidence',
    description: text(values, ['document_summary', 'impact_for_child', 'linked_chronology', 'finding', 'action_response', 'impact_for_children', 'evidence_reviewed', 'child_outcomes', 'safeguarding', 'workforce', 'leadership', 'improvement_actions', 'follow_up']),
    evidence_type: 'document',
    source_type: 'document',
    source_id: childId,
    young_person_id: Number(childId),
    linked_regulation: values.document_type || (values.finding ? 'Reg 44' : values.review_period ? 'Reg 45' : undefined),
    tags: ['child_journey', 'uploaded_document', values.document_type, values.review_period ? 'reg45' : undefined, values.finding ? 'reg44' : undefined].filter(Boolean)
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RecordingRequest
  const childId = body.childId
  const workflowId = body.workflowId
  const values = body.values || {}
  const suggestions = body.suggestions || []
  const intent = body.intent === 'submit' ? 'submit' : 'draft'

  if (!childId || !workflowId) {
    return NextResponse.json({ ok: false, error: 'Choose a child and workflow before saving.' }, { status: 400 })
  }

  const childPath = `/young-people/${encodeURIComponent(childId)}`
  if (!Number.isFinite(Number(childId))) {
    return NextResponse.json({
      ok: false,
      error: 'Choose a child from the live children list before saving.'
    }, { status: 400 })
  }

  let path = ''
  let payload: Record<string, any> = {}
  let routeType: string = workflowId
  let submitPath: string | undefined
  let createMethod = 'POST'

  if (workflowId === 'child-profile') {
    const payloads = childProfilePayloads(values)
    if (!payloads.length) {
      return NextResponse.json({ ok: false, error: 'Add at least one About Me field before saving.' }, { status: 400 })
    }
    const results: ForwardResult[] = []
    for (const item of payloads) {
      const result = await forward(`${childPath}${item.pathSuffix}`, item.body, request.headers.get('x-csrf-token'), item.method)
      results.push(result)
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: liveSaveError(result) }, { status: result.status || 502 })
      }
    }
    return NextResponse.json({
      ok: true,
      status: intent === 'submit' ? 'submitted' : 'draft',
      recordId: childId,
      routeType: 'young-people',
      sourceType: workflowId,
      message: 'About Me saved to the live child profile sections.',
      linkage: { sections_updated: results.length }
    })
  } else if (workflowId === 'child-voice') {
    path = `${childPath}/keywork`
    payload = childVoicePayload(values)
    routeType = 'keywork'
    submitPath = '/young-people/keywork/{id}/submit'
  } else if (workflowId === 'wellbeing-check') {
    path = `${childPath}/health-records`
    payload = wellbeingPayload(values)
    routeType = 'health'
    submitPath = '/young-people/health-records/{id}/submit'
  } else if (workflowId === 'relationship-record') {
    path = `${childPath}/family/records`
    payload = relationshipPayload(values)
    routeType = 'family-contact'
    submitPath = '/young-people/family/records/{id}/submit'
  } else if (workflowId === 'daily-note') {
    path = `${childPath}/daily-notes`
    payload = dailyPayload(values, suggestions, intent)
    routeType = 'daily-logs'
    submitPath = '/young-people/daily-notes/{id}/submit'
  } else if (workflowId === 'incidents') {
    path = `${childPath}/incidents`
    payload = incidentPayload(values, suggestions)
    routeType = 'incidents'
    submitPath = '/young-people/incidents/{id}/submit'
  } else if (workflowId === 'safeguarding') {
    path = `${childPath}/incidents`
    payload = incidentPayload(values, suggestions, 'safeguarding_concern')
    routeType = 'incidents'
    submitPath = '/young-people/incidents/{id}/submit'
  } else if (workflowId === 'missing') {
    path = `${childPath}/incidents`
    payload = incidentPayload(values, suggestions, 'missing_from_placement')
    routeType = 'incidents'
    submitPath = '/young-people/incidents/{id}/submit'
  } else if (workflowId === 'body-map') {
    path = `${childPath}/incidents`
    payload = incidentPayload(values, suggestions, 'health_incident')
    routeType = 'incidents'
    submitPath = '/young-people/incidents/{id}/submit'
  } else if (workflowId === 'keywork') {
    path = `${childPath}/keywork`
    payload = keyworkPayload(values)
    routeType = 'keywork'
    submitPath = '/young-people/keywork/{id}/submit'
  } else if (workflowId === 'family-contact') {
    path = `${childPath}/family/records`
    payload = familyPayload(values)
    routeType = 'family-contact'
    submitPath = '/young-people/family/records/{id}/submit'
  } else if (workflowId === 'education-update') {
    path = `${childPath}/education-records`
    payload = educationPayload(values)
    routeType = 'education-records'
    submitPath = '/young-people/education-records/{id}/submit'
  } else if (workflowId === 'health') {
    path = `${childPath}/health-records`
    payload = healthPayload(values)
    routeType = 'health'
    submitPath = '/young-people/health-records/{id}/submit'
  } else if (workflowId === 'medication-record') {
    path = `${childPath}/medication-records`
    payload = medicationPayload(values)
    routeType = 'medication'
    submitPath = '/young-people/medication-records/{id}/submit'
  } else if (workflowId === 'physical-intervention') {
    path = `${childPath}/incidents`
    payload = {
      ...incidentPayload({
        ...values,
        what_happened: values.reason,
        de_escalation: values.de_escalation_attempted,
        injuries_damage: values.injury,
        child_voice: values.child_view,
        staff_response: values.staff_debrief,
        follow_up_required: values.plan_update,
        restraint: 'Yes',
        manager_review_required: 'Yes',
        restraint_sanction_detail: text(values, ['holds_used', 'duration_minutes', 'manager_review', 'repair_work'])
      }, suggestions, 'physical_intervention'),
      physical_intervention_used: true,
      physical_intervention_duration_minutes: Number(values.duration_minutes) || undefined,
      physical_intervention_reason: values.reason
    }
    routeType = 'incidents'
    submitPath = '/young-people/incidents/{id}/submit'
  } else if (workflowId === 'risk-assessment') {
    path = `${childPath}/risk`
    payload = riskPayload(values)
    routeType = 'risk'
    submitPath = '/young-people/risk/{id}/submit'
  } else if (workflowId === 'support-plan') {
    path = `${childPath}/plans`
    payload = supportPlanPayload(values)
    routeType = 'plans'
    submitPath = '/young-people/plans/{id}/submit'
  } else if (workflowId === 'shift-handover') {
    path = `${childPath}/handover`
    payload = handoverPayload(values)
    routeType = 'handover'
    submitPath = '/young-people/handover/{id}/submit'
  } else if (workflowId === 'appointment-outcome') {
    path = `${childPath}/health-records`
    payload = healthPayload(values, true)
    routeType = 'health'
    submitPath = '/young-people/health-records/{id}/submit'
  } else if (workflowId === 'documents') {
    path = '/os/evidence/attach'
    payload = documentEvidencePayload(childId, values)
    routeType = 'evidence'
  } else if (workflowId === 'reg44-action' || workflowId === 'reg45-evidence') {
    path = '/os/evidence/attach'
    payload = documentEvidencePayload(childId, values)
    routeType = 'evidence'
  } else {
    return NextResponse.json({ ok: false, error: 'This recording workflow is not supported yet.' }, { status: 400 })
  }

  const result = await forward(path, payload, request.headers.get('x-csrf-token'), createMethod)
  const recordId = result.payload.id || result.payload.record_id || result.payload.evidence_id || result.payload.record?.id

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: liveSaveError(result)
    }, { status: result.status || 502 })
  }

  let submitResult: ForwardResult | undefined
  if (intent === 'submit' && submitPath && recordId) {
    submitResult = await forward(submitPath.replace('{id}', encodeURIComponent(String(recordId))), {}, request.headers.get('x-csrf-token'))
    if (!submitResult.ok) {
      return NextResponse.json({
        ok: true,
        status: 'draft',
        recordId: String(recordId),
        routeType,
        sourceType: workflowId,
        message: 'The record was saved as a draft, but the submit step could not complete.',
        limitation: liveSaveError(submitResult),
        workflow: result.payload.workflow,
        linkage: result.payload.workflow?.post_save_intelligence
      })
    }
  }

  return NextResponse.json({
    ok: true,
    status: submitResult?.ok ? 'submitted' : intent === 'submit' && !submitPath ? 'submitted' : 'draft',
    recordId: recordId ? String(recordId) : undefined,
    routeType,
    sourceType: workflowId,
    message: result.payload.message || 'Record saved and linked to the child journey.',
    workflow: result.payload.workflow,
    linkage: result.payload.workflow?.post_save_intelligence
  })
}
