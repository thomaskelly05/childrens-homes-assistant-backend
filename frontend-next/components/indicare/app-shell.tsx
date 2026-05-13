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
  FolderOpen
} from 'lucide-react'
import { ReactNode } from 'react'

import { ContextualAssistantPanel } from '@/components/indicare/assistant-panel'
import { CommandSearch } from '@/components/indicare/command-search'
import { indicareData } from '@/lib/indicare/demo-data'
import { getYoungPersonById } from '@/lib/indicare/selectors'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/young-people', label: 'Young People', icon: UserRound },
  { href: '/staff', label: 'Staff', icon: Users },
  { href: '/placements', label: 'Placements', icon: Home },
  { href: '/daily-logs', label: 'Daily Logs', icon: NotebookTabs },
  { href: '/incidents', label: 'Incidents', icon: TriangleAlert },
  { href: '/safeguarding', label: 'Safeguarding', icon: ShieldAlert },
  { href: '/risk-assessments', label: 'Risk Assessments', icon: ClipboardCheck },
  { href: '/medication', label: 'Medication', icon: Pill },
  { href: '/keywork', label: 'Keywork', icon: BriefcaseMedical },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/assistant', label: 'Assistant', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings }
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
  const selectedId = selectedYoungPersonId(pathname)
  const selectedPerson = selectedId ? getYoungPersonById(selectedId) : undefined
  const pageTitle = selectedPerson ? `${selectedPerson.preferredName}'s record` : titleFromPath(pathname)
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date('2026-05-13T12:00:00.000Z'))

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
            {navItems.map((item) => {
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
                  userRole: 'Registered manager'
                }}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
