import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  HeartPulse,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  childActionsHref,
  childAlertsHref,
  childArchiveHref,
  childCarePlanningHref,
  childChronologyHref,
  childDailyNoteHref,
  childDocumentsHref,
  childEducationHref,
  childFamilyTimeHref,
  childHandoverHref,
  childHealthMedicationHref,
  childIncidentHref,
  childKeyworkHref,
  childLifeEchoHref,
  childOrbHref,
  childPlanImpactsHref,
  childRecordHref,
  childReviewsHref,
  childSafeguardingHref,
  childVoiceHref,
  homeActionsHref,
  homeChildrenHref,
  homeDailyBriefHref,
  homeHandoverHref,
  homeInspectionReadinessHref,
  homeNotificationsHref,
  homeOrbHref,
  homeRecordingAlertsHref,
  homeRecordingReviewsHref,
  homeReg44Href,
  homeReg45Href,
  homeReportsHref,
  homeSafeguardingHref,
  homeSccifHref,
  homeStaffOnShiftHref,
  homeWorkforceHref,
  homeWorkspaceHref
} from '@/lib/navigation/scope-routes'
import { childWorkspaceHref } from '@/lib/navigation/child-workspace-routes'
import type { OsScopeType } from '@/lib/os-scope'

export type ScopeNavItem = {
  label: string
  href: string
  icon: LucideIcon
  prefetch?: boolean
  testId?: string
}

export function noScopeNavigation(): ScopeNavItem[] {
  return [
    { label: 'Choose home', href: '/select-scope', icon: Building2, prefetch: false, testId: 'scope-nav-choose-home' },
    { label: 'Recent children', href: '/select-scope#recent-children', icon: UserRound, prefetch: false, testId: 'scope-nav-recent-children' },
    { label: 'Settings', href: '/settings', icon: Settings, prefetch: false },
    { label: 'Log out', href: '/login', icon: LogOut, prefetch: false, testId: 'scope-nav-logout' }
  ]
}

