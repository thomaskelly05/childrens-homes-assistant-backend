'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Home,
  Sparkles,
  UserRound,
  FolderOpen,
  LogOut,
  Gauge,
  Clock3,
  ShieldCheck,
  Settings
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ReactNode, useEffect } from 'react'

import { CommandSearch } from '@/components/indicare/command-search'
import { OrbButton } from '@/components/indicare/orb/orb-button'
import { QuickActionButton } from '@/components/child-journey/quick-action-button'
import { MobileNav } from '@/components/mobile-nav'
import { useAuth } from '@/contexts/auth-context'
import { buildAssistantContext } from '@/lib/assistant-core/context'
import { displayName, roleLabels, userHasAnyPermission } from '@/lib/auth/permissions'
import { useActiveChild } from '@/lib/context/active-child-context'
import { routeRequiresChildWorkspace } from '@/lib/context/child-workspace-hydration'
import { entityContextFromPath } from '@/lib/navigation/entity-resolver'
import type { OrbContext } from '@/lib/orb/types'

type NavItem = {
  section: 'Global' | 'Child' | 'System'
  href: string
  label: string
  icon: LucideIcon
  permissions: string[]
  scoped?: boolean
  activeRoots?: string[]
}

const navItems: NavItem[] = [
  { section: 'Global', href: '/home', label: 'Home', icon: Home, permissions: ['records:read'] },
  { section: 'Global', href: '/active-child', label: 'Current Child', icon: UserRound, permissions: ['records:read'], scoped: true },
  { section: 'Child', href: '/daily-note', label: 'Quick Record', icon: ClipboardCheck, permissions: ['records:read'], scoped: true, activeRoots: ['daily-logs', 'incidents', 'keywork', 'medication', 'health'] },
  { section: 'Child', href: '/chronology', label: 'Chronology', icon: Clock3, permissions: ['records:read'], scoped: true },
  { section: 'Child', href: '/plans', label: 'Plans', icon: ClipboardCheck, permissions: ['records:read'], scoped: true, activeRoots: ['placements', 'risk-assessments'] },
  { section: 'Child', href: '/documents', label: 'Documents', icon: FolderOpen, permissions: ['records:read'], scoped: true },
  { section: 'Child', href: '/reports', label: 'Reports', icon: FileText, permissions: ['reports:read'], scoped: true },
  { section: 'Global', href: '/assistant', label: 'Orb', icon: Sparkles, permissions: ['assistant:access'], activeRoots: ['assistant'] },
  { section: 'Global', href: '/notifications', label: 'Notifications', icon: Bell, permissions: ['records:read'], activeRoots: ['notifications'] },
  { section: 'Global', href: '/shifts/current', label: 'Shift', icon: Clock3, permissions: ['records:read'], activeRoots: ['shifts', 'handover'] },
  { section: 'System', href: '/settings', label: 'Settings', icon: Settings, permissions: ['records:read'], activeRoots: ['settings'] },
  { section: 'System', href: '/management', label: 'Reviews', icon: Gauge, permissions: ['reports:read'], activeRoots: ['management'] }
]

const recordWorkspaceRoots = ['actions', 'reports', 'evidence', 'documents', 'chronology', 'daily-logs', 'incidents', 'safeguarding', 'medication', 'health', 'keywork', 'appointments', 'risk-assessments', 'reg44']
const childContextRequiredRoots = ['chronology', 'actions', 'reports', 'documents', 'evidence', 'safeguarding']

function selectedYoungPersonId(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'young-people' && parts[1]) return parts[1]
  return undefined
}

