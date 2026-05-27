/**
 * Mobile OS shell visibility — bottom nav, padding, tabs, and route exclusions.
 */

import {
  childActionsHref,
  childAlertsHref,
  childChronologyHref,
  childDailyNoteHref,
  childRecordHref,
  childReviewsHref,
  homeHandoverHref,
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
    { label: 'Story', href: childWorkspaceHref(id), testId: 'mobile-tab-child-story' },
    { label: 'Today', href: childWorkspaceHref(id), testId: 'mobile-tab-child-today' },
    { label: 'Record', href: childRecordHref(id), testId: 'mobile-tab-child-record' },
    { label: 'Chronology', href: childChronologyHref(id), testId: 'mobile-tab-child-chronology' },
    { label: 'Reviews', href: childReviewsHref(id), testId: 'mobile-tab-child-reviews' },
    { label: 'Evidence', href: childAlertsHref(id), testId: 'mobile-tab-child-evidence' },
    { label: 'More', href: `${childWorkspaceHref(id)}#more`, testId: 'mobile-tab-child-more' }
  ]
}

export function homeWorkspaceMobileTabs(homeId: string | number): MobileScopeTab[] {
  const id = String(homeId)
  return [
    { label: 'Home today', href: homeWorkspaceHref(id), testId: 'mobile-tab-home-overview' },
    { label: 'Handover', href: homeHandoverHref(id), testId: 'mobile-tab-home-handover' },
    { label: 'Manager review', href: homeRecordingReviewsHref(id), testId: 'mobile-tab-home-reviews' },
    { label: 'Evidence', href: homeRecordingAlertsHref(id), testId: 'mobile-tab-home-evidence' },
    { label: 'More', href: `${homeWorkspaceHref(id)}#more`, testId: 'mobile-tab-home-more' }
  ]
}

/** QA marker: bottom nav applies safe-area padding (see mobile-bottom-nav style + data attribute). */
export const MOBILE_BOTTOM_NAV_SAFE_AREA_MARKER = 'data-mobile-bottom-nav-safe-area'