/** Primary home workspace menu — operational rhythm first. */
export function homeScopePrimaryNavigation(homeId: string | number): ScopeNavItem[] {
  const hid = String(homeId)
  return [
    { label: 'Home today', href: homeWorkspaceHref(hid), icon: Gauge, prefetch: false, testId: 'scope-nav-home-overview' },
    { label: 'Children', href: homeChildrenHref(hid), icon: UserRound, prefetch: false, testId: 'scope-nav-home-children' },
    { label: 'Handover', href: homeHandoverHref(hid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-home-handover' },
    { label: 'Reviews', href: homeRecordingReviewsHref(hid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-home-reviews' },
    { label: 'Alerts', href: homeRecordingAlertsHref(hid), icon: ClipboardList, prefetch: false, testId: 'scope-nav-home-alerts' },
    { label: 'Safeguarding', href: homeSafeguardingHref(hid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-home-safeguarding-primary' },
    { label: 'Staff', href: homeStaffOnShiftHref(hid), icon: UserRound, prefetch: false, testId: 'scope-nav-home-staff-primary' },
    { label: 'Inspection', href: homeInspectionReadinessHref(hid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-home-inspection-primary' }
  ]
}

/** Secondary home routes — inspection, workforce, reports and ORB. */
export function homeScopeMoreNavigation(homeId: string | number): ScopeNavItem[] {
  const hid = String(homeId)
  return [
    { label: 'Daily brief', href: homeDailyBriefHref(hid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-home-daily-brief' },
    { label: 'Safeguarding / ISN', href: homeSafeguardingHref(hid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-home-safeguarding' },
    { label: 'Staff on shift', href: homeStaffOnShiftHref(hid), icon: UserRound, prefetch: false, testId: 'scope-nav-home-staff-shift' },
    { label: 'Workforce', href: homeWorkforceHref(hid), icon: UserRound, prefetch: false, testId: 'scope-nav-home-workforce' },
    { label: 'Actions', href: homeActionsHref(hid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-home-actions' },
    { label: 'Inspection readiness', href: homeInspectionReadinessHref(hid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-home-inspection' },
    { label: 'SCCIF', href: homeSccifHref(hid), icon: FileText, prefetch: false, testId: 'scope-nav-home-sccif' },
    { label: 'Reg 44', href: homeReg44Href(hid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-home-reg44' },
    { label: 'Reg 45', href: homeReg45Href(hid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-home-reg45' },
    { label: 'Notifications', href: homeNotificationsHref(hid), icon: Bell, prefetch: false, testId: 'scope-nav-home-notifications' },
    { label: 'Reports', href: homeReportsHref(hid), icon: FileText, prefetch: false, testId: 'scope-nav-home-reports' },
    { label: 'ORB', href: homeOrbHref(hid), icon: Sparkles, prefetch: false, testId: 'scope-nav-home-orb' }
  ]
}

export function homeScopeNavigation(homeId: string | number): ScopeNavItem[] {
  return [...homeScopePrimaryNavigation(homeId), ...homeScopeMoreNavigation(homeId)]
}

/** Primary child workspace menu — practice journey (ORB via hero/rail, not sidebar). */
export function childScopePrimaryNavigation(childId: string | number): ScopeNavItem[] {
  const cid = String(childId)
  return [
    { label: 'Overview', href: childWorkspaceHref(cid), icon: UserRound, prefetch: false, testId: 'scope-nav-child-overview' },
    { label: 'Record', href: childRecordHref(cid), icon: ClipboardList, prefetch: false, testId: 'scope-nav-child-record' },
    { label: 'Chronology', href: childChronologyHref(cid), icon: CalendarDays, prefetch: false, testId: 'scope-nav-child-chronology' },
    { label: 'Plans', href: childCarePlanningHref(cid), icon: FileText, prefetch: false, testId: 'scope-nav-child-plans' },
    { label: 'Reviews', href: childReviewsHref(cid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-child-reviews' },
    { label: 'Alerts', href: childAlertsHref(cid), icon: Bell, prefetch: false, testId: 'scope-nav-child-alerts' }
  ]
}

/** Secondary child routes — archive, LifeEcho, handover and safeguarding. */
export function childScopeMoreNavigation(childId: string | number): ScopeNavItem[] {
  const cid = String(childId)
  return [
    { label: 'Archive', href: childArchiveHref(cid), icon: FolderOpen, prefetch: false, testId: 'scope-nav-child-archive' },
    { label: 'LifeEcho', href: childLifeEchoHref(cid), icon: Sparkles, prefetch: false, testId: 'scope-nav-child-lifeecho' },
    { label: 'Plan impacts', href: childPlanImpactsHref(cid), icon: FileText, prefetch: false, testId: 'scope-nav-child-plan-impacts' },
    { label: 'Documents', href: childDocumentsHref(cid), icon: FolderOpen, prefetch: false, testId: 'scope-nav-child-documents' },
    { label: 'Handover', href: childHandoverHref(cid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-child-handover' },
    { label: 'Child voice', href: childVoiceHref(cid), icon: UserRound, prefetch: false, testId: 'scope-nav-child-voice' },
    { label: 'Care planning', href: childCarePlanningHref(cid), icon: FileText, prefetch: false, testId: 'scope-nav-child-care-planning' },
    { label: 'Actions', href: childActionsHref(cid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-child-actions' },
    { label: 'Safeguarding', href: childSafeguardingHref(cid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-child-safeguarding' },
    { label: 'Daily note', href: childDailyNoteHref(cid), icon: ClipboardList, prefetch: false, testId: 'scope-nav-child-daily-note' },
    { label: 'Incident', href: childIncidentHref(cid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-child-incident' },
    { label: 'Health / medication', href: childHealthMedicationHref(cid), icon: HeartPulse, prefetch: false, testId: 'scope-nav-child-health' },
    { label: 'Education', href: childEducationHref(cid), icon: FileText, prefetch: false, testId: 'scope-nav-child-education' },
    { label: 'Family time', href: childFamilyTimeHref(cid), icon: UserRound, prefetch: false, testId: 'scope-nav-child-family-time' },
    { label: 'Keywork', href: childKeyworkHref(cid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-child-keywork' },
    { label: 'ORB', href: childOrbHref(cid), icon: Sparkles, prefetch: false, testId: 'scope-nav-child-orb' }
  ]
}

export function childScopeNavigation(childId: string | number): ScopeNavItem[] {
  return [...childScopePrimaryNavigation(childId), ...childScopeMoreNavigation(childId)]
}

export function scopeNavigationFor(
  scopeType: OsScopeType,
  ids: { homeId?: string | number | null; childId?: string | number | null }
): ScopeNavItem[] {
  if (scopeType === 'child' && ids.childId) return childScopeNavigation(ids.childId)
  if (scopeType === 'home' && ids.homeId) return homeScopeNavigation(ids.homeId)
  return noScopeNavigation()
}

/** Routes that must never be prefetched from the scope-first menu. */
export const SCOPE_HEAVY_ROUTE_HINTS = [
  '/command-centre',
  '/governance',
  '/staff',
  '/intelligence',
  '/reports',
  '/actions',
  '/chronology',
  '/handover',
  '/record/alerts',
  '/intelligence/inspection-readiness'
] as const
