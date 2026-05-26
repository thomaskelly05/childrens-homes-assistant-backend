/**
 * Single source of truth for scope-aware browser routes (IDs only — no names, narratives or draft bodies).
 * API path helpers live beside their clients; never use /os/young-people for browser navigation.
 */

import { childWorkspaceHref } from '@/lib/navigation/child-workspace-routes'

export type ScopeOrbMode =
  | 'record_quality_review'
  | 'safeguarding_themes'
  | 'child_journey_summary'
  | 'ofsted_evidence_review'
  | 'manager_daily_brief'
  | 'action_priority'
  | 'governance_briefing'
  | 'staff_support'
  | 'general_operational_question'
  | 'chronology_story_review'
  | 'archive_summary'
  | 'lifeecho_memory_support'
  | 'plan_impact_review'
  | 'document_target_extraction'

function enc(id: string | number) {
  return encodeURIComponent(String(id))
}

function recordHref(params: { childId?: string | number; homeId?: string | number; type?: string; draftId?: string }) {
  const q = new URLSearchParams()
  if (params.childId != null) q.set('child_id', String(params.childId))
  if (params.homeId != null) q.set('home_id', String(params.homeId))
  if (params.type) q.set('type', params.type)
  if (params.draftId) q.set('draft_id', params.draftId)
  const qs = q.toString()
  return qs ? `/record?${qs}` : '/record'
}

function childPath(childId: string | number, segment: string) {
  return `/young-people/${enc(childId)}/${segment}`
}

function homePath(homeId: string | number, segment: string) {
  return `/homes/${enc(homeId)}/${segment}`
}

function assistantOrbHref(params: {
  scope?: 'child' | 'home' | 'governance' | 'workforce' | 'inspection' | 'provider'
  childId?: string | number
  homeId?: string | number
  mode?: ScopeOrbMode | string
  query?: string
}) {
  const q = new URLSearchParams()
  if (params.scope) q.set('scope', params.scope)
  if (params.childId != null) q.set('young_person_id', String(params.childId))
  if (params.homeId != null) q.set('home_id', String(params.homeId))
  if (params.mode) q.set('mode', params.mode)
  if (params.query) q.set('q', params.query)
  const qs = q.toString()
  return qs ? `/assistant/orb?${qs}` : '/assistant/orb'
}

// —— Child workspace ——

export function childOverviewHref(childId: string | number) {
  return childWorkspaceHref(childId)
}

export function childRecordHref(childId: string | number, type?: string) {
  return recordHref({ childId, type })
}

export function childDailyNoteHref(childId: string | number) {
  return recordHref({ childId, type: 'daily-note' })
}

export function childIncidentHref(childId: string | number) {
  return recordHref({ childId, type: 'incident' })
}

export function childSafeguardingHref(childId: string | number) {
  return recordHref({ childId, type: 'safeguarding-concern' })
}

export function childHealthMedicationHref(childId: string | number) {
  return recordHref({ childId, type: 'health-appointment' })
}

export function childEducationHref(childId: string | number) {
  return recordHref({ childId, type: 'education-note' })
}

export function childFamilyTimeHref(childId: string | number) {
  return recordHref({ childId, type: 'family-time' })
}

export function childKeyworkHref(childId: string | number) {
  return recordHref({ childId, type: 'keywork' })
}

export function childBehaviourSupportHref(childId: string | number) {
  return recordHref({ childId, type: 'behaviour-support' })
}

export function childMissingEpisodeHref(childId: string | number) {
  return recordHref({ childId, type: 'missing-episode' })
}

export function childPhysicalInterventionHref(childId: string | number) {
  return recordHref({ childId, type: 'physical-intervention' })
}

export function childBodyMapHref(childId: string | number) {
  return recordHref({ childId, type: 'injury-body-map' })
}

export function childRoomSearchHref(childId: string | number) {
  return recordHref({ childId, type: 'room-search' })
}

export function childComplaintHref(childId: string | number) {
  return recordHref({ childId, type: 'complaint' })
}

