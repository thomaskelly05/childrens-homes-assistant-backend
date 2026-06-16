import { notFound } from 'next/navigation'

import { MobileSafeLink } from '@/components/indicare/mobile/mobile-safe-link'
import { OperationalOrbRail } from '@/components/orb-operational/operational-orb-rail'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { SectionHeader, StatusBadge } from '@/components/indicare/ui'
import {
  HOME_WORKSPACE_WORKFLOW_HREFS,
  homeDailyBriefHref,
  homeHandoverHref,
  homeOrbHref,
  homeReportsHref
} from '@/lib/navigation/scope-routes'
import { getHomeOperationalBundle } from '@/lib/os-api/bundles'

const HOME_SECTIONS: Array<{
  testId: string
  title: string
  description: string
  keys: Array<keyof ReturnType<typeof HOME_WORKSPACE_WORKFLOW_HREFS>>
}> = [
  {
    testId: 'home-workspace-section-today',
    title: 'Home today',
    description: 'Children, urgent alerts, recording reviews, handover and daily brief.',
    keys: ['children', 'recordingAlerts', 'recordingReviews', 'handover', 'dailyBrief']
  },
  {
    testId: 'home-workspace-section-safeguarding',
    title: 'Safeguarding and oversight',
    description: 'ISN, alerts, manager actions and notifications.',
    keys: ['safeguarding', 'recordingAlerts', 'actions', 'notifications']
  },
  {
    testId: 'home-workspace-section-workforce',
    title: 'Workforce and shift',
    description: 'Staff on shift, handover and workforce routes.',
    keys: ['staffOnShift', 'handover', 'workforce', 'staffProfiles']
  },
  {
    testId: 'home-workspace-section-inspection',
    title: 'Regulation and quality',
    description: 'Inspection evidence preparation, Quality Standards alignment, Reg 44 and Reg 45 — evidence snapshots, not grade claims.',
    keys: ['sccif', 'inspectionReadiness', 'reg44', 'reg45']
  },
  {
    testId: 'home-workspace-section-more',
    title: 'More',
    description: 'Archive lifecycle, reports, settings and ORB.',
    keys: ['archiveSummary', 'chronologyGaps', 'planImpactReview', 'lifeechoPending', 'reports']
  }
]

const HOME_LINK_PURPOSE: Record<string, string> = {
  children: 'See who is in this home and open a child workspace.',
  dailyBrief: 'Manager daily brief for this home.',
  handover: 'Shift handover for this home.',
  staffOnShift: 'Who is on shift right now.',
  notifications: 'Home-scoped notifications.',
  recordingAlerts: 'Recording quality and safeguarding alerts.',
  recordingReviews: 'Drafts awaiting manager sign-off.',
  safeguarding: 'ISN and safeguarding oversight for this home.',
  workforce: 'Roster and workforce management.',
  staffProfiles: 'Staff profiles linked to this home.',
  actions: 'Open manager actions for this home.',
  inspectionReadiness: 'Evidence snapshot — manager judgement required.',
  sccif: 'Quality Standards alignment — gaps to review.',
  reg44: 'Reg 44 visit support — not a grade prediction.',
  reg45: 'Reg 45 quality of care review builder.',
  reports: 'Home reports and exports.',
  archiveSummary: 'Archive activity this month.',
  chronologyGaps: 'Chronology gaps to review.',
  planImpactReview: 'Plan impact suggestions awaiting review.',
  lifeechoPending: 'LifeEcho memory suggestions pending approval.'
}

