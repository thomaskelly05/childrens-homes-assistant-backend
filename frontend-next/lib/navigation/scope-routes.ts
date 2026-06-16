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

function enc(id: string | number) { return encodeURIComponent(String(id)) }

function recordHref(params: { childId?: string | number; homeId?: string | number; type?: string; draftId?: string; about?: 'child' | 'home-shift' | 'staff' | 'not-sure' }) {
  const q = new URLSearchParams()
  if (params.about) q.set('about', params.about)
  if (params.childId != null) q.set('child_id', String(params.childId))
  if (params.homeId != null) q.set('home_id', String(params.homeId))
  if (params.type) q.set('type', params.type)
  if (params.draftId) q.set('draft_id', params.draftId)
  const qs = q.toString()
  return qs ? `/record?${qs}` : '/record'
}

function childPath(childId: string | number, segment: string) { return `/young-people/${enc(childId)}/${segment}` }
function homePath(homeId: string | number, segment: string) { return `/homes/${enc(homeId)}/${segment}` }

function assistantOrbHref(params: { scope?: 'child' | 'home' | 'governance' | 'workforce' | 'inspection' | 'provider'; childId?: string | number; homeId?: string | number; mode?: ScopeOrbMode | string; query?: string }) {
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
export function childOverviewHref(childId: string | number) { return childWorkspaceHref(childId) }
export function childRecordHref(childId: string | number, type?: string) { return recordHref({ childId, type, about: 'child' }) }
export function childDailyNoteHref(childId: string | number) { return recordHref({ childId, type: 'daily-note', about: 'child' }) }
export function childIncidentHref(childId: string | number) { return recordHref({ childId, type: 'incident', about: 'child' }) }
export function childSafeguardingHref(childId: string | number) { return recordHref({ childId, type: 'safeguarding-concern', about: 'child' }) }
export function childHealthMedicationHref(childId: string | number) { return recordHref({ childId, type: 'health-appointment', about: 'child' }) }
export function childEducationHref(childId: string | number) { return recordHref({ childId, type: 'education-note', about: 'child' }) }
export function childFamilyTimeHref(childId: string | number) { return recordHref({ childId, type: 'family-time', about: 'child' }) }
export function childKeyworkHref(childId: string | number) { return recordHref({ childId, type: 'keywork', about: 'child' }) }
export function childBehaviourSupportHref(childId: string | number) { return recordHref({ childId, type: 'behaviour-support', about: 'child' }) }
export function childMissingEpisodeHref(childId: string | number) { return recordHref({ childId, type: 'missing-episode', about: 'child' }) }
export function childPhysicalInterventionHref(childId: string | number) { return recordHref({ childId, type: 'physical-intervention', about: 'child' }) }
export function childBodyMapHref(childId: string | number) { return recordHref({ childId, type: 'injury-body-map', about: 'child' }) }
export function childRoomSearchHref(childId: string | number) { return recordHref({ childId, type: 'room-search', about: 'child' }) }
export function childComplaintHref(childId: string | number) { return recordHref({ childId, type: 'complaint', about: 'child' }) }
export function childChronologyHref(childId: string | number) { return childPath(childId, 'chronology') }
export function childArchiveHref(childId: string | number) { return childPath(childId, 'archive') }
export function childChronologyStoryHref(childId: string | number) { return childPath(childId, 'chronology') }
export function childLifeEchoHref(childId: string | number) { return childPath(childId, 'lifeecho') }
export function childPlanImpactsHref(childId: string | number) { return childPath(childId, 'plan-impacts') }
export function childActionsHref(childId: string | number) { return `/actions?child_id=${enc(childId)}` }
export function childDocumentsHref(childId: string | number) { return `/documents?child_id=${enc(childId)}` }
export function childHandoverHref(childId: string | number) { return `/handover?child_id=${enc(childId)}` }
export function childReviewsHref(childId: string | number) { return `/record/reviews?child_id=${enc(childId)}` }
export function childAlertsHref(childId: string | number) { return `/record/alerts?child_id=${enc(childId)}` }
export function childVoiceHref(childId: string | number) { return recordHref({ childId, type: 'child-voice', about: 'child' }) }
export function childCarePlanningHref(childId: string | number) { return childPath(childId, 'plans') }
export function childOrbHref(childId: string | number, mode: ScopeOrbMode = 'record_quality_review') { return assistantOrbHref({ scope: 'child', childId, mode }) }
export function childJourneyHref(childId: string | number) { return childPath(childId, 'journey') }
export function childTemplatesHref(childId: string | number) { return `/documents/templates?child_id=${enc(childId)}` }
export function childFormalSubmissionHref(childId: string | number) { return `/record/governance?child_id=${enc(childId)}` }

// —— Home workspace ——
export function homeWorkspaceHref(homeId: string | number) { return homePath(homeId, 'workspace') }
export function homeDailyBriefHref(homeId: string | number) { return `/command-centre/briefing?home_id=${enc(homeId)}` }
export function homeHandoverHref(homeId: string | number) { return `/handover?home_id=${enc(homeId)}` }
export function homeHandoverReviewsHref(homeId: string | number) { return `/handover/reviews?home_id=${enc(homeId)}` }
export function homeRecordingAlertsHref(homeId: string | number) { return `/record/alerts?home_id=${enc(homeId)}` }
export function homeRecordingReviewsHref(homeId: string | number) { return `/record/reviews?home_id=${enc(homeId)}` }
export function homeSafeguardingHref(homeId: string | number) { return `/safeguarding?home_id=${enc(homeId)}` }
export function homeNotificationsHref(homeId: string | number) { return `/notifications?home_id=${enc(homeId)}` }
export function homeStaffOnShiftHref(homeId: string | number) { return `/shifts/current?home_id=${enc(homeId)}` }
export function homeWorkforceHref(homeId: string | number) { return `/staff?home_id=${enc(homeId)}` }
export function homeStaffProfilesHref(homeId: string | number) { return `/staff?home_id=${enc(homeId)}#profiles` }
export function homeActionsHref(homeId: string | number) { return `/actions?home_id=${enc(homeId)}` }
export function homeInspectionReadinessHref(homeId: string | number) { return `/intelligence/inspection evidence preparation?home_id=${enc(homeId)}` }
export function homeSccifHref(homeId: string | number) { return `/intelligence/sccif?home_id=${enc(homeId)}` }
export function homeReg44Href(homeId: string | number) { return `/intelligence/inspection evidence preparation?home_id=${enc(homeId)}&pack=reg44` }
export function homeReg45Href(homeId: string | number) { return `/intelligence/reg45?home_id=${enc(homeId)}` }
export function homeReportsHref(homeId: string | number) { return `/reports?home_id=${enc(homeId)}` }
export function homeOrbHref(homeId: string | number, mode: ScopeOrbMode = 'manager_daily_brief') { return assistantOrbHref({ scope: 'home', homeId, mode }) }
export function homeArchiveSummaryHref(homeId: string | number) { return assistantOrbHref({ scope: 'home', homeId, mode: 'archive_summary' }) }
export function homeChildrenHref(homeId: string | number) { return `/homes/${enc(homeId)}/children` }
export function homeRecordHref(homeId: string | number, type?: string) { return recordHref({ homeId, type, about: 'home-shift' }) }
export function homeDocumentsHref(homeId: string | number) { return `/documents?home_id=${enc(homeId)}` }
export function homeCalendarHref(homeId: string | number) { return `/calendar?home_id=${enc(homeId)}` }
export function homeChronologyGapsHref(homeId: string | number) { return assistantOrbHref({ scope: 'home', homeId, mode: 'chronology_story_review' }) }
export function homePlanImpactReviewHref(homeId: string | number) { return assistantOrbHref({ scope: 'home', homeId, mode: 'plan_impact_review' }) }
export function homeLifeEchoPendingHref(homeId: string | number) { return assistantOrbHref({ scope: 'home', homeId, mode: 'lifeecho_memory_support' }) }

export function HOME_WORKSPACE_WORKFLOW_HREFS(homeId: string | number) {
  return {
    home: homeWorkspaceHref(homeId),
    children: homeChildrenHref(homeId),
    dailyBrief: homeDailyBriefHref(homeId),
    handover: homeHandoverHref(homeId),
    handoverReviews: homeHandoverReviewsHref(homeId),
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
    documents: homeDocumentsHref(homeId),
    calendar: homeCalendarHref(homeId),
    record: homeRecordHref(homeId),
    orb: homeOrbHref(homeId),
    archiveSummary: homeArchiveSummaryHref(homeId),
    chronologyGaps: homeChronologyGapsHref(homeId),
    planImpactReview: homePlanImpactReviewHref(homeId),
    lifeechoPending: homeLifeEchoPendingHref(homeId)
  }
}
