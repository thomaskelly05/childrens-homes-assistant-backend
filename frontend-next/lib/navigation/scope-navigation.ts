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

export function homeScopeNavigation(homeId: string | number): ScopeNavItem[] {
  const hid = String(homeId)
  return [
    { label: 'Home overview', href: homeWorkspaceHref(hid), icon: Gauge, prefetch: false, testId: 'scope-nav-home-overview' },
    { label: 'Children', href: homeChildrenHref(hid), icon: UserRound, prefetch: false, testId: 'scope-nav-home-children' },
    { label: 'Daily brief', href: homeDailyBriefHref(hid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-home-daily-brief' },
    { label: 'Handover', href: homeHandoverHref(hid), icon: ClipboardCheck, prefetch: false },
    { label: 'Reviews', href: homeRecordingReviewsHref(hid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-home-reviews' },
    { label: 'Alerts', href: homeRecordingAlertsHref(hid), icon: ClipboardList, prefetch: false, testId: 'scope-nav-home-alerts' },
    { label: 'Safeguarding / ISN', href: homeSafeguardingHref(hid), icon: ShieldCheck, prefetch: false },
    { label: 'Staff / workforce', href: homeWorkforceHref(hid), icon: UserRound, prefetch: false, testId: 'scope-nav-home-workforce' },
    { label: 'Staff on shift', href: homeStaffOnShiftHref(hid), icon: UserRound, prefetch: false },
    { label: 'Actions', href: homeActionsHref(hid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-home-actions' },
    { label: 'Inspection readiness', href: homeInspectionReadinessHref(hid), icon: ShieldCheck, prefetch: false },
    { label: 'SCCIF', href: homeSccifHref(hid), icon: FileText, prefetch: false, testId: 'scope-nav-home-sccif' },
    { label: 'Reg 44', href: homeReg44Href(hid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-home-reg44' },
    { label: 'Reg 45', href: homeReg45Href(hid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-home-reg45' },
    { label: 'Notifications', href: homeNotificationsHref(hid), icon: Bell, prefetch: false },
    { label: 'Reports', href: homeReportsHref(hid), icon: FileText, prefetch: false },
    { label: 'ORB', href: homeOrbHref(hid), icon: Sparkles, prefetch: false, testId: 'scope-nav-home-orb' }
  ]
}

export function childScopeNavigation(childId: string | number): ScopeNavItem[] {
  const cid = String(childId)
  return [
    { label: 'Overview', href: childWorkspaceHref(cid), icon: UserRound, prefetch: false, testId: 'scope-nav-child-overview' },
    { label: 'Record', href: childRecordHref(cid), icon: ClipboardList, prefetch: false, testId: 'scope-nav-child-record' },
    { label: 'Daily note', href: childDailyNoteHref(cid), icon: ClipboardList, prefetch: false, testId: 'scope-nav-child-daily-note' },
    { label: 'Incident', href: childIncidentHref(cid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-child-incident' },
    { label: 'Safeguarding', href: childSafeguardingHref(cid), icon: ShieldCheck, prefetch: false, testId: 'scope-nav-child-safeguarding' },
    { label: 'Health / medication', href: childHealthMedicationHref(cid), icon: HeartPulse, prefetch: false },
    { label: 'Education', href: childEducationHref(cid), icon: FileText, prefetch: false },
    { label: 'Family time', href: childFamilyTimeHref(cid), icon: UserRound, prefetch: false },
    { label: 'Keywork', href: childKeyworkHref(cid), icon: ClipboardCheck, prefetch: false },
    { label: 'Chronology', href: childChronologyHref(cid), icon: CalendarDays, prefetch: false, testId: 'scope-nav-child-chronology' },
    { label: 'Actions', href: childActionsHref(cid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-child-actions' },
    { label: 'Reviews', href: childReviewsHref(cid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-child-reviews' },
    { label: 'Alerts', href: childAlertsHref(cid), icon: Bell, prefetch: false, testId: 'scope-nav-child-alerts' },
    { label: 'Archive', href: childArchiveHref(cid), icon: FolderOpen, prefetch: false, testId: 'scope-nav-child-archive' },
    { label: 'LifeEcho', href: childLifeEchoHref(cid), icon: Sparkles, prefetch: false, testId: 'scope-nav-child-lifeecho' },
    { label: 'Plan impacts', href: childPlanImpactsHref(cid), icon: FileText, prefetch: false, testId: 'scope-nav-child-plan-impacts' },
    { label: 'Documents', href: childDocumentsHref(cid), icon: FolderOpen, prefetch: false },
    { label: 'Handover', href: childHandoverHref(cid), icon: ClipboardCheck, prefetch: false, testId: 'scope-nav-child-handover' },
    { label: 'Child voice', href: childVoiceHref(cid), icon: UserRound, prefetch: false },
    { label: 'Care planning', href: childCarePlanningHref(cid), icon: FileText, prefetch: false },
    { label: 'ORB', href: childOrbHref(cid), icon: Sparkles, prefetch: false, testId: 'scope-nav-child-orb' }
  ]
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
