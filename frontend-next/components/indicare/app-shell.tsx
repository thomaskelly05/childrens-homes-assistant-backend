'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Home,
  Search,
  Sparkles,
  Users,
  UserRound,
  FolderOpen,
  LogOut,
  Scale,
  Gauge,
  Clock3,
  ShieldCheck
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ReactNode, useEffect } from 'react'

import { CommandSearch } from '@/components/indicare/command-search'
import { ContextualOperationalSidebar } from '@/components/indicare/contextual-operational-sidebar'
import { OrbButton } from '@/components/indicare/orb/orb-button'
import { QuickActionButton } from '@/components/child-journey/quick-action-button'
import { MobileNav } from '@/components/mobile-nav'
import { useAuth } from '@/contexts/auth-context'
import { buildAssistantContext } from '@/lib/assistant-core/context'
import { displayName, roleLabels, userHasAnyPermission } from '@/lib/auth/permissions'
import { useActiveChild } from '@/lib/context/active-child-context'
import { indicareData } from '@/lib/indicare/demo-data'
import { getYoungPersonById } from '@/lib/indicare/selectors'
import { entityContextFromPath } from '@/lib/navigation/entity-resolver'
import type { OrbContext } from '@/lib/orb/types'

type NavItem = {
  section: 'Global' | 'Care' | 'Planning' | 'Evidence' | 'Manager'
  href: string
  label: string
  icon: LucideIcon
  permissions: string[]
  scoped?: boolean
  activeRoots?: string[]
}

const navItems: NavItem[] = [
  { section: 'Global', href: '/home', label: 'Home', icon: Home, permissions: ['records:read'] },
  { section: 'Global', href: '/active-child', label: 'Active Child', icon: UserRound, permissions: ['records:read'], scoped: true },
  { section: 'Global', href: '/shifts/current', label: 'Shift', icon: Clock3, permissions: ['records:read'], activeRoots: ['shifts', 'handover'] },
  { section: 'Global', href: '/notifications', label: 'Notifications', icon: Bell, permissions: ['records:read'], activeRoots: ['notifications'] },
  { section: 'Global', href: '/assistant', label: 'Orb', icon: Sparkles, permissions: ['assistant:access'], activeRoots: ['assistant'] },
  { section: 'Care', href: '/journey', label: 'Journey', icon: ShieldCheck, permissions: ['records:read'], scoped: true },
  { section: 'Care', href: '/daily-note', label: 'Recording', icon: ClipboardCheck, permissions: ['records:read'], scoped: true, activeRoots: ['daily-logs', 'incidents', 'keywork', 'medication', 'health'] },
  { section: 'Care', href: '/chronology', label: 'Chronology', icon: Search, permissions: ['records:read'], scoped: true },
  { section: 'Planning', href: '/plans', label: 'Plans', icon: ClipboardCheck, permissions: ['records:read'], scoped: true, activeRoots: ['placements', 'risk-assessments'] },
  { section: 'Planning', href: '/actions', label: 'Actions', icon: ClipboardCheck, permissions: ['records:read'], scoped: true },
  { section: 'Planning', href: '/management?focus=reviews', label: 'Reviews', icon: Gauge, permissions: ['reports:read'], activeRoots: ['management'] },
  { section: 'Evidence', href: '/documents', label: 'Documents', icon: FolderOpen, permissions: ['records:read'], scoped: true },
  { section: 'Evidence', href: '/reports', label: 'Reports', icon: FileText, permissions: ['reports:read'], scoped: true },
  { section: 'Evidence', href: '/evidence', label: 'Evidence', icon: FileText, permissions: ['records:read'], scoped: true },
  { section: 'Manager', href: '/management', label: 'Oversight', icon: Gauge, permissions: ['reports:read'] },
  { section: 'Manager', href: '/regulatory', label: 'Compliance', icon: Scale, permissions: ['records:read'] },
  { section: 'Manager', href: '/staff', label: 'Staffing', icon: Users, permissions: ['staff:read'] },
  { section: 'Manager', href: '/ofsted-readiness', label: 'Inspection Readiness', icon: Gauge, permissions: ['reports:read'] }
]