export function childChronologyHref(childId: string | number) {
  return childPath(childId, 'chronology')
}

export function childArchiveHref(childId: string | number) {
  return childPath(childId, 'archive')
}

export function childChronologyStoryHref(childId: string | number) {
  return childPath(childId, 'chronology')
}

export function childLifeEchoHref(childId: string | number) {
  return childPath(childId, 'lifeecho')
}

export function childPlanImpactsHref(childId: string | number) {
  return childPath(childId, 'plan-impacts')
}

export function childActionsHref(childId: string | number) {
  return `/actions?child_id=${enc(childId)}`
}

export function childDocumentsHref(childId: string | number) {
  return `/documents?child_id=${enc(childId)}`
}

export function childHandoverHref(childId: string | number) {
  return `/handover?child_id=${enc(childId)}`
}

export function childReviewsHref(childId: string | number) {
  return `/record/reviews?child_id=${enc(childId)}`
}

export function childAlertsHref(childId: string | number) {
  return `/record/alerts?child_id=${enc(childId)}`
}

export function childVoiceHref(childId: string | number) {
  return childPath(childId, 'child-voice/new')
}

export function childCarePlanningHref(childId: string | number) {
  return childPath(childId, 'plans')
}

export function childOrbHref(childId: string | number, mode: ScopeOrbMode = 'record_quality_review') {
  return assistantOrbHref({ scope: 'child', childId, mode })
}

export function childJourneyHref(childId: string | number) {
  return childPath(childId, 'journey')
}

export function childTemplatesHref(childId: string | number) {
  return `/record?child_id=${enc(childId)}#templates`
}

export function childFormalSubmissionHref(childId: string | number) {
  return `/record/governance?child_id=${enc(childId)}`
}

// —— Home workspace ——

export function homeWorkspaceHref(homeId: string | number) {
  return homePath(homeId, 'workspace')
}

export function homeDailyBriefHref(homeId: string | number) {
  return `/command-centre/briefing?home_id=${enc(homeId)}`
}

export function homeHandoverHref(homeId: string | number) {
  return `/handover?home_id=${enc(homeId)}`
}

export function homeRecordingAlertsHref(homeId: string | number) {
  return `/record/alerts?home_id=${enc(homeId)}`
}

export function homeRecordingReviewsHref(homeId: string | number) {
  return `/record/reviews?home_id=${enc(homeId)}`
}

export function homeSafeguardingHref(homeId: string | number) {
  return `/safeguarding?home_id=${enc(homeId)}`
}

export function homeNotificationsHref(homeId: string | number) {
  return `/notifications?home_id=${enc(homeId)}`
}

export function homeStaffOnShiftHref(homeId: string | number) {
  return `/shifts/current?home_id=${enc(homeId)}`
}

export function homeWorkforceHref(homeId: string | number) {
  return `/staff?home_id=${enc(homeId)}`
}

export function homeStaffProfilesHref(homeId: string | number) {
  return `/staff?home_id=${enc(homeId)}#profiles`
}

export function homeActionsHref(homeId: string | number) {
  return `/actions?home_id=${enc(homeId)}`
}

export function homeInspectionReadinessHref(homeId: string | number) {
  return `/intelligence/inspection-readiness?home_id=${enc(homeId)}`
}

export function homeSccifHref(homeId: string | number) {
  return `/intelligence/sccif?home_id=${enc(homeId)}`
}

export function homeReg44Href(homeId: string | number) {
  return `/intelligence/inspection-readiness?home_id=${enc(homeId)}&pack=reg44`
}

export function homeReg45Href(homeId: string | number) {
  return `/intelligence/reg45?home_id=${enc(homeId)}`
}

export function homeReportsHref(homeId: string | number) {
  return `/reports?home_id=${enc(homeId)}`
}

export function homeOrbHref(homeId: string | number, mode: ScopeOrbMode = 'manager_daily_brief') {
  return assistantOrbHref({ scope: 'home', homeId, mode })
}

