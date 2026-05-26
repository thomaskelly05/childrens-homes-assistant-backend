'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { ReactNode, useEffect } from 'react'

import { OperationalTopBarDate } from '@/components/indicare/operational-top-bar-date'
import { CommandSearch } from '@/components/indicare/command-search'
import { NotificationBell } from '@/components/connect/notification-bell'
import { OrbButton } from '@/components/indicare/orb/orb-button'
import { QuickActionButton } from '@/components/child-journey/quick-action-button'
import { MobileBottomNav } from '@/components/indicare/mobile/mobile-bottom-nav'
import { MobileOsTopBar } from '@/components/indicare/mobile/mobile-os-top-bar'
import { MobileScopeHeader } from '@/components/indicare/mobile/mobile-scope-header'
import {
  childWorkspaceMobileTabs,
  homeWorkspaceMobileTabs,
  mobileWorkspaceBottomPaddingClass
} from '@/lib/navigation/mobile-shell'
import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import { ContextualOrbPanel } from '@/components/indicare/operational/contextual-orb-panel'
import { OperationalAlertsPanel } from '@/components/indicare/operational/operational-alerts-panel'
import { OperationalQuickActions } from '@/components/indicare/operational/operational-quick-actions'
import { RecordingAlertNavBadge, RecordingAlertTopPill } from '@/components/indicare/record/recording-alert-nav-badge'
import { useAuth } from '@/contexts/auth-context'
import { buildAssistantContext } from '@/lib/assistant-core/context'
import { displayName, roleLabels, userHasAnyPermission } from '@/lib/auth/permissions'
import { useActiveChild } from '@/lib/context/active-child-context'
import { routeRequiresChildWorkspace } from '@/lib/context/child-workspace-hydration'
import { WorkspaceRecoveryPanel } from '@/components/indicare/workspaces/workspace-recovery-panel'
import { entityContextFromPath } from '@/lib/navigation/entity-resolver'
import {
  childWorkspaceNavigation,
  hrefForOperationalItem,
  isOperationalNavItemActive,
  operationalNavigation,
  operationalUtilities,
  visibleOperationalNavigation
} from '@/lib/navigation/operational-navigation'
import {
  childScopeMoreNavigation,
  childScopePrimaryNavigation,
  homeScopeMoreNavigation,
  homeScopePrimaryNavigation,
  noScopeNavigation,
  scopeNavigationFor,
  type ScopeNavItem
} from '@/lib/navigation/scope-navigation'
import { ChildWorkspaceLoadingFallback } from '@/components/indicare/scope/child-workspace-loading-fallback'
import { childIdFromPath, childWorkspaceHref } from '@/lib/navigation/child-workspace-routes'
import { routeRequiresScope, workspaceHrefForScope } from '@/lib/os-scope'
import type { OrbContext } from '@/lib/orb/types'
import {
  hasPageEmbeddedOrbRail,
  isRecordingEditorPathStrict,
  shouldShowFloatingOrb,
  shouldShowShellContextualOrbPanel
} from '@/lib/orb/orb-presence-rules'
import { useStableSearchParams } from '@/hooks/use-stable-search-params'

const recordWorkspaceRoots = ['actions', 'reports', 'evidence', 'documents', 'chronology', 'daily-logs', 'incidents', 'safeguarding', 'medication', 'health', 'keywork', 'appointments', 'risk-assessments', 'reg44']
const childContextRequiredRoots = ['actions', 'reports']
const e2eWorkspaceHydrationBypass = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' && process.env.NODE_ENV !== 'production'

function selectedYoungPersonId(pathname: string) {
  return childIdFromPath(pathname)
}

