'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Home,
  LayoutDashboard,
  Pill,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  UserRound,
  BriefcaseMedical,
  TriangleAlert,
  NotebookTabs,
  FolderOpen,
  LogOut
} from 'lucide-react'
import { ReactNode } from 'react'

import { ContextualAssistantPanel } from '@/components/indicare/assistant-panel'
import { CommandSearch } from '@/components/indicare/command-search'
import { useAuth } from '@/contexts/auth-context'
import { displayName, roleLabels, userHasAnyPermission } from '@/lib/auth/permissions'
import { indicareData } from '@/lib/indicare/demo-data'
import { getYoungPersonById } from '@/lib/indicare/selectors'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permissions: ['records:read'] },
  { href: '/young-people', label: 'Young People', icon: UserRound, permissions: ['records:read'] },
  { href: '/staff', label: 'Staff', icon: Users, permissions: ['staff:read'] },
  { href: '/placements', label: 'Placements', icon: Home, permissions: ['records:read'] },
  { href: '/daily-logs', label: 'Daily Logs', icon: NotebookTabs, permissions: ['records:read'] },
  { href: '/incidents', label: 'Incidents', icon: TriangleAlert, permissions: ['records:read'] },
  { href: '/safeguarding', label: 'Safeguarding', icon: ShieldAlert, permissions: ['records:read'] },
  { href: '/risk-assessments', label: 'Risk Assessments', icon: ClipboardCheck, permissions: ['records:read'] },
  { href: '/medication', label: 'Medication', icon: Pill, permissions: ['records:read'] },
  { href: '/keywork', label: 'Keywork', icon: BriefcaseMedical, permissions: ['records:read'] },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays, permissions: ['records:read'] },
  { href: '/reports', label: 'Reports', icon: FileText, permissions: ['reports:read'] },
  { href: '/documents', label: 'Documents', icon: FolderOpen, permissions: ['records:read'] },
  { href: '/assistant', label: 'Assistant', icon: Sparkles, permissions: ['assistant:access'] },
  { href: '/settings', label: 'Settings', icon: Settings, permissions: ['settings:read', 'settings:manage'] }
]

function selectedYoungPersonId(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'young-people' && parts[1]) return parts[1]
  const linkedCollections = ['daily-logs', 'incidents', 'safeguarding', 'risk-assessments', 'medication', 'keywork', 'appointments', 'reports', 'documents']
  if (linkedCollections.includes(parts[0] || '')) {
    const recordId = parts[1]
    if (!recordId) return undefined
    const allRecords = [
      ...indicareData.incidents,
      ...indicareData.reports,
      ...indicareData.dailyLogs,
      ...indicareData.appointments,
      ...indicareData.documents
    ]
    return allRecords.find((record) => record.id === recordId)?.youngPersonId
  }
  return undefined
}

function titleFromPath(pathname: string) {
  if (pathname === '/') return 'Dashboard'
  const parts = pathname.split('/').filter(Boolean)
  if (!parts.length) return 'Dashboard'
  return parts[0].split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { status, user, logout } = useAuth()
  const selectedId = selectedYoungPersonId(pathname)
  const selectedPerson = selectedId ? getYoungPersonById(selectedId) : undefined
  const pageTitle = selectedPerson ? `${selectedPerson.preferredName}'s record` : titleFromPath(pathname)
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date('2026-05-13T12:00:00.000Z'))
  const isPublicPage = pathname === '/login' || pathname.startsWith('/login/') || pathname === '/unauthorized'
  const visibleNavItems = navItems.filter((item) => userHasAnyPermission(user, item.permissions))
  const matchedRoute = navItems
    .filter((item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]
  const hasRouteAccess = !matchedRoute || userHasAnyPermission(user, matchedRoute.permissions)

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
          <p className="mt-4 text-sm leading-6 text-slate-600">Your current role is {roleLabels[user.role]}. Ask an administrator or registered manager if your access needs changing.</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Back to dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f3f6fb] text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-[282px] shrink-0 flex-col border-r border-slate-200/80 bg-white/95 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-3 rounded-[24px] px-2 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-blue-700 text-sm font-black text-white shadow-lg shadow-blue-950/20">IC</div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">IndiCare OS</p>
            <h1 className="text-lg font-black tracking-[-0.04em] text-slate-950">Care command</h1>
          </div>
        </Link>

        <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-auto pr-1">
          <div className="space-y-1">
            {visibleNavItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
        </nav>

        <div className="mt-5 rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Shift continuity</p>
          <strong className="mt-2 block text-3xl font-black tracking-[-0.05em] text-emerald-800">Stable</strong>
          <p className="mt-2 text-xs leading-5 text-slate-600">Oak House evening shift, 5 residents in placement.</p>
        </div>
        <div className="mt-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Signed in</p>
          <p className="mt-2 text-sm font-black text-slate-950">{displayName(user)}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{roleLabels[user.role]}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f8fafc]/95 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <CommandSearch />
            <div className="ml-auto flex items-center gap-3">
              <Link href="/assistant" className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 md:inline-flex">
                <Search className="mr-2 h-4 w-4" aria-hidden />
                Command
              </Link>
              <Link href="/notifications" className="relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm" aria-label="Notifications">
                <Bell className="h-5 w-5" aria-hidden />
                <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">{indicareData.notifications.filter((item) => !item.read).length}</span>
              </Link>
              <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm xl:block">
                Oak House · {today}
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">{children}</main>
          <aside className="hidden border-l border-slate-200/80 bg-[#f7f9fc] p-5 xl:block">
            <div className="sticky top-[92px] space-y-5">
              <ContextualAssistantPanel
                context={{
                  route: pathname,
                  pageTitle,
                  selectedYoungPersonId: selectedId,
                  visibleRecordSummary: selectedPerson ? `${selectedPerson.preferredName} is ${selectedPerson.riskLevel} risk with ${selectedPerson.safeguardingStatus} safeguarding status.` : undefined,
                  userRole: roleLabels[user.role]
                }}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