const LINK_LABELS: Record<string, string> = {
  children: 'Children in this home',
  dailyBrief: 'Daily brief',
  handover: 'Handover',
  staffOnShift: 'Staff on shift',
  notifications: 'Notifications',
  recordingAlerts: 'Recording alerts',
  recordingReviews: 'Recording reviews',
  safeguarding: 'Safeguarding / ISN',
  workforce: 'Workforce',
  staffProfiles: 'Staff profiles',
  actions: 'Manager actions',
  inspectionReadiness: 'Inspection evidence preparation',
  sccif: 'SCCIF alignment',
  reg44: 'Reg 44',
  reg45: 'Reg 45',
  reports: 'Reports',
  archiveSummary: 'Archive this month',
  chronologyGaps: 'Chronology gaps',
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
    <div data-testid="home-workspace-page" className="mobile-home-workspace space-y-5 md:space-y-6">
      <header
        className="home-workspace-hero-mobile-compact rounded-[24px] border border-white/80 bg-white p-5 shadow-lg shadow-slate-950/5 md:rounded-[32px] md:p-8 md:shadow-xl"
        data-testid="home-workspace-hero"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Home workspace</p>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950 md:mt-3 md:text-4xl">{homeName}</h1>
        <p className="mt-3 hidden max-w-2xl text-sm leading-7 text-slate-600 md:block">
          Calm home view — today&apos;s priorities, safeguarding, staff and Inspection evidence preparation without loading every module at once.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-6" data-testid="home-workspace-hero-badges">
          <StatusBadge value={`${bundle.operational_pressure?.children_count || 0} children`} />
          <span data-testid="home-workspace-priority-count">
            <StatusBadge
              value={`${(bundle.operational_pressure?.actions_open || 0) + (bundle.operational_pressure?.recording_reviews_pending || 0)} today’s priorities`}
            />
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-5" data-testid="home-workspace-hero-actions">
          <MobileSafeLink
            href={homeDailyBriefHref(homeId)}
            prefetch={false}
            data-testid="home-hero-daily-brief"
            className="inline-flex min-h-11 items-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-md"
          >
            Daily brief
          </MobileSafeLink>
          <MobileSafeLink
            href={homeHandoverHref(homeId)}
            prefetch={false}
            data-testid="home-hero-handover"
            className="inline-flex min-h-11 items-center rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-black text-blue-900"
          >
            Handover
          </MobileSafeLink>
        </div>
      </header>

      <LiveDataStatus result={result} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          {HOME_SECTIONS.map((section) => (
            <section
              key={section.testId}
              id={section.testId === 'home-workspace-section-more' ? 'more' : undefined}
              data-testid={section.testId}
              className="rounded-[28px] border border-slate-200 bg-white p-6"
            >
              <SectionHeader eyebrow="Home scope" title={section.title} description={section.description} />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {section.keys.map((key) => (
                  <MobileSafeLink
                    key={key}
                    prefetch={false}
                    href={routes[key]}
                    data-testid={
                      key === 'dailyBrief'
                        ? 'mobile-home-daily-brief-button'
                        : key === 'handover'
                          ? 'mobile-home-handover-button'
                          : key === 'recordingReviews'
                            ? 'mobile-home-reviews-button'
                            : key === 'recordingAlerts'
                              ? 'mobile-home-alerts-button'
                              : `home-workspace-${key}`
                    }
                    tapDebugLabel={`home-shortcut-${key}`}
                    className="min-h-11 rounded-[20px] border border-slate-200 bg-white p-4 text-sm font-black text-slate-950 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span className="block">{LINK_LABELS[key] || key}</span>
                    <span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-500">
                      {HOME_LINK_PURPOSE[key] || 'Open workflow'}
                    </span>
                  </MobileSafeLink>
                ))}
                {section.testId === 'home-workspace-section-safeguarding' ? (
                  <>
                    <MobileSafeLink
                      href={`/select-scope?home_id=${encodeURIComponent(homeId)}`}
                      prefetch={false}
                      data-testid="home-workspace-incidents-hint"
                      className="min-h-11 rounded-[20px] border border-amber-100 bg-amber-50/50 p-4 text-sm font-black text-amber-950"
                    >
                      <span className="block">Incidents (choose child)</span>
                      <span className="mt-1 block text-[10px] font-semibold text-amber-800">
                        Record via child scope — /record?child_id=
                      </span>
                    </MobileSafeLink>
                    <MobileSafeLink
                      href={`/select-scope?home_id=${encodeURIComponent(homeId)}`}
                      prefetch={false}
                      data-testid="home-workspace-missing-hint"
                      className="min-h-11 rounded-[20px] border border-rose-100 bg-rose-50/50 p-4 text-sm font-black text-rose-950"
                    >
                      <span className="block">Missing episodes (choose child)</span>
                      <span className="mt-1 block text-[10px] font-semibold text-rose-800">
                        Child-scoped missing-episode recording
                      </span>
                    </MobileSafeLink>
                  </>
                ) : null}
                {section.testId === 'home-workspace-section-workforce' ? (
                  <>
                    <MobileSafeLink
                      href="/staff"
                      prefetch={false}
                      data-testid="home-workspace-supervision-hint"
                      className="min-h-11 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800"
                    >
                      <span className="block">Supervision / training</span>
                      <span className="mt-1 block text-[10px] font-semibold text-slate-500">
                        Workforce route — not all flows wired per home yet
                      </span>
                    </MobileSafeLink>
                  </>
                ) : null}
                {section.testId === 'home-workspace-section-more' ? (
                  <>
                    <MobileSafeLink
                      href={homeOrbHref(homeId)}
                      prefetch={false}
                      data-testid="home-workspace-orb"
                      className="min-h-11 rounded-[20px] border border-cyan-200 bg-cyan-50 p-4 text-sm font-black text-cyan-950"
                    >
                      Ask ORB (operational)
                    </MobileSafeLink>
                    <MobileSafeLink
                      href="/settings"
                      prefetch={false}
                      data-testid="home-workspace-settings"
                      className="min-h-11 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800"
                    >
                      Settings
                    </MobileSafeLink>
                  </>
                ) : null}
              </div>
            </section>
          ))}

          <section className="rounded-[28px] border border-slate-200 bg-white p-6" data-testid="home-workspace-children">
            <SectionHeader eyebrow="Children in this home" title="Who is here today" />
            <p className="mt-3 text-sm text-slate-600">
              {(bundle.children_needing_attention || []).length
                ? `${bundle.children_needing_attention.length} child record(s) flagged on this home.`
                : 'No priority children returned for this home right now.'}
            </p>
            <MobileSafeLink
              href={routes.children}
              prefetch={false}
              data-testid="home-workspace-choose-child"
              className="mt-4 inline-flex min-h-11 text-sm font-black text-blue-700"
            >
              Choose a child in this home →
            </MobileSafeLink>
            <MobileSafeLink
              href={homeReportsHref(homeId)}
              prefetch={false}
              data-testid="home-workspace-reports"
              className="ml-4 inline-flex min-h-11 text-sm font-black text-slate-600"
            >
              Home reports →
            </MobileSafeLink>
          </section>
        </div>

        <div className="hidden xl:block">
          <OperationalOrbRail
            scopeType="home"
            homeId={homeId}
            homeName={homeName}
            testId="home-workspace-orb-rail"
          />
        </div>
      </div>
    </div>
  )
}
