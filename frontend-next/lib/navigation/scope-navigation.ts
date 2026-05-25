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
  childOrbHref,
  childRecordHref,
  childReviewsHref,
  childSafeguardingHref,
  childVoiceHref,
  homeDailyBriefHref,
  homeHandoverHref,
  homeInspectionReadinessHref,
  homeNotificationsHref,
  homeOrbHref,
  homeRecordingAlertsHref,
  homeRecordingReviewsHref,
  homeReportsHref,
  homeSafeguardingHref,
  homeStaffOnShiftHref,
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
    { label: 'Home workspace', href: homeWorkspaceHref(hid), icon: Gauge, prefetch: false },
    { label: 'Handover', href: homeHandoverHref(hid), icon: ClipboardCheck, prefetch: false },
    { label: 'Recording alerts', href: homeRecordingAlertsHref(hid), icon: ClipboardList, prefetch: false },
    { label: 'Recording reviews', href: homeRecordingReviewsHref(hid), icon: ClipboardCheck, prefetch: false },
    { label: 'Safeguarding / ISN', href: homeSafeguardingHref(hid), icon: ShieldCheck, prefetch: false },
    { label: 'Staff on shift', href: homeStaffOnShiftHref(hid), icon: UserRound, prefetch: false },
    { label: 'Daily brief', href: homeDailyBriefHref(hid), icon: ClipboardCheck, prefetch: false },
    { label: 'Notifications', href: homeNotificationsHref(hid), icon: Bell, prefetch: false },
    { label: 'Inspection readiness', href: homeInspectionReadinessHref(hid), icon: ShieldCheck, prefetch: false },
    { label: 'Reports', href: homeReportsHref(hid), icon: FileText, prefetch: false },
    { label: 'ORB for this home', href: homeOrbHref(hid), icon: Sparkles, prefetch: false }
  ]
}

export function childScopeNavigation(childId: string | number): ScopeNavItem[] {
  const cid = String(childId)
  return [
    { label: 'Overview', href: childWorkspaceHref(cid), icon: UserRound, prefetch: false, testId: 'scope-nav-child-overview' },
    { label: 'Record', href: childRecordHref(cid), icon: ClipboardList, prefetch: false },
    { label: 'Daily note', href: childDailyNoteHref(cid), icon: ClipboardList, prefetch: false },
    { label: 'Incident', href: childIncidentHref(cid), icon: ShieldCheck, prefetch: false },
    { label: 'Safeguarding', href: childSafeguardingHref(cid), icon: ShieldCheck, prefetch: false },
    { label: 'Health / medication', href: childHealthMedicationHref(cid), icon: HeartPulse, prefetch: false },
    { label: 'Education', href: childEducationHref(cid), icon: FileText, prefetch: false },
    { label: 'Family time', href: childFamilyTimeHref(cid), icon: UserRound, prefetch: false },
    { label: 'Keywork', href: childKeyworkHref(cid), icon: ClipboardCheck, prefetch: false },
    { label: 'Chronology', href: childChronologyHref(cid), icon: CalendarDays, prefetch: false },
    { label: 'Actions', href: childActionsHref(cid), icon: ClipboardCheck, prefetch: false },
    { label: 'Documents', href: childDocumentsHref(cid), icon: FolderOpen, prefetch: false },
    { label: 'Handover', href: childHandoverHref(cid), icon: ClipboardCheck, prefetch: false },
    { label: 'Reviews', href: childReviewsHref(cid), icon: ClipboardCheck, prefetch: false },
    { label: 'Child voice', href: childVoiceHref(cid), icon: UserRound, prefetch: false },
    { label: 'Care planning', href: childCarePlanningHref(cid), icon: FileText, prefetch: false },
    { label: 'ORB', href: childOrbHref(cid), icon: Sparkles, prefetch: false }
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
