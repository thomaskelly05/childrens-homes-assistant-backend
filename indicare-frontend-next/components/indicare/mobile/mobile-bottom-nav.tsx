'use client'

import { usePathname } from 'next/navigation'
import { Bell, ClipboardList, Gauge, MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { MobileSafeLink } from '@/components/indicare/mobile/mobile-safe-link'
import { SafeLucideIcon } from '@/components/indicare/safe-lucide-icon'
import { logTapTarget } from '@/lib/interaction/mobile-tap-debug'
import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import { shouldShowMobileBottomNav } from '@/lib/navigation/mobile-shell'
import { childWorkspaceHref } from '@/lib/navigation/child-workspace-routes'
import {
  childDailyNoteHref,
  childRecordHref,
  childReviewsHref,
  homeHandoverHref,
  homeRecordingAlertsHref,
  homeRecordingReviewsHref,
  homeWorkspaceHref
} from '@/lib/navigation/scope-routes'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  testId?: string
}

function childBottomNav(childId: string): NavItem[] {
  return [
    { label: 'Overview', href: childWorkspaceHref(childId), icon: Gauge, testId: 'mobile-nav-overview' },
    { label: 'Record', href: childRecordHref(childId), icon: ClipboardList, testId: 'mobile-nav-record' },
    { label: 'Daily note', href: childDailyNoteHref(childId), icon: ClipboardList, testId: 'mobile-nav-daily-note' },
    { label: 'Reviews', href: childReviewsHref(childId), icon: Bell, testId: 'mobile-nav-reviews' },
    { label: 'More', href: `${childWorkspaceHref(childId)}#more`, icon: MoreHorizontal, testId: 'mobile-nav-more' }
  ]
}

function homeBottomNav(homeId: string): NavItem[] {
  return [
    { label: 'Home', href: homeWorkspaceHref(homeId), icon: Gauge, testId: 'mobile-nav-home-overview' },
    { label: 'Handover', href: homeHandoverHref(homeId), icon: ClipboardList, testId: 'mobile-nav-home-handover' },
    { label: 'Reviews', href: homeRecordingReviewsHref(homeId), icon: ClipboardList, testId: 'mobile-nav-home-reviews' },
    { label: 'Alerts', href: homeRecordingAlertsHref(homeId), icon: Bell, testId: 'mobile-nav-alerts' },
    { label: 'More', href: `${homeWorkspaceHref(homeId)}#more`, icon: MoreHorizontal, testId: 'mobile-nav-more' }
  ]
}

export function MobileBottomNav() {
  const pathname = usePathname() || '/select-scope'
  const { scope } = useOsScope()

  if (!shouldShowMobileBottomNav(pathname)) return null

  const hasScope = scope.scope_type === 'home' || scope.scope_type === 'child'
  if (!hasScope) return null

  const items: NavItem[] =
    scope.scope_type === 'child' && scope.selected_child_id
      ? childBottomNav(String(scope.selected_child_id))
      : scope.scope_type === 'home' && scope.selected_home_id
        ? homeBottomNav(String(scope.selected_home_id))
        : [{ label: 'Choose', href: '/select-scope', icon: MoreHorizontal, testId: 'mobile-nav-choose' }]

  return (
    <nav
      data-testid={
        scope.scope_type === 'child'
          ? 'mobile-child-bottom-nav'
          : scope.scope_type === 'home'
            ? 'mobile-home-bottom-nav'
            : 'mobile-bottom-nav'
      }
      data-mobile-bottom-nav-safe-area="true"
      className="mobile-bottom-nav pointer-events-auto fixed inset-x-0 bottom-0 z-40 overflow-hidden border-t border-white/70 bg-white/90 backdrop-blur-xl lg:hidden"
      style={{
        height: 'calc(4.5rem + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
      aria-label="Primary mobile navigation"
    >
      <div className="mx-auto flex h-[4.5rem] max-w-lg items-stretch justify-between gap-0.5 px-2 pt-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href.split('?')[0]}/`)
          const Icon = item.icon
          return (
            <MobileSafeLink
              prefetch={false}
              key={`${item.label}-${item.href}`}
              href={item.href}
              data-testid={item.testId}
              tapDebugLabel={`mobile-bottom-nav-${item.label}`}
              onClick={(event) => logTapTarget(event, `mobile-nav-${item.label}`)}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-[10px] font-black leading-tight ${
                active ? 'bg-slate-950 text-white' : 'text-slate-600'
              }`}
            >
              <SafeLucideIcon icon={Icon} className="h-4 w-4 shrink-0 pointer-events-none" />
              <span className="mt-0.5 truncate pointer-events-none">{item.label}</span>
            </MobileSafeLink>
          )
        })}
      </div>
    </nav>
  )
}
