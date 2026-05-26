/**
 * Mobile OS shell visibility — bottom nav, padding, tabs, and route exclusions.
 */

import {
  childActionsHref,
  childAlertsHref,
  childChronologyHref,
  childDailyNoteHref,
  childOrbHref,
  childRecordHref,
  childReviewsHref,
  homeDailyBriefHref,
  homeHandoverHref,
  homeOrbHref,
  homeRecordingAlertsHref,
  homeRecordingReviewsHref,
  homeWorkspaceHref
} from '@/lib/navigation/scope-routes'
import { childWorkspaceHref } from '@/lib/navigation/child-workspace-routes'

export function shouldShowMobileBottomNav(pathname: string): boolean {
  if (pathname === '/orb' || pathname.startsWith('/orb/')) return false
  if (pathname === '/assistant/orb' || pathname.startsWith('/assistant/orb/')) return false
  if (pathname === '/assistant/voice' || pathname.startsWith('/assistant/settings/')) return false
  if (pathname === '/record' || pathname.startsWith('/record/')) return false
  if (/^\/young-people\/[^/]+\/(new|upload)\/?$/.test(pathname)) return false
  if (pathname === '/login' || pathname.startsWith('/login/')) return false
  if (pathname === '/select-scope' || pathname.startsWith('/select-scope/')) return false
  if (pathname === '/unauthorized') return false
  return true
}

export const mobileWorkspaceBottomPaddingClass =
  'pb-[calc(7rem+env(safe-area-inset-bottom))]'

export type MobileScopeTab = { label: string; href: string; testId?: string }

export function childWorkspaceMobileTabs(childId: string | number): MobileScopeTab[] {
  const id = String(childId)
  return [
    { label: 'Overview', href: childWorkspaceHref(id), testId: 'mobile-tab-child-overview' },
    { label: 'Record', href: childRecordHref(id), testId: 'mobile-tab-child-record' },
    { label: 'Daily note', href: childDailyNoteHref(id), testId: 'mobile-tab-child-daily-note' },
    { label: 'Chronology', href: childChronologyHref(id), testId: 'mobile-tab-child-chronology' },
    { label: 'Actions', href: childActionsHref(id), testId: 'mobile-tab-child-actions' },
    { label: 'Reviews', href: childReviewsHref(id), testId: 'mobile-tab-child-reviews' },
    { label: 'Alerts', href: childAlertsHref(id), testId: 'mobile-tab-child-alerts' },
    { label: 'ORB', href: childOrbHref(id), testId: 'mobile-tab-child-orb' }
  ]
}

export function homeWorkspaceMobileTabs(homeId: string | number): MobileScopeTab[] {
  const id = String(homeId)
  return [
    { label: 'Overview', href: homeWorkspaceHref(id), testId: 'mobile-tab-home-overview' },
    { label: 'Daily brief', href: homeDailyBriefHref(id), testId: 'mobile-tab-home-daily-brief' },
    { label: 'Handover', href: homeHandoverHref(id), testId: 'mobile-tab-home-handover' },
    { label: 'Alerts', href: homeRecordingAlertsHref(id), testId: 'mobile-tab-home-alerts' },
    { label: 'Reviews', href: homeRecordingReviewsHref(id), testId: 'mobile-tab-home-reviews' },
    { label: 'ORB', href: homeOrbHref(id), testId: 'mobile-tab-home-orb' }
  ]
}

/** QA marker: bottom nav applies safe-area padding (see mobile-bottom-nav style + data attribute). */
export const MOBILE_BOTTOM_NAV_SAFE_AREA_MARKER = 'data-mobile-bottom-nav-safe-area'
