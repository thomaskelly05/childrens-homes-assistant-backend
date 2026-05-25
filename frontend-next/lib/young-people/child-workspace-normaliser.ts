import { text } from '@/lib/os-api/bundles'
import type { ChildProfileBundle } from '@/lib/os-api/bundles'
import type { OsWorkspace } from '@/lib/os-api/workspaces'
import {
  childActionsHref,
  childAlertsHref,
  childBehaviourSupportHref,
  childBodyMapHref,
  childCarePlanningHref,
  childArchiveHref,
  childChronologyHref,
  childChronologyStoryHref,
  childLifeEchoHref,
  childPlanImpactsHref,
  childComplaintHref,
  childDailyNoteHref,
  childDocumentsHref,
  childEducationHref,
  childFamilyTimeHref,
  childFormalSubmissionHref,
  childHandoverHref,
  childHealthMedicationHref,
  childIncidentHref,
  childJourneyHref,
  childKeyworkHref,
  childMissingEpisodeHref,
  childOrbHref,
  childPhysicalInterventionHref,
  childRecordHref,
  childReviewsHref,
  childRoomSearchHref,
  childSafeguardingHref,
  childTemplatesHref,
  childVoiceHref
} from '@/lib/navigation/scope-routes'

export type ChildWorkspaceOverviewField = {
  label: string
  value: string
}

export type ChildWorkspacePlanCard = {
  id: string
  title: string
  status: string
  type: string
  href?: string
}

export type ChildWorkspaceActionItem = {
  id: string
  title: string
  status: string
  dueDate: string
  priority: string
}

export type ChildWorkspaceChronologyItem = {
  id: string
  title: string
  when: string
  summary: string
}

export type ChildWorkspaceVoiceItem = {
  id: string
  label: string
  excerpt: string
  when: string
}

export type ChildWorkspaceQuickAction = {
  label: string
  href: string
  testId?: string
}

export type ChildWorkspaceOverviewViewModel = {
  child: {
    id: string
    displayName: string
    preferredName: string
    age: string
    dateOfBirth: string
    homeName: string
    placementStatus: string
    keyworkerName: string
    riskLevel: string
    profilePhotoPath: string
    legalStatus: string
  }
  about: ChildWorkspaceOverviewField[]
  whatMatters: ChildWorkspaceOverviewField[]
  support: ChildWorkspaceOverviewField[]
  today: {
    summary: string
    chronologyCount: number
    openActionsCount: number
    recentItems: ChildWorkspaceChronologyItem[]
    needsRecording: string[]
    needsReview: string[]
  }
  safeguarding: {
    riskLevel: string
    safeguardingStatus: string
    missingStatus: string
    activeConcernCount: number
    summary: string
    fields: ChildWorkspaceOverviewField[]
  }
  plans: ChildWorkspacePlanCard[]
  childVoice: ChildWorkspaceVoiceItem[]
  actions: ChildWorkspaceActionItem[]
  documents: ChildWorkspacePlanCard[]
  emptyStates: Record<string, string>
  warnings: string[]
  routes: {
    recordDailyNote: string
    recordIncident: string
    recordSafeguarding: string
    safeguarding: string
    recordKeywork: string
    recordHealth: string
    recordEducation: string
    recordFamilyTime: string
    chronology: string
    chronologyStory: string
    archive: string
    lifeecho: string
    planImpacts: string
    actions: string
    documents: string
    journey: string
    orb: string
    orbRecordQuality: string
    orbSafeguardingThemes: string
    orbChildJourney: string
    orbOfstedEvidence: string
  }
  quickActions: ChildWorkspaceQuickAction[]
  evidenceActions: ChildWorkspaceQuickAction[]
}

const EMPTY = 'Not recorded yet'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}

function safeString(value: unknown, fallback = EMPTY): string {
  if (value === undefined || value === null) return fallback
  const raw = String(value).trim()
  if (!raw || raw === 'null' || raw === 'undefined') return fallback
  return raw
}