function titleFromPath(pathname: string) {
  if (pathname === '/' || pathname === '/home' || pathname === '/dashboard' || pathname === '/workspace' || pathname === '/command-centre') return 'Command Centre'
  const parts = pathname.split('/').filter(Boolean)
  if (!parts.length) return 'Children'
  return parts[0].split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

function labelForRole(role: keyof typeof roleLabels | string | undefined) {
  return role && role in roleLabels ? roleLabels[role as keyof typeof roleLabels] : roleLabels.viewer
}

export function AppShell({ children }: { children: ReactNode }) {
  const currentPathname = usePathname()
  const router = useRouter()
  const pathname = currentPathname || '/young-people'
  const { status, user, logout } = useAuth()
  const { scope, menuSummary } = useOsScope()
  const { activeChild, breadcrumbs, childScopedHref, lockVersion, readyState } = useActiveChild()
  const hasOsScope = scope.scope_type === 'home' || scope.scope_type === 'child'
  const pathParts = pathname.split('/').filter(Boolean)
  const routeSelectedId = selectedYoungPersonId(pathname)
  const childHomeIdFromMeta =
    scope.scope_type === 'child' && scope.metadata && typeof scope.metadata === 'object'
      ? (scope.metadata as { home_id?: number }).home_id
      : undefined
  const scopeHasValidIds =
    (scope.scope_type === 'home' && scope.selected_home_id != null) ||
    (scope.scope_type === 'child' &&
      scope.selected_child_id != null &&
      (scope.selected_home_id != null || childHomeIdFromMeta != null || Boolean(routeSelectedId)))
  const scopeFirstShell = hasOsScope || routeRequiresScope(pathname)
  const isSelectScopeRoute = pathname === '/select-scope' || pathname.startsWith('/select-scope/')
  const selectedId = routeSelectedId || activeChild?.id
  const selectedEntityContext = entityContextFromPath(pathname)
  const selectedStaffId = pathParts[0] === 'staff' && pathParts[1] && !['all', 'me', 'evidence', 'induction', 'probation', 'supervision', 'training-matrix', 'command-centre', 'risk', 'relationships', 'recording-quality'].includes(pathParts[1])
    ? decodeURIComponent(pathParts[1])
    : null
  const activeChildName = activeChild?.preferredName || activeChild?.displayName
  const pageTitle = activeChildName ? `${activeChildName}'s journey` : titleFromPath(pathname)
  const stableSearchParams = useStableSearchParams()
  const isPublicPage = pathname === '/login' || pathname.startsWith('/login/') || pathname === '/unauthorized'
  const visibleNavItems = visibleOperationalNavigation(user, 'primary')
  const visibleMoreNavItems = visibleOperationalNavigation(user, 'more')
  const matchedRoute = [...operationalNavigation, ...operationalUtilities]
    .filter((item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]
  const hasRouteAccess = !matchedRoute || userHasAnyPermission(user, matchedRoute.permissions)
  const isStandaloneOrb = pathname === '/orb' || pathname.startsWith('/orb/')
  const isOperationalOrbPage = pathname === '/assistant/orb' || pathname.startsWith('/assistant/orb/')
  const isStandaloneAssistantRoute =
    pathname === '/assistant/voice' ||
    pathname.startsWith('/assistant/settings/')
  const isChildRecordingWorkspace = pathParts[0] === 'young-people' && pathParts.length === 4 && ['new', 'upload'].includes(pathParts[3])
  const isRecordWorkspace = pathParts.length >= 2 && recordWorkspaceRoots.includes(pathParts[0]) && !['new', 'current'].includes(pathParts[pathParts.length - 1])
  const routeRequiresChildContext = pathParts.length === 1 && childContextRequiredRoots.includes(pathParts[0] || '')
  const childContextRedirect = activeChild && routeRequiresChildContext ? childScopedHref(`/${pathParts[0]}`) : null
  const requiresWorkspaceHydration =
    !e2eWorkspaceHydrationBypass && routeRequiresChildWorkspace(pathname, stableSearchParams)
  const isSelectorRoute = isSelectScopeRoute || pathname === '/' || pathname === '/home' || pathname === '/dashboard' || pathname === '/workspace' || (pathname === '/young-people' && !hasOsScope)

  useEffect(() => {
    if (childContextRedirect && childContextRedirect !== pathname) {
      router.replace(childContextRedirect)
    }
  }, [childContextRedirect, pathname, router])

  if (isPublicPage) return <>{children}</>

  if (status === 'loading' || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-900">
        <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-950/10">
          <div className="orb-motion-breathing mx-auto h-14 w-14 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#fff,transparent_24%),linear-gradient(135deg,#38bdf8,#2563eb_52%,#0f172a)] shadow-[0_0_48px_rgba(37,99,235,0.36)]" aria-hidden />
          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Checking session</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">Loading IndiCare OS</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Verifying your secure workspace access.</p>
        </div>
      </div>
    )
  }

  if (!hasRouteAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-900">
        <div className="w-full max-w-lg rounded-[32px] border border-amber-100 bg-white p-8 text-center shadow-2xl shadow-slate-950/10">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">Unauthorised</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">You do not have access to this workspace area</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">Your current role is {labelForRole(user.role)}. Ask an administrator or registered manager if your access needs changing.</p>
          <Link prefetch={false} href="/young-people" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Choose child</Link>
        </div>
      </div>
    )
  }

  if (routeRequiresChildContext && !activeChild) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-900">
        <div className="w-full max-w-2xl rounded-[36px] border border-blue-100 bg-white p-8 text-center shadow-2xl shadow-slate-950/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Child context required</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">Select a child before opening detailed records</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">Chronology, actions, documents, reports and safeguarding detail stay hidden until the OS is locked to one child.</p>
          <Link prefetch={false} href="/young-people" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Choose child</Link>
        </div>
      </div>
    )
  }

  if (requiresWorkspaceHydration && !readyState.ready) {
    const dbBusy = /database busy|retry shortly/i.test(readyState.reason || '')
    if (readyState.phase === 'blocked' && dbBusy) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-900">
          <div className="w-full max-w-2xl">
            <WorkspaceRecoveryPanel
              message={readyState.reason || 'Database busy; please retry shortly.'}
              retryHref={pathname}
            />
          </div>
        </div>
      )
    }
    return (
      <ChildWorkspaceLoadingFallback
        childId={routeSelectedId || activeChild?.id}
        reason={readyState.reason}
        phase={readyState.phase}
      />
    )
  }

  const assistantContext = buildAssistantContext({
    mode: 'embedded',
    route: pathname,
    pageTitle,
    selectedYoungPersonId: selectedId,
    selectedStaffId,
    selectedRecordId: selectedEntityContext?.selected_record_id,
    selectedRecordType: selectedEntityContext?.selected_record_type,
    activeFilters: selectedId ? { young_person_id: selectedId, active_child_id: selectedId, context_lock_version: lockVersion } : {},
    selectedRecordSummary: activeChildName ? `Active child context is locked to ${activeChildName}.` : undefined
  })

  const orbContext: OrbContext = {
    route: pathname,
    workspace: assistantContext.current_workspace_type,
    page_title: pageTitle,
    selected_young_person_id: selectedId && Number.isFinite(Number(selectedId)) ? Number(selectedId) : undefined,
    selected_young_person_key: selectedId,
    selected_record_id: selectedEntityContext?.selected_record_id,
    selected_record_type: selectedEntityContext?.selected_record_type,
    current_record_summary: activeChildName ? `Active child context is locked to ${activeChildName}.` : undefined,
    current_child: selectedId ? { id: selectedId, name: activeChildName || selectedId, current_route: pathname } : undefined,
    child_context_lock: activeChild ? {
      active: true,
      child_id: activeChild.id,
      child_name: activeChildName,
      lock_version: lockVersion,
      retrieval_scope: 'selected_child_only',
      allow_global_search: false
    } : {
      active: false,
      retrieval_scope: 'no_child_records',
      allow_global_search: false
    },
    assistant_context: assistantContext
  }

  if (isStandaloneOrb || isOperationalOrbPage || isStandaloneAssistantRoute) return <>{children}</>

  if (isSelectScopeRoute) {
    return (
      <div className="orb-os-shell min-h-screen bg-[#eef4fb] text-slate-900">
        <main className="min-w-0" aria-label="Select workspace scope">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (isChildRecordingWorkspace || isRecordWorkspace || isRecordingEditorPathStrict(pathname)) {
    return (
      <div className={`orb-os-shell min-h-screen bg-[#eef4fb] text-slate-900 ${mobileWorkspaceBottomPaddingClass}`}>
        {children}
        {shouldShowFloatingOrb(pathname) ? <OrbButton context={orbContext} role={user.role} /> : null}
      </div>
    )
  }

  const scopeNavItems = scopeNavigationFor(scope.scope_type, {
    homeId: scope.selected_home_id,
    childId: scope.selected_child_id
  })
  const scopePrimaryNavItems =
    scope.scope_type === 'child' && scope.selected_child_id
      ? childScopePrimaryNavigation(scope.selected_child_id)
      : scope.scope_type === 'home' && scope.selected_home_id
        ? homeScopePrimaryNavigation(scope.selected_home_id)
        : scopeNavItems
  const scopeMoreNavItems =
    scope.scope_type === 'child' && scope.selected_child_id
      ? childScopeMoreNavigation(scope.selected_child_id)
      : scope.scope_type === 'home' && scope.selected_home_id
        ? homeScopeMoreNavigation(scope.selected_home_id)
        : []
  const useScopeMenu = hasOsScope && scopeFirstShell && scopeHasValidIds
  const primaryNav = useScopeMenu ? [] : visibleNavItems.filter((item) => selectedId || !item.requiresChild)
  const moreNav = useScopeMenu ? [] : visibleMoreNavItems.filter((item) => selectedId || !item.requiresChild)
  const secondaryNav =
    scope.scope_type === 'child' && scope.selected_child_id
      ? childWorkspaceMobileTabs(scope.selected_child_id)
      : scope.scope_type === 'home' && scope.selected_home_id
        ? homeWorkspaceMobileTabs(scope.selected_home_id)
        : selectedId
          ? childWorkspaceMobileTabs(selectedId)
          : []
  const filterScopeItems = (items: ScopeNavItem[]) =>
    items.filter((item) => item.href && !item.href.includes('undefined') && !item.href.includes('null'))
  const safeScopePrimaryNavItems = useScopeMenu ? filterScopeItems(scopePrimaryNavItems) : noScopeNavigation()
  const safeScopeMoreNavItems = useScopeMenu ? filterScopeItems(scopeMoreNavItems) : []
  const navigationGroups: Array<{ label: string; items: ScopeNavItem[] | ReturnType<typeof visibleOperationalNavigation> }> = useScopeMenu
    ? [
        {
          label: scope.scope_type === 'child' ? 'Child — primary' : 'Home — primary',
          items: safeScopePrimaryNavItems
        },
        ...(safeScopeMoreNavItems.length
          ? [{ label: scope.scope_type === 'child' ? 'Child — more' : 'Home — more', items: safeScopeMoreNavItems }]
          : [])
      ]
    : [
        { label: 'Main menu', items: primaryNav },
        ...(moreNav.length ? [{ label: 'More', items: moreNav }] : [])
      ].filter((group) => group.items.length)
  const childDomainActive =
    pathParts[0] === 'young-people' ||
    pathParts[0] === 'children' ||
    (pathParts[0] === 'os' && pathParts[1] === 'young-people')
  const displayBreadcrumbs = pathname === '/profile'
    ? [{ label: 'Children', href: '/young-people' }, { label: 'My profile', current: true }]
    : isSelectorRoute
      ? [{ label: 'Children', href: '/young-people', current: true }]
      : pathParts[0] === 'children' || pathParts[0] === 'young-people' || (pathParts[0] === 'os' && pathParts[1] === 'young-people')
        ? [
            { label: 'Children', href: '/select-scope' },
            {
              label: activeChildName || selectedId || 'Child profile',
              href: selectedId ? childWorkspaceHref(selectedId) : undefined,
              current: pathParts.includes('workspace')
            }
          ]
        : breadcrumbs

  return (
    <div className="orb-os-shell min-h-screen bg-[#eef4fb] text-slate-900">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen min-h-0 flex-col border-r border-white/70 bg-slate-950 px-4 py-5 text-white shadow-[24px_0_80px_rgba(15,23,42,0.12)] lg:flex" aria-label="Primary operational navigation">
          <Link prefetch={false} href={hasOsScope ? workspaceHrefForScope(scope) : '/select-scope'} data-testid="appshell-scope-home-link" className="flex items-center gap-3 rounded-[26px] bg-white/8 p-3 ring-1 ring-white/10">
            <span className="orb-motion-breathing relative h-12 w-12 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#fff,transparent_24%),linear-gradient(135deg,#38bdf8,#2563eb_52%,#111827)] shadow-[0_0_42px_rgba(56,189,248,0.36)]" aria-hidden />
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-blue-200">IndiCare OS</span>
              <span className="mt-1 block text-sm font-black text-white">Child-centred OS</span>
            </span>
          </Link>
          <div className="mt-4 rounded-[24px] border border-blue-300/10 bg-blue-300/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">Atmosphere</p>
            <p className="mt-2 text-sm font-bold leading-6 text-blue-50">{scope.scope_type === 'child' ? `${scope.selected_child_name || activeChildName || 'Child'} workspace` : scope.scope_type === 'home' ? `${scope.selected_home_name || 'Home'} workspace` : 'Select a home or child to begin'}</p>
          </div>
          <nav
            data-testid={useScopeMenu ? 'scope-navigation' : 'operational-navigation'}
            data-scope-type={scope.scope_type}
            className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1"
            aria-label={useScopeMenu ? 'Scoped workspace navigation' : 'Operational navigation'}
          >
            {navigationGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{group.label}</p>
                <div className="mt-2 space-y-1">
                  {useScopeMenu
                    ? (group.items as ScopeNavItem[]).map((item) => {
                        const active = pathname === item.href || pathname.startsWith(`${item.href.split('?')[0]}/`)
                        const Icon = item.icon
                        return (
                          <Link
                            prefetch={'prefetch' in item ? item.prefetch ?? false : false}
                            key={`${item.label}-${item.href}`}
                            href={item.href}
                            data-testid={'testId' in item ? item.testId : undefined}
                            className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-blue-300 ${active ? 'bg-white text-slate-950 shadow-lg shadow-blue-950/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                          >
                            <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-blue-200/70 group-hover:text-blue-200'}`} aria-hidden />
                            <span className="truncate">{item.label}</span>
                            {item.label === 'Recording alerts' && menuSummary?.recording_alert_count ? (
                              <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">{menuSummary.recording_alert_count}</span>
                            ) : null}
                          </Link>
                        )
                      })
                    : (group.items as ReturnType<typeof visibleOperationalNavigation>).map((item) => {
                        const active = isOperationalNavItemActive(item, pathname)
                        const Icon = item.icon
                        const href = hrefForOperationalItem(item, selectedId, childScopedHref)
                        return (
                          <Link prefetch={false} key={`${item.domain}-${item.href}`} href={href} className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-blue-300 ${active ? 'bg-white text-slate-950 shadow-lg shadow-blue-950/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                            <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-blue-200/70 group-hover:text-blue-200'}`} aria-hidden />
                            <span className="truncate">{item.label}</span>
                            {item.domain === 'daily-care' && hasOsScope ? <RecordingAlertNavBadge role={user.role} /> : null}
                          </Link>
                        )
                      })}
                </div>
              </div>
            ))}
          </nav>
          {!hasPageEmbeddedOrbRail(pathname) && !isRecordingEditorPathStrict(pathname) ? (
            <Link
              prefetch={false}
              href="/assistant/orb"
              data-testid="sidebar-orb-link"
              className="mt-4 block rounded-[24px] border border-blue-300/20 bg-[radial-gradient(circle_at_top,#38bdf833,transparent_55%),rgba(255,255,255,0.08)] p-4 shadow-[0_0_32px_rgba(56,189,248,0.12)] transition hover:border-cyan-300/30 hover:bg-white/10"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">ORB</p>
              <p className="mt-1.5 text-sm font-black text-white">Quiet copilot</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-400" data-testid="orb-quiet-copilot-tagline">
                The quiet copilot for children&apos;s homes — present when needed, invisible when not.
              </p>
            </Link>
          ) : null}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-white/80 bg-[#f8fafc]/90 px-3 py-3 backdrop-blur-xl md:px-6">
            <div className="lg:hidden">
              <MobileOsTopBar scopeTitle={pageTitle} />
              {hasOsScope && secondaryNav.length ? (
                <div className="mt-2">
                  <MobileScopeHeader items={secondaryNav} />
                </div>
              ) : null}
            </div>
            <div className="hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Operational top bar</p>
                  <p className="truncate text-sm font-black text-slate-950">{pageTitle}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {hasOsScope ? <CommandSearch /> : null}
                  {hasOsScope ? <RecordingAlertTopPill role={user.role} /> : null}
                  <Link prefetch={false} href="/select-scope" className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-800 shadow-sm transition hover:bg-blue-100">
                    <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                    {hasOsScope ? 'Switch scope' : 'Choose home'}
                  </Link>
                  {hasOsScope && scope.scope_type === 'child' ? <NotificationBell /> : null}
                  <OperationalTopBarDate />
                  <details className="relative">
                    <summary className="list-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm marker:hidden">Profile</summary>
                    <div className="absolute right-0 mt-2 w-64 rounded-[24px] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/15">
                      <p className="text-sm font-black text-slate-950">{displayName(user)}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{labelForRole(user.role)}</p>
                      <Link prefetch={false} href="/profile" className="mt-4 flex rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">My profile</Link>
                      <Link prefetch={false} href="/settings" className="mt-2 flex rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Settings</Link>
                      <button type="button" onClick={() => void logout()} data-testid="logout-button" className="mt-2 flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">
                        <LogOut className="mr-2 h-4 w-4" aria-hidden />
                        Log out
                      </button>
                    </div>
                  </details>
                </div>
              </div>
              {activeChild && childDomainActive && secondaryNav.length ? (
                <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs font-black uppercase tracking-[0.12em]" aria-label="Child workspace navigation">
                  {secondaryNav.map((item) => {
                    const active = pathname === item.href || (item.href !== '/young-people' && pathname.startsWith(item.href.split('?')[0]))
                    return (
                      <Link prefetch={false} key={`${item.label}-${item.href}`} href={item.href} className={`shrink-0 rounded-full px-4 py-2 transition ${active ? 'bg-blue-700 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-950'}`}>
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
              ) : null}
              <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400" aria-label="Context breadcrumb">
                {displayBreadcrumbs.map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
                    {index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
                    {crumb.href && !crumb.current ? <Link prefetch={false} href={crumb.href} className="hover:text-blue-700">{crumb.label}</Link> : <span className={crumb.current ? 'text-slate-800' : undefined}>{crumb.label}</span>}
                  </span>
                ))}
              </nav>
            </div>
          </header>

          <div
            data-testid="operational-shell-workspace"
            className={`mobile-os-workspace grid min-w-0 gap-5 overflow-x-hidden px-4 py-5 md:px-8 md:py-6 md:pb-32 2xl:grid-cols-[minmax(0,1fr)_300px] ${mobileWorkspaceBottomPaddingClass}`}
          >
            <main className="min-w-0" aria-label="Operational workspace">
              {children}
            </main>
            {hasOsScope ? (
              <aside className="hidden min-w-0 space-y-3 2xl:block" aria-label="Operational intelligence panel">
                {shouldShowShellContextualOrbPanel(pathname) ? <ContextualOrbPanel /> : null}
                <OperationalAlertsPanel />
                {scope.scope_type === 'child' && pathname !== '/command-centre' && !pathname.startsWith('/command-centre/') ? (
                  <OperationalQuickActions selectedYoungPersonId={selectedId} selectedYoungPersonName={activeChildName} />
                ) : null}
              </aside>
            ) : null}
          </div>
        </div>
      </div>
      {shouldShowFloatingOrb(pathname) ? <OrbButton context={orbContext} role={user.role} /> : null}
      {scope.scope_type === 'child' ? (
        <QuickActionButton selectedYoungPersonId={selectedId} selectedYoungPersonName={activeChildName} />
      ) : null}
      <MobileBottomNav />
    </div>
  )
}