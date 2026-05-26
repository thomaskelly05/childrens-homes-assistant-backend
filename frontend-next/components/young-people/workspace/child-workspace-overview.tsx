import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, SectionHeader } from '@/components/indicare/ui'
import type { OsApiResult } from '@/lib/os-api/types'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

import { ChildAboutCard } from './child-about-card'
import { ChildActionsReviewCard } from './child-actions-review-card'
import { ChildPlansDocumentsCard } from './child-plans-documents-card'
import { ChildProfileHero } from './child-profile-hero'
import { ChildRiskSafeguardingCard } from './child-risk-safeguarding-card'
import { ChildSupportCard } from './child-support-card'
import { ChildTodayCard } from './child-today-card'
import { ChildVoiceCard } from './child-voice-card'
import { ChildWhatMattersCard } from './child-what-matters-card'
import { ChildLifecycleCard } from './child-lifecycle-card'
import { OperationalOrbRail } from '@/components/orb-operational/operational-orb-rail'

import { ChildWorkspaceOrbRail } from './child-workspace-orb-rail'

export function ChildWorkspaceOverview({
  view,
  workspaceResult,
  profileResult
}: {
  view: ChildWorkspaceOverviewViewModel
  workspaceResult?: OsApiResult<unknown>
  profileResult?: OsApiResult<unknown>
}) {
  const childName = view.child.preferredName || view.child.displayName
  const childId = view.child.id

  return (
    <div data-testid="child-workspace-overview-page" className="mobile-child-workspace space-y-5 md:space-y-6">
      {workspaceResult ? <LiveDataStatus result={workspaceResult as OsApiResult<Record<string, unknown>>} /> : null}
      {profileResult && profileResult !== workspaceResult ? (
        <LiveDataStatus result={profileResult as OsApiResult<Record<string, unknown>>} />
      ) : null}

      <div className="flex flex-wrap items-center gap-2 xl:hidden" data-testid="child-workspace-mobile-ask-orb">
        <OperationalOrbRail
          scopeType="child"
          childId={childId}
          childName={childName}
          homeName={view.child.homeName}
          compact
          testId="child-workspace-mobile-orb-button"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5 md:space-y-6">
          <ChildProfileHero view={view} />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChildAboutCard view={view} />
            <ChildWhatMattersCard view={view} />
            <ChildSupportCard view={view} />
            <ChildTodayCard view={view} />
            <ChildRiskSafeguardingCard view={view} />
            <ChildPlansDocumentsCard view={view} />
            <ChildVoiceCard view={view} />
            <ChildActionsReviewCard view={view} />
            <ChildLifecycleCard view={view} />
          </section>

          <Card>
            <SectionHeader
              eyebrow="Quick actions"
              title="Record and navigate"
              description="Child-scoped routes for recording, chronology, actions and documents."
            />
            <div className="flex flex-wrap gap-2">
              {view.quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  prefetch={false}
                  data-testid={action.testId}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800 transition hover:border-sky-200 hover:bg-sky-50"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card data-testid="child-workspace-evidence-link">
            <SectionHeader
              eyebrow="Advanced"
              title="Evidence and workflow"
              description="Lifecycle, linked evidence and technical workflow tools — for when you need traceability."
            />
            <div className="flex flex-wrap gap-2">
              {view.evidenceActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  prefetch={false}
                  data-testid={action.testId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
                >
                  {action.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={view.routes.journey} prefetch={false} className="text-sm font-black text-sky-700">
                Advanced / evidence view →
              </Link>
              <Link href={`/young-people/${encodeURIComponent(view.child.id)}`} prefetch={false} className="text-sm font-black text-slate-600">
                Full care profile →
              </Link>
            </div>
          </Card>
        </div>

        <div className="hidden xl:block">
          <ChildWorkspaceOrbRail view={view} />
        </div>
      </div>
    </div>
  )
}
