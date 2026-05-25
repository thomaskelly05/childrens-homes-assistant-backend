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

import { childWorkspaceHref } from '@/lib/navigation/child-workspace-routes'
import type { OsScopeType } from '@/lib/os-scope'

export type ScopeNavItem = {
  label: string
  href: string
  icon: LucideIcon
  prefetch?: boolean
  testId?: string
}

function childHref(childId: string | number, path: string) {
  const id = encodeURIComponent(String(childId))
  if (path.startsWith('/')) return path.replace('{id}', id)
  return `/young-people/${id}/${path}`
}

function homeHref(homeId: string | number, path: string) {
  const id = encodeURIComponent(String(homeId))
  if (path.startsWith('/')) return path.replace('{home_id}', id)
  return `/homes/${id}/${path}`
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
    { label: 'Home workspace', href: homeHref(hid, 'workspace'), icon: Gauge, prefetch: false },
    { label: 'Handover', href: '/handover/current', icon: ClipboardCheck, prefetch: false },
    { label: 'Recording alerts', href: `/record/alerts?home_id=${encodeURIComponent(hid)}`, icon: ClipboardList, prefetch: false },
    { label: 'Safeguarding / ISN', href: '/safeguarding', icon: ShieldCheck, prefetch: false },
    { label: 'Staff on shift', href: '/shifts/current', icon: UserRound, prefetch: false },
    { label: 'Daily brief', href: '/command-centre/briefing', icon: ClipboardCheck, prefetch: false },
    { label: 'Notifications', href: '/notifications', icon: Bell, prefetch: false },
    { label: 'Inspection readiness', href: '/intelligence/inspection-readiness', icon: ShieldCheck, prefetch: false },
    { label: 'Reports', href: '/reports', icon: FileText, prefetch: false },
    { label: 'ORB for this home', href: `/assistant/orb?context=home&home_id=${encodeURIComponent(hid)}`, icon: Sparkles, prefetch: false }
  ]
}

export function childScopeNavigation(childId: string | number): ScopeNavItem[] {
  const cid = String(childId)
  const q = encodeURIComponent(cid)
  return [
    { label: 'Overview', href: childWorkspaceHref(cid), icon: UserRound, prefetch: false, testId: 'scope-nav-child-overview' },
    { label: 'Record', href: `/record?child_id=${q}`, icon: ClipboardList, prefetch: false },
    { label: 'Daily note', href: `/record?child_id=${q}&type=daily-note`, icon: ClipboardList, prefetch: false },
    { label: 'Incident', href: `/record?child_id=${q}&type=incident`, icon: ShieldCheck, prefetch: false },
    { label: 'Safeguarding', href: `/record?child_id=${q}&type=safeguarding-concern`, icon: ShieldCheck, prefetch: false },
    { label: 'Health / medication', href: `/record?child_id=${q}&type=health-appointment`, icon: HeartPulse, prefetch: false },
    { label: 'Education', href: `/record?child_id=${q}&type=education-note`, icon: FileText, prefetch: false },
    { label: 'Family time', href: `/record?child_id=${q}&type=family-time`, icon: UserRound, prefetch: false },
    { label: 'Keywork', href: `/record?child_id=${q}&type=keywork`, icon: ClipboardCheck, prefetch: false },
    { label: 'Chronology', href: childHref(cid, 'chronology'), icon: CalendarDays, prefetch: false },
    { label: 'Actions', href: `/actions?child_id=${q}`, icon: ClipboardCheck, prefetch: false },
    { label: 'Documents', href: `/documents?child_id=${q}`, icon: FolderOpen, prefetch: false },
    { label: 'Handover', href: childHref(cid, 'shift-handover/new'), icon: ClipboardCheck, prefetch: false },
    { label: 'Reviews', href: '/record/reviews', icon: ClipboardCheck, prefetch: false },
    { label: 'Child voice', href: childHref(cid, 'child-voice/new'), icon: UserRound, prefetch: false },
    { label: 'Care planning', href: childHref(cid, 'plans'), icon: FileText, prefetch: false },
    { label: 'ORB', href: `/assistant/orb?context=child&young_person_id=${q}`, icon: Sparkles, prefetch: false }
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