function titleFromPath(pathname: string) {
  if (pathname === '/' || pathname === '/home') return 'Home'
  const parts = pathname.split('/').filter(Boolean)
  if (!parts.length) return 'Home'
  return parts[0].split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

function labelForRole(role: keyof typeof roleLabels | string | undefined) {
  return role && role in roleLabels ? roleLabels[role as keyof typeof roleLabels] : roleLabels.viewer
}

function hrefForNavItem(item: NavItem, activeChildId: string | undefined, childScopedHref: (href: string) => string) {
  const encodedChildId = activeChildId ? encodeURIComponent(activeChildId) : null
  if (item.href === '/active-child' || item.href === '/journey') {
    return encodedChildId ? `/young-people/${encodedChildId}/journey` : '/home'
  }
  if (item.href === '/daily-note') {
    return encodedChildId ? `/young-people/${encodedChildId}/daily-note/new` : '/home'
  }
  if (item.href === '/plans') {
    return encodedChildId ? `/documents?young_person_id=${encodedChildId}&scope=plans` : '/documents'
  }
  return item.scoped ? childScopedHref(item.href) : item.href
}

function isNavItemActive(item: NavItem, pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const root = parts[0] || 'home'
  if (item.activeRoots?.includes(root)) return true
  if (item.href === '/journey') return parts[0] === 'young-people' && parts[2] === 'journey'
  if (item.href === '/daily-note') return parts[0] === 'young-people' && parts[2] === 'daily-note'
  if (item.href === '/plans') return ['placements', 'risk-assessments'].includes(root) || pathname.includes('focus=plans')
  return pathname === item.href || (item.href !== '/home' && item.href !== '/dashboard' && pathname.startsWith(item.href))
}

export function AppShell({ children }: { children: ReactNode }) {
  const currentPathname = usePathname()
  const router = useRouter()
  const pathname = currentPathname || '/home'
  const { status, user, logout } = useAuth()
  const { activeChild, breadcrumbs, childScopedHref, lockVersion, readyState } = useActiveChild()
  const pathParts = pathname.split('/').filter(Boolean)
  const routeSelectedId = selectedYoungPersonId(pathname)
  const selectedId = routeSelectedId || activeChild?.id
  const selectedEntityContext = entityContextFromPath(pathname)
  const activeChildName = activeChild?.preferredName || activeChild?.displayName
  const pageTitle = activeChildName ? `${activeChildName}'s journey` : titleFromPath(pathname)
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())
  const isPublicPage = pathname === '/login' || pathname.startsWith('/login/') || pathname === '/unauthorized'
  const visibleNavItems = navItems.filter((item) => userHasAnyPermission(user, item.permissions))
  const matchedRoute = navItems
    .filter((item) => !item.scoped && (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))))
    .sort((a, b) => b.href.length - a.href.length)[0]
  const hasRouteAccess = !matchedRoute || userHasAnyPermission(user, matchedRoute.permissions)
  const isStandaloneAssistant = pathname === '/assistant' || pathname.startsWith('/assistant/')
  const isChildRecordingWorkspace = pathParts[0] === 'young-people' && pathParts.length === 4 && ['new', 'upload'].includes(pathParts[3])
  const isRecordWorkspace = pathParts.length >= 2 && recordWorkspaceRoots.includes(pathParts[0]) && !['new', 'current'].includes(pathParts[pathParts.length - 1])
  const routeRequiresChildContext = pathParts.length === 1 && childContextRequiredRoots.includes(pathParts[0] || '')
  const childContextRedirect = activeChild && routeRequiresChildContext ? childScopedHref(`/${pathParts[0]}`) : null
  const requiresWorkspaceHydration = routeRequiresChildWorkspace(pathname, typeof window === 'undefined' ? null : new URLSearchParams(window.location.search))

  useEffect(() => {
    if (childContextRedirect && childContextRedirect !== pathname) {
      router.replace(childContextRedirect)
    }
  }, [childContextRedirect, pathname, router])

  if (isPublicPage) {
    return <>{children}</>
  }

  if (status === 'loading' || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-900">
        <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-950/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">IC</div>
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
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">Unauthorized</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">You do not have access to this workspace area</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">Your current role is {labelForRole(user.role)}. Ask an administrator or registered manager if your access needs changing.</p>
          <Link href="/home" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Back home</Link>
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
          <Link href="/home" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Choose child</Link>
        </div>
      </div>
    )
  }

  if (requiresWorkspaceHydration && !readyState.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-900">
        <div className="w-full max-w-lg rounded-[32px] border border-blue-100 bg-white p-8 text-center shadow-2xl shadow-slate-950/10">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Preparing child workspace</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">{readyState.phase === 'blocked' ? 'No records found yet.' : 'Opening the selected child journey'}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">{readyState.reason || 'Checking child, session and role context before records load.'}</p>
          {readyState.phase === 'active_child' ? <Link href="/home" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Choose child</Link> : null}
        </div>
      </div>
    )
  }

  if (childContextRedirect && childContextRedirect !== pathname) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-900">
        <div className="w-full max-w-lg rounded-[32px] border border-blue-100 bg-white p-8 text-center shadow-2xl shadow-slate-950/10">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Entering child journey</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">Opening {activeChildName}&apos;s scoped workspace</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">Detailed records are being filtered to the active child context.</p>
        </div>
      </div>
    )
  }

  const assistantContext = buildAssistantContext({
    mode: 'embedded',
    route: pathname,
    pageTitle,
    selectedYoungPersonId: selectedId,
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
    current_child: selectedId ? {
      id: selectedId,
      name: activeChildName || selectedId,
      current_route: pathname
    } : undefined,
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

  if (isStandaloneAssistant) {
    return <>{children}</>
  }

  if (isChildRecordingWorkspace || isRecordWorkspace) {
    return (
      <div className="min-h-screen bg-[#eef4fb] text-slate-900">
        {children}
        <OrbButton context={orbContext} role={user.role} />
      </div>
    )
  }

  const primaryNav = visibleNavItems.filter((item) => item.section !== 'System')
  const secondaryNav = [
    { label: 'Journey', href: selectedId ? `/young-people/${encodeURIComponent(selectedId)}/journey` : '/home' },
    { label: 'Daily Story', href: selectedId ? `/young-people/${encodeURIComponent(selectedId)}/daily-note/new` : '/home' },
    { label: 'Important Events', href: childScopedHref('/chronology') },
    { label: 'Plans', href: selectedId ? `/documents?young_person_id=${encodeURIComponent(selectedId)}&scope=plans` : '/documents' },
    { label: 'Risks', href: selectedId ? `/risk-assessments?young_person_id=${encodeURIComponent(selectedId)}` : '/risk-assessments' },
    { label: 'Documents', href: childScopedHref('/documents') },
    { label: 'Reviews', href: selectedId ? `/reports?young_person_id=${encodeURIComponent(selectedId)}&type=review` : '/reports' }
  ]

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f8fafc]/95 px-3 py-3 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/home" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/20" aria-label="Home">
            IC
          </Link>
          <div className="hidden min-w-0 lg:block">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">IndiCare OS</p>
            <p className="truncate text-sm font-black text-slate-950">{activeChildName ? `${activeChildName}'s workspace` : 'Choose child'}</p>
          </div>
          <nav aria-label="Operational navigation" className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
            {primaryNav.map((item) => {
              const active = isNavItemActive(item, pathname)
              const Icon = item.icon
              const href = hrefForNavItem(item, selectedId, childScopedHref)
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    active ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15' : 'text-slate-600 hover:bg-white hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <CommandSearch />
            <Link href="/home" className="hidden rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-800 shadow-sm transition hover:bg-blue-100 md:inline-flex">
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
              {activeChildName ? 'Switch child' : 'Choose child'}
            </Link>
            <Link href="/notifications" className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm" aria-label="Notifications">
              <Bell className="h-5 w-5" aria-hidden />
            </Link>
            <div className="hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm xl:block">
              {today}
            </div>
            <details className="relative hidden md:block">
              <summary className="list-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm marker:hidden">
                Profile
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-[24px] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/15">
                <p className="text-sm font-black text-slate-950">{displayName(user)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{labelForRole(user.role)}</p>
                <Link href="/settings" className="mt-4 flex rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Settings</Link>
                <button type="button" onClick={() => void logout()} data-testid="logout-button" className="mt-2 flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">
                  <LogOut className="mr-2 h-4 w-4" aria-hidden />
                  Log out
                </button>
              </div>
            </details>
          </div>
        </div>
        {activeChild ? (
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs font-black uppercase tracking-[0.12em]" aria-label="Child workspace navigation">
            {secondaryNav.map((item) => {
              const active = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href.split('?')[0]))
              return (
                <Link key={`${item.label}-${item.href}`} href={item.href} className={`shrink-0 rounded-full px-4 py-2 transition ${active ? 'bg-blue-700 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-950'}`}>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        ) : null}
        <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400" aria-label="Context breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
              {crumb.href && !crumb.current ? <Link href={crumb.href} className="hover:text-blue-700">{crumb.label}</Link> : <span className={crumb.current ? 'text-slate-800' : undefined}>{crumb.label}</span>}
            </span>
          ))}
        </nav>
      </header>

      <main className="min-w-0 px-4 py-6 pb-32 md:px-8 md:py-8">{children}</main>
      <OrbButton context={orbContext} role={user.role} />
      <QuickActionButton selectedYoungPersonId={selectedId} selectedYoungPersonName={activeChildName} />
      <MobileNav />
    </div>
  )
}