function truncate(value: string, max = 160): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trim()}…`
}

function keyWorkerName(identity: Record<string, unknown>): string {
  const kw = identity.key_worker
  if (kw && typeof kw === 'object') {
    return text(kw as Record<string, unknown>, ['full_name', 'display_name', 'name', 'email'], EMPTY)
  }
  return text(identity, ['key_worker_name', 'keyWorkerName'], EMPTY)
}

function planCard(row: Record<string, unknown>, childId: string): ChildWorkspacePlanCard {
  const id = safeString(row.id || row.document_id || row.plan_id, '')
  const title = text(row, ['title', 'name', 'document_type', 'plan_type', 'category'], 'Plan')
  const type = text(row, ['document_type', 'plan_type', 'category', 'type'], 'plan')
  const status = text(row, ['status', 'review_status', 'plan_status'], 'current')
  const docId = safeString(row.id || row.document_id, '')
  return {
    id: id || title,
    title,
    status,
    type,
    href: docId ? `/young-people/${encodeURIComponent(childId)}/documents/${encodeURIComponent(docId)}` : `/documents?child_id=${encodeURIComponent(childId)}`
  }
}

function chronologyItem(row: Record<string, unknown>): ChildWorkspaceChronologyItem {
  return {
    id: safeString(row.id || row.event_id, 'item'),
    title: text(row, ['title', 'event_title', 'record_type', 'eventType', 'sourceType'], 'Record'),
    when: text(row, ['occurred_at', 'occurredAt', 'event_date', 'created_at', 'createdAt', 'date'], ''),
    summary: truncate(text(row, ['summary', 'description', 'fullText'], 'Summary not recorded yet'), 120)
  }
}

function actionItem(row: Record<string, unknown>): ChildWorkspaceActionItem {
  return {
    id: safeString(row.id, 'action'),
    title: text(row, ['title', 'name'], 'Action'),
    status: text(row, ['status'], 'open'),
    dueDate: text(row, ['due_date', 'dueDate'], ''),
    priority: text(row, ['priority'], 'medium')
  }
}

function rowAsRecord(row: unknown): Record<string, unknown> {
  return row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
}

function extractChildVoice(
  rows: Array<Record<string, unknown>>,
  limit = 4
): ChildWorkspaceVoiceItem[] {
  const items: ChildWorkspaceVoiceItem[] = []
  for (const row of rows) {
    const voice =
      row.child_voice ||
      row.young_person_voice ||
      row.childVoice ||
      row.voice ||
      row.wishes_and_feelings
    if (!voice) continue
    const excerpt = truncate(safeString(voice, ''), 140)
    if (!excerpt || excerpt === EMPTY) continue
    items.push({
      id: safeString(row.id, `voice-${items.length}`),
      label: text(row, ['record_type', 'title', 'event_title'], 'Child voice'),
      excerpt,
      when: text(row, ['occurred_at', 'created_at', 'event_date'], '')
    })
    if (items.length >= limit) break
  }
  return items
}

function safeguardingSummary(safety: Record<string, unknown>): { count: number; summary: string } {
  const concerns = asArray<Record<string, unknown>>(safety.active_concerns)
  const count = concerns.length
  if (!count) {
    return {
      count: 0,
      summary: 'No active safeguarding concerns returned for this child.'
    }
  }
  const types = concerns
    .map((row) => text(row, ['concern_type', 'category', 'status', 'severity'], ''))
    .filter((value) => value && value !== EMPTY)
  const unique = [...new Set(types)].slice(0, 3)
  return {
    count,
    summary: unique.length
      ? `${count} active concern${count === 1 ? '' : 's'} — ${unique.join(', ')}`
      : `${count} active concern${count === 1 ? '' : 's'} on record`
  }
}

export type ChildWorkspaceNormaliserInput = {
  childId: string
  workspace?: OsWorkspace & { documents?: unknown[]; lifecycle?: Record<string, unknown> }
  profileBundle?: ChildProfileBundle
  homeName?: string
}

export function normaliseChildWorkspaceOverview(input: ChildWorkspaceNormaliserInput): ChildWorkspaceOverviewViewModel {
  const childId = safeString(input.childId, '0')
  const person = input.workspace?.youngPerson
  const identity = (input.profileBundle?.identity || {}) as Record<string, unknown>
  const personhood = (input.profileBundle?.personhood || {}) as Record<string, unknown>
  const communication = (input.profileBundle?.communication || {}) as Record<string, unknown>
  const safety = (input.profileBundle?.safety || {}) as Record<string, unknown>

  const displayName = safeString(
    person?.displayName ||
      identity.preferred_name ||
      identity.first_name ||
      identity.display_name,
    `Young person ${childId}`
  )
  const preferredName = safeString(
    person?.preferredName || identity.preferred_name || identity.first_name,
    displayName
  )
  const riskLevel = safeString(
    person?.riskLevel || identity.summary_risk_level || identity.risk_level || safety.current_risk_level,
    'not recorded'
  )

  const chronology = asArray<Record<string, unknown>>(
    input.profileBundle?.recent_chronology?.length
      ? input.profileBundle.recent_chronology
      : input.workspace?.chronology
  )
  const actions = asArray<Record<string, unknown>>(
    input.profileBundle?.actions?.length ? input.profileBundle.actions : input.workspace?.actions
  )
  const documents = asArray<Record<string, unknown>>(
    input.profileBundle?.documents?.length
      ? input.profileBundle.documents
      : (input.workspace as { documents?: unknown[] })?.documents
  )
  const plans = asArray<Record<string, unknown>>(input.profileBundle?.plans)
  const evidence = asArray<Record<string, unknown>>(input.profileBundle?.evidence || input.workspace?.evidence)

  const openActions = actions.filter((row) => {
    const status = safeString(row.status, 'open').toLowerCase()
    return status !== 'completed' && status !== 'closed'
  })

  const sg = safeguardingSummary(safety)
  const voiceFromChronology = extractChildVoice(chronology)
  const voiceFromEvidence = extractChildVoice(evidence)
  const childVoice = [...voiceFromChronology, ...voiceFromEvidence].slice(0, 4)

  const routes = {
    recordDailyNote: `/record?child_id=${encodeURIComponent(childId)}&type=daily-note`,
    recordIncident: `/record?child_id=${encodeURIComponent(childId)}&type=incident`,
    recordSafeguarding: `/record?child_id=${encodeURIComponent(childId)}&type=safeguarding-concern`,
    recordKeywork: `/record?child_id=${encodeURIComponent(childId)}&type=keywork`,
    recordHealth: `/record?child_id=${encodeURIComponent(childId)}&type=health-appointment`,
    recordEducation: `/record?child_id=${encodeURIComponent(childId)}&type=education-note`,
    recordFamilyTime: `/record?child_id=${encodeURIComponent(childId)}&type=family-time`,
    chronology: childChronologyHref(childId),
    chronologyStory: childChronologyStoryHref(childId),
    archive: childArchiveHref(childId),
    lifeecho: childLifeEchoHref(childId),
    planImpacts: childPlanImpactsHref(childId),
    actions: `/actions?child_id=${encodeURIComponent(childId)}`,
    documents: `/documents?child_id=${encodeURIComponent(childId)}`,
    journey: `/young-people/${encodeURIComponent(childId)}/journey`,
    safeguarding: `/record?child_id=${encodeURIComponent(childId)}&type=safeguarding-concern`,
    orb: childOrbHref(childId),
    orbRecordQuality: childOrbHref(childId),
    orbSafeguardingThemes: childOrbHref(childId, 'safeguarding_themes'),
    orbChildJourney: childOrbHref(childId, 'child_journey_summary'),
    orbOfstedEvidence: childOrbHref(childId, 'ofsted_evidence_review')
  }

  const emptyStates: Record<string, string> = {
    communication: 'No communication profile has been added yet.',
    whatMatters: 'Nothing has been recorded about what matters to this child yet.',
    support: 'No support guidance has been recorded yet.',
    childVoice: 'No child voice notes are available yet.',
    actions: 'No current actions are linked.',
    chronology: 'No recent chronology entries are available.',
    plans: 'No plans are available yet.',
    documents: 'No documents are linked yet.'
  }

  const about: ChildWorkspaceOverviewField[] = [
    { label: 'Preferred name', value: preferredName },
    { label: 'Age', value: person?.age != null ? String(person.age) : safeString(identity.age, EMPTY) },
    { label: 'Date of birth', value: safeString(person?.dateOfBirth || identity.date_of_birth, EMPTY) },
    { label: 'Home', value: safeString(input.homeName, EMPTY) },
    { label: 'Placement', value: safeString(person?.placementStatus || identity.placement_status, EMPTY) },
    { label: 'Key worker', value: keyWorkerName(identity) },
    { label: 'Legal status', value: safeString(person?.legalStatus || identity.legal_status_summary, EMPTY) },
    { label: 'Placing authority', value: safeString(identity.placing_authority, EMPTY) }
  ]

  const whatMatters: ChildWorkspaceOverviewField[] = [
    { label: 'What matters', value: safeString(personhood.what_matters_to_me, emptyStates.whatMatters) },
    { label: 'Interests', value: safeString(personhood.interests, EMPTY) },
    { label: 'Strengths', value: safeString(personhood.strengths, EMPTY) },
    { label: 'Aspirations', value: safeString(personhood.aspirations, EMPTY) },
    { label: 'Cultural identity', value: safeString(personhood.cultural_identity, EMPTY) }
  ]

  const support: ChildWorkspaceOverviewField[] = [
    { label: 'Communication', value: safeString(communication.communication_style, emptyStates.communication) },
    { label: 'Sensory needs', value: safeString(communication.sensory_needs, EMPTY) },
    { label: 'What helps', value: safeString(communication.what_helps, EMPTY) },
    { label: 'What does not help', value: safeString(communication.what_does_not_help, EMPTY) },
    { label: 'Routines', value: safeString(communication.routines, EMPTY) }
  ]

  const recentChronology = chronology.slice(0, 4).map((row) => chronologyItem(rowAsRecord(row)))

  const needsReview = openActions
    .filter((row) => /high|urgent|overdue/i.test(`${row.priority} ${row.status}`))
    .slice(0, 3)
    .map((row) => text(row as Record<string, unknown>, ['title'], 'Review needed'))

  return {
    child: {
      id: childId,
      displayName,
      preferredName,
      age: person?.age != null ? String(person.age) : safeString(identity.age, EMPTY),
      dateOfBirth: safeString(person?.dateOfBirth || identity.date_of_birth, EMPTY),
      homeName: safeString(input.homeName, EMPTY),
      placementStatus: safeString(person?.placementStatus || identity.placement_status, EMPTY),
      keyworkerName: keyWorkerName(identity),
      riskLevel,
      profilePhotoPath: safeString(
        person?.profilePhotoPath || person?.photoUrl || identity.profile_photo_path || identity.photo_url,
        ''
      ),
      legalStatus: safeString(person?.legalStatus || identity.legal_status_summary, EMPTY)
    },
    about,
    whatMatters,
    support,
    today: {
      summary:
        chronology.length || openActions.length
          ? `${chronology.length} recent record${chronology.length === 1 ? '' : 's'} · ${openActions.length} open action${openActions.length === 1 ? '' : 's'}`
          : 'A calm start — check what matters before you record.',
      chronologyCount: chronology.length,
      openActionsCount: openActions.length,
      recentItems: recentChronology,
      needsRecording: chronology.length ? [] : ['Daily note not yet visible in recent chronology'],
      needsReview
    },
    safeguarding: {
      riskLevel,
      safeguardingStatus: safeString(safety.safeguarding_status, 'not recorded'),
      missingStatus: safeString(safety.missing_status, 'not recorded'),
      activeConcernCount: sg.count,
      summary: sg.summary,
      fields: [
        { label: 'Risk level', value: riskLevel },
        { label: 'Safeguarding', value: safeString(safety.safeguarding_status, EMPTY) },
        { label: 'Missing from care', value: safeString(safety.missing_status, EMPTY) }
      ]
    },
    plans: plans.length
      ? plans.slice(0, 6).map((row) => planCard(row as Record<string, unknown>, childId))
      : documents
          .filter((row) => /plan|placement|behaviour|health|education|missing/i.test(text(row as Record<string, unknown>, ['document_type', 'category', 'title'], '')))
          .slice(0, 6)
          .map((row) => planCard(row as Record<string, unknown>, childId)),
    childVoice,
    actions: openActions.slice(0, 6).map((row) => actionItem(rowAsRecord(row))),
    documents: documents.slice(0, 6).map((row) => planCard(row as Record<string, unknown>, childId)),
    emptyStates,
    warnings: [],
    routes,
    quickActions: [
      { label: 'Record something', href: childRecordHref(childId), testId: 'child-quick-record' },
      { label: 'Daily note', href: routes.recordDailyNote, testId: 'child-quick-daily-note' },
      { label: 'Incident', href: routes.recordIncident, testId: 'child-quick-incident' },
      { label: 'Safeguarding concern', href: routes.recordSafeguarding, testId: 'child-quick-safeguarding' },
      { label: 'Keywork', href: routes.recordKeywork, testId: 'child-quick-keywork' },
      { label: 'Family time', href: routes.recordFamilyTime, testId: 'child-quick-family-time' },
      { label: 'Education note', href: routes.recordEducation, testId: 'child-quick-education' },
      { label: 'Health / medication', href: routes.recordHealth, testId: 'child-quick-health' },
      { label: 'Behaviour support', href: childBehaviourSupportHref(childId), testId: 'child-quick-behaviour' },
      { label: 'Missing episode', href: childMissingEpisodeHref(childId), testId: 'child-quick-missing' },
      { label: 'Chronology', href: routes.chronology, testId: 'child-quick-chronology' },
      { label: 'Archive', href: routes.archive, testId: 'child-quick-archive' },
      { label: 'LifeEcho', href: routes.lifeecho, testId: 'child-quick-lifeecho' },
      { label: 'Plan impacts', href: routes.planImpacts, testId: 'child-quick-plan-impacts' },
      { label: 'Actions', href: routes.actions, testId: 'child-quick-actions' },
      { label: 'Documents / plans', href: routes.documents, testId: 'child-quick-documents' },
      { label: 'Handover', href: childHandoverHref(childId), testId: 'child-quick-handover' },
      { label: 'Recording review', href: childReviewsHref(childId), testId: 'child-quick-reviews' },
      { label: 'Alerts', href: childAlertsHref(childId), testId: 'child-quick-alerts' },
      { label: 'Child voice', href: childVoiceHref(childId), testId: 'child-quick-voice' },
      { label: 'Care planning', href: childCarePlanningHref(childId), testId: 'child-quick-care-planning' },
      { label: 'Ask ORB', href: routes.orbRecordQuality, testId: 'child-quick-orb' }
    ],
    evidenceActions: [
      { label: 'Physical intervention', href: childPhysicalInterventionHref(childId), testId: 'child-evidence-physical-intervention' },
      { label: 'Body map / injury', href: childBodyMapHref(childId), testId: 'child-evidence-body-map' },
      { label: 'Room search', href: childRoomSearchHref(childId), testId: 'child-evidence-room-search' },
      { label: 'Complaint', href: childComplaintHref(childId), testId: 'child-evidence-complaint' },
      { label: 'Templates', href: childTemplatesHref(childId), testId: 'child-evidence-templates' },
      { label: 'Formal submission', href: childFormalSubmissionHref(childId), testId: 'child-evidence-formal-submission' },
      { label: 'Manager review', href: childReviewsHref(childId), testId: 'child-evidence-manager-review' },
      { label: 'Child journey', href: childJourneyHref(childId), testId: 'child-evidence-journey' }
    ]
  }
}