export function homeArchiveSummaryHref(homeId: string | number) {
  return assistantOrbHref({ scope: 'home', homeId, mode: 'archive_summary' })
}

export function homeChronologyGapsHref(homeId: string | number) {
  return assistantOrbHref({ scope: 'home', homeId, mode: 'chronology_story_review' })
}

export function homePlanImpactReviewHref(homeId: string | number) {
  return `/record/reviews?home_id=${enc(homeId)}&focus=plan_impacts`
}

export function homeLifeEchoPendingHref(homeId: string | number) {
  return `/young-people?home_id=${enc(homeId)}&focus=lifeecho_suggestions`
}

export function homeHandoverReviewsHref(homeId: string | number) {
  return `/handover/reviews?home_id=${enc(homeId)}`
}

export function homeChildrenHref(homeId: string | number) {
  void homeId
  return '/select-scope#recent-children'
}

/** All primary child workflow hrefs for workspace wiring tests. */
export const CHILD_WORKSPACE_WORKFLOW_HREFS = (childId: string | number) => ({
  overview: childOverviewHref(childId),
  record: childRecordHref(childId),
  dailyNote: childDailyNoteHref(childId),
  incident: childIncidentHref(childId),
  safeguarding: childSafeguardingHref(childId),
  healthMedication: childHealthMedicationHref(childId),
  education: childEducationHref(childId),
  familyTime: childFamilyTimeHref(childId),
  keywork: childKeyworkHref(childId),
  behaviourSupport: childBehaviourSupportHref(childId),
  missingEpisode: childMissingEpisodeHref(childId),
  physicalIntervention: childPhysicalInterventionHref(childId),
  bodyMap: childBodyMapHref(childId),
  roomSearch: childRoomSearchHref(childId),
  complaint: childComplaintHref(childId),
  chronology: childChronologyHref(childId),
  archive: childArchiveHref(childId),
  lifeecho: childLifeEchoHref(childId),
  planImpacts: childPlanImpactsHref(childId),
  actions: childActionsHref(childId),
  documents: childDocumentsHref(childId),
  handover: childHandoverHref(childId),
  reviews: childReviewsHref(childId),
  alerts: childAlertsHref(childId),
  voice: childVoiceHref(childId),
  carePlanning: childCarePlanningHref(childId),
  orb: childOrbHref(childId),
  journey: childJourneyHref(childId),
  templates: childTemplatesHref(childId),
  formalSubmission: childFormalSubmissionHref(childId)
})

/** All primary home workflow hrefs for workspace wiring tests. */
export const HOME_WORKSPACE_WORKFLOW_HREFS = (homeId: string | number) => ({
  workspace: homeWorkspaceHref(homeId),
  dailyBrief: homeDailyBriefHref(homeId),
  handover: homeHandoverHref(homeId),
  recordingAlerts: homeRecordingAlertsHref(homeId),
  recordingReviews: homeRecordingReviewsHref(homeId),
  safeguarding: homeSafeguardingHref(homeId),
  notifications: homeNotificationsHref(homeId),
  staffOnShift: homeStaffOnShiftHref(homeId),
  workforce: homeWorkforceHref(homeId),
  staffProfiles: homeStaffProfilesHref(homeId),
  actions: homeActionsHref(homeId),
  inspectionReadiness: homeInspectionReadinessHref(homeId),
  sccif: homeSccifHref(homeId),
  reg44: homeReg44Href(homeId),
  reg45: homeReg45Href(homeId),
  reports: homeReportsHref(homeId),
  archiveSummary: homeArchiveSummaryHref(homeId),
  chronologyGaps: homeChronologyGapsHref(homeId),
  planImpactReview: homePlanImpactReviewHref(homeId),
  lifeechoPending: homeLifeEchoPendingHref(homeId),
  orb: homeOrbHref(homeId),
  handoverReviews: homeHandoverReviewsHref(homeId),
  children: homeChildrenHref(homeId)
})
