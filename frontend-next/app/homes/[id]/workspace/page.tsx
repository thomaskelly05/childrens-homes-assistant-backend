import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ScopeOrbLauncher } from '@/components/orb-operational/scope-orb-launcher'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { HOME_WORKSPACE_WORKFLOW_HREFS } from '@/lib/navigation/scope-routes'
import { getHomeOperationalBundle } from '@/lib/os-api/bundles'

const HOME_SECTIONS: Array<{ title: string; keys: Array<keyof ReturnType<typeof HOME_WORKSPACE_WORKFLOW_HREFS>> }> = [
  { title: 'Today in the home', keys: ['dailyBrief', 'handover', 'staffOnShift', 'notifications'] },
  { title: 'Recording', keys: ['recordingAlerts', 'recordingReviews'] },
  { title: 'Safeguarding and workforce', keys: ['safeguarding', 'workforce', 'staffProfiles', 'actions'] },
  { title: 'Inspection and reports', keys: ['inspectionReadiness', 'sccif', 'reg44', 'reg45', 'reports'] },
  { title: 'Archive and lifecycle', keys: ['archiveSummary', 'planImpactReview', 'lifeechoPending'] }
]

const LINK_LABELS: Record<string, string> = {
  dailyBrief: 'Daily brief',
  handover: 'Handover',
  staffOnShift: 'Staff on shift',
  notifications: 'Notifications',
  recordingAlerts: 'Recording alerts',
  recordingReviews: 'Recording reviews',
  safeguarding: 'Safeguarding / ISN',
  workforce: 'Workforce',
  staffProfiles: 'Staff profiles',
  actions: 'Actions',
  inspectionReadiness: 'Inspection readiness',
  sccif: 'SCCIF alignment',
  reg44: 'Reg 44',
  reg45: 'Reg 45',
  reports: 'Reports',
  archiveSummary: 'Archive this month',
  planImpactReview: 'Plan impacts to review',
  lifeechoPending: 'LifeEcho suggestions'
}

export default async function HomeWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: homeId } = await params
  const result = await getHomeOperationalBundle(homeId)
  const bundle = result.data
  const home = bundle.home || {}
  if (!home.id && result.source === 'live') notFound()
  const homeName = String(home.name || home.home_name || `Home ${homeId}`)
  const routes = HOME_WORKSPACE_WORKFLOW_HREFS(homeId)

  return (
    <div data-testid="home-workspace-page" className="space-y-6">
      <header className="rounded-[32px] border border-white/80 bg-white p-8 shadow-xl shadow-slate-950/5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Home workspace</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">{homeName}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          Lightweight home operating view. Every link is scoped to this home — global command centre and workforce dashboards do not load automatically.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <StatusBadge value={`${bundle.operational_pressure?.children_count || 0} children`} />
          <StatusBadge value={`${bundle.operational_pressure?.actions_open || 0} open actions`} />
        </div>
      </header>

      <LiveDataStatus result={result} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          {HOME_SECTIONS.map((section) => (
            <section key={section.title} className="rounded-[28px] border border-slate-200 bg-white p-6">
              <SectionHeader eyebrow="Home scope" title={section.title} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.keys.map((key) => (
                  <Link
                    key={key}
                    prefetch={false}
                    href={routes[key]}
                    data-testid={`home-workspace-${key}`}
                    className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm font-black text-slate-950 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    {LINK_LABELS[key] || key}
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <section className="rounded-[28px] border border-slate-200 bg-white p-6" data-testid="home-workspace-children">
            <SectionHeader eyebrow="Children in this home" title="Home-scoped snapshot" />
            <p className="mt-3 text-sm text-slate-600">
              {(bundle.children_needing_attention || []).length
                ? `${bundle.children_needing_attention.length} child record(s) flagged on this home.`
                : 'No priority children returned for this home right now.'}
            </p>
            <Link
              href={routes.children}
              prefetch={false}
              className="mt-4 inline-flex text-sm font-black text-blue-700"
            >
              Choose a child in this home →
            </Link>
          </section>
        </div>

        <ScopeOrbLauncher workspace="home" homeId={homeId} homeName={homeName} testId="home-workspace-scope-orb" />
      </div>
    </div>
  )
}