const demoMode = ['1', 'true', 'yes'].includes(String(process.env.NEXT_PUBLIC_DEMO_MODE || '').toLowerCase())
const recordWorkspaceRoots = ['actions', 'reports', 'evidence', 'documents', 'chronology', 'daily-logs', 'incidents', 'safeguarding', 'medication', 'health', 'keywork', 'appointments', 'risk-assessments', 'reg44']
const childContextRequiredRoots = ['chronology', 'actions', 'reports', 'documents', 'evidence', 'safeguarding']

function selectedYoungPersonId(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'young-people' && parts[1]) return parts[1]
  const linkedCollections = ['daily-logs', 'incidents', 'safeguarding', 'risk-assessments', 'medication', 'keywork', 'appointments', 'reports', 'documents', 'chronology', 'actions', 'evidence']
  if (linkedCollections.includes(parts[0] || '')) {
    const recordId = parts[1]
    if (!recordId) return undefined
    const allRecords = [
      ...(indicareData.incidents ?? []),
      ...(indicareData.reports ?? []),
      ...(indicareData.dailyLogs ?? []),
      ...(indicareData.appointments ?? []),
      ...(indicareData.documents ?? [])
    ]
    return allRecords.find((record) => record.id === recordId)?.youngPersonId
  }
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
    return encodedChildId ? `/young-people/${encodedChildId}/journey?focus=plans` : '/documents'
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
  const { activeChild, breadcrumbs, childScopedHref, lockVersion } = useActiveChild()
  const pathParts = pathname.split('/').filter(Boolean)
  const routeSelectedId = selectedYoungPersonId(pathname)
  const selectedId = routeSelectedId || activeChild?.id
  const selectedPerson = selectedId ? getYoungPersonById(selectedId) : undefined
  const selectedEntityContext = entityContextFromPath(pathname)
  const activeChildName = activeChild?.preferredName || activeChild?.displayName
  const pageTitle = selectedPerson ? `${selectedPerson.preferredName}'s journey` : activeChildName ? `${activeChildName}'s journey` : titleFromPath(pathname)
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date('2026-05-13T12:00:00.000Z'))
  const isPublicPage = pathname === '/login' || pathname.startsWith('/login/') || pathname === '/unauthorized'
  const visibleNavItems = navItems.filter((item) => userHasAnyPermission(user, item.permissions))
  const navSections = Array.from(new Set(visibleNavItems.map((item) => item.section)))
  const matchedRoute = navItems
    .filter((item) => !item.scoped && (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))))
    .sort((a, b) => b.href.length - a.href.length)[0]
  const hasRouteAccess = !matchedRoute || userHasAnyPermission(user, matchedRoute.permissions)
  const isStandaloneAssistant = pathname === '/assistant' || pathname.startsWith('/assistant/')
  const isChildRecordingWorkspace = pathParts[0] === 'young-people' && pathParts.length === 4 && ['new', 'upload'].includes(pathParts[3])
  const isRecordWorkspace = pathParts.length >= 2 && recordWorkspaceRoots.includes(pathParts[0]) && !['new', 'current'].includes(pathParts[pathParts.length - 1])
  const routeRequiresChildContext = pathParts.length === 1 && childContextRequiredRoots.includes(pathParts[0] || '')
  const childContextRedirect = activeChild && routeRequiresChildContext ? childScopedHref(`/${pathParts[0]}`) : null

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
    selectedRecordSummary: selectedPerson ? `${selectedPerson.preferredName} is ${selectedPerson.riskLevel} risk with ${selectedPerson.safeguardingStatus} safeguarding status.` : activeChildName ? `Active child context is locked to ${activeChildName}.` : undefined
  })

  const orbContext: OrbContext = {
    route: pathname,
    workspace: assistantContext.current_workspace_type,
    page_title: pageTitle,
    selected_young_person_id: selectedId && Number.isFinite(Number(selectedId)) ? Number(selectedId) : undefined,
    selected_young_person_key: selectedId,
    selected_record_id: selectedEntityContext?.selected_record_id,
    selected_record_type: selectedEntityContext?.selected_record_type,
    current_record_summary: selectedPerson ? `${selectedPerson.preferredName} is ${selectedPerson.riskLevel} risk with ${selectedPerson.safeguardingStatus} safeguarding status.` : activeChildName ? `Active child context is locked to ${activeChildName}.` : undefined,
    current_child: selectedId ? {
      id: selectedId,
      name: selectedPerson?.preferredName || activeChildName || selectedId,
      risk_level: selectedPerson?.riskLevel,
      safeguarding_status: selectedPerson?.safeguardingStatus,
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

  return (
    <div className="flex min-h-screen bg-[#f3f6fb] text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-[282px] shrink-0 flex-col border-r border-slate-200/80 bg-white/95 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link href="/home" className="mb-6 flex items-center gap-3 rounded-[24px] px-2 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-blue-700 text-sm font-black text-white shadow-lg shadow-blue-950/20">IC</div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">IndiCare OS</p>
            <h1 className="text-lg font-black tracking-[-0.04em] text-slate-950">Care command</h1>
          </div>
        </Link>

        <div className="mb-5 rounded-[24px] border border-blue-100 bg-blue-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Active child</p>
          <p className="mt-2 text-base font-black text-slate-950">{activeChildName || 'No child selected'}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{activeChild ? 'OS locked to this journey. Detailed links stay child-scoped.' : 'Choose a child before opening detailed records.'}</p>
          <Link href="/home" className="mt-3 inline-flex text-xs font-black uppercase tracking-[0.14em] text-blue-700">{activeChild ? 'Switch child safely' : 'Choose child'}</Link>
        </div>

        <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-auto pr-1">
          <div className="space-y-5">
            {navSections.map((section) => (
              <section key={section}>
                <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{section}</p>
                <div className="space-y-1">
                  {visibleNavItems.filter((item) => item.section === section).map((item) => {
                    const active = isNavItemActive(item, pathname)
                    const Icon = item.icon
                    const href = hrefForNavItem(item, selectedId, childScopedHref)
                    return (
                      <Link
                        key={item.href}
                        href={href}
                        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          active ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div className="mt-5 rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Shift continuity</p>
          <strong className="mt-2 block text-3xl font-black tracking-[-0.05em] text-emerald-800">Stable</strong>
          <p className="mt-2 text-xs leading-5 text-slate-600">Oak House evening shift, 5 residents in placement.</p>
        </div>
        <div className="mt-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Signed in</p>
          <p className="mt-2 text-sm font-black text-slate-950">{displayName(user)}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{labelForRole(user.role)}</p>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Log out"
            data-testid="logout-button"
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {demoMode ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-amber-900 md:px-6">
            Demo data mode active - synthetic records only. Do not enter real child, staff or provider information.
          </div>
        ) : null}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f8fafc]/95 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <CommandSearch />
            <div className="ml-auto flex items-center gap-3">
              {activeChild ? (
                <Link href={`/young-people/${encodeURIComponent(activeChild.id)}/journey`} className="hidden rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 shadow-sm transition hover:bg-blue-100 md:inline-flex">
                  <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                  {activeChildName}
                </Link>
              ) : (
                <Link href="/home" className="hidden rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 shadow-sm transition hover:bg-amber-100 md:inline-flex">
                  Choose child
                </Link>
              )}
              <Link href="/assistant" className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 md:inline-flex">
                <Search className="mr-2 h-4 w-4" aria-hidden />
                Command
              </Link>
              <Link href="/notifications" className="relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm" aria-label="Notifications">
                <Bell className="h-5 w-5" aria-hidden />
                <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">{(indicareData.notifications ?? []).filter((item) => !item.read).length}</span>
              </Link>
              <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm xl:block">
                Oak House · {today}
              </div>
            </div>
          </div>
          <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400" aria-label="Context breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
                {crumb.href && !crumb.current ? <Link href={crumb.href} className="hover:text-blue-700">{crumb.label}</Link> : <span className={crumb.current ? 'text-slate-800' : undefined}>{crumb.label}</span>}
              </span>
            ))}
          </nav>
        </header>

        <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0 px-4 py-6 pb-28 md:px-8 md:py-8">{children}</main>
          <aside className="hidden border-l border-slate-200/80 bg-[#f7f9fc] p-5 xl:block">
            <div className="sticky top-[92px] space-y-5">
              <ContextualOperationalSidebar pathname={pathname} activeChildId={selectedId} activeChildName={selectedPerson?.preferredName || activeChildName} />
            </div>
          </aside>
        </div>
      </div>
      <OrbButton context={orbContext} role={user.role} />
      <QuickActionButton selectedYoungPersonId={selectedId} selectedYoungPersonName={selectedPerson?.preferredName} />
      <MobileNav />
    </div>
  )
}
