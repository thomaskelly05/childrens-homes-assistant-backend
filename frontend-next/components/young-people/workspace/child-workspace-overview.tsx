import Link from 'next/link'

import { MobileSafeLink } from '@/components/indicare/mobile/mobile-safe-link'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, SectionHeader } from '@/components/indicare/ui'
import type { OsApiResult } from '@/lib/os-api/types'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

import { ChildAboutCard } from './child-about-card'
import { ChildActionsReviewCard } from './child-actions-review-card'
import { ChildPlansDocumentsCard } from './child-plans-documents-card'
import { ChildProfileHero } from './child-profile-hero'
import { ChildRecordingSelectorCard } from './child-recording-selector-card'
import { ChildRiskSafeguardingCard } from './child-risk-safeguarding-card'
import { ChildSupportCard } from './child-support-card'
import { ChildTodayCard } from './child-today-card'
import { ChildVoiceCard } from './child-voice-card'
import { ChildWhatMattersCard } from './child-what-matters-card'
import { ChildLifecycleCard } from './child-lifecycle-card'
import { ChildWorkspaceMoreLinks } from './child-workspace-more-links'
import { ChildWorkspaceOrbRail } from './child-workspace-orb-rail'
import { WorkspaceSectionAccordion } from './workspace-section-accordion'

export function ChildWorkspaceOverview({
  view,
  workspaceResult,
  profileResult
}: {
  view: ChildWorkspaceOverviewViewModel
  workspaceResult?: OsApiResult<unknown>
  profileResult?: OsApiResult<unknown>
}) {
  const childId = view.child.id

  return (
    <div data-testid="child-workspace-overview-page" className="mobile-child-workspace space-y-5 md:space-y-6">
      {workspaceResult ? <LiveDataStatus result={workspaceResult as OsApiResult<Record<string, unknown>>} /> : null}
      {profileResult && profileResult !== workspaceResult ? (
        <LiveDataStatus result={profileResult as OsApiResult<Record<string, unknown>>} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5 md:space-y-6">
          <ChildProfileHero view={view} />

          <WorkspaceSectionAccordion
            testId="child-workspace-section-understand"
            eyebrow="Understand"
            title="Understand this child"
            description="What matters, communication, strengths, routines, triggers and how best to support."
            defaultOpen
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ChildWhatMattersCard view={view} />
              <ChildSupportCard view={view} />
              <ChildAboutCard view={view} />
            </div>
          </WorkspaceSectionAccordion>

          <WorkspaceSectionAccordion
            testId="child-workspace-section-today"
            eyebrow="Today"
            title="Today’s priorities"
            description="Records awaiting completion or sign-off, alerts, handover hints and actions due."
            defaultOpen
          >
            <ChildTodayCard view={view} />
          </WorkspaceSectionAccordion>

          <section data-testid="child-workspace-section-record-once" aria-labelledby="child-record-once-heading">
            <p id="child-record-once-heading" className="sr-only">
              Record once
            </p>
            <ChildRecordingSelectorCard childId={childId} />
          </section>

          <WorkspaceSectionAccordion
            testId="child-workspace-section-story"
            eyebrow="Story"
            title="Child’s story"
            description="Chronology, archive, LifeEcho, child voice and documents."
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ChildVoiceCard view={view} />
              <ChildLifecycleCard view={view} />
              <ChildPlansDocumentsCard view={view} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {view.storyActions.map((action) => (
                <MobileSafeLink
                  key={action.href}
                  href={action.href}
                  prefetch={false}
                  data-testid={action.testId}
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800"
                >
                  {action.label}
                </MobileSafeLink>
              ))}
            </div>
          </WorkspaceSectionAccordion>

          <WorkspaceSectionAccordion
            testId="child-workspace-section-plans"
            eyebrow="Plans"
            title="Plans and impact"
            description="Care plan, risk, health, education, family time and plan impact suggestions."
            defaultOpen={false}
          >
            <ChildPlansDocumentsCard view={view} />
            <div className="mt-4 flex flex-wrap gap-2">
              {view.planActions.map((action) => (
                <MobileSafeLink
                  key={action.href}
                  href={action.href}
                  prefetch={false}
                  data-testid={action.testId}
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800"
                >
                  {action.label}
                </MobileSafeLink>
              ))}
            </div>
          </WorkspaceSectionAccordion>

          <WorkspaceSectionAccordion
            testId="child-workspace-section-oversight"
            eyebrow="Oversight"
            title="Oversight"
            description="Reviews, alerts, safeguarding and manager actions."
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ChildRiskSafeguardingCard view={view} />
              <ChildActionsReviewCard view={view} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {view.oversightActions.map((action) => (
                <MobileSafeLink
                  key={action.href}
                  href={action.href}
                  prefetch={false}
                  data-testid={action.testId}
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800"
                >
                  {action.label}
                </MobileSafeLink>
              ))}
            </div>
          </WorkspaceSectionAccordion>

          <Card id="more" data-testid="child-workspace-more-menu">
            <SectionHeader
              eyebrow="More"
              title="All child workflows"
              description="Everything remains reachable — secondary routes are grouped here."
            />
            <ChildWorkspaceMoreLinks actions={view.moreActions} />
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={view.routes.journey} prefetch={false} className="text-sm font-black text-sky-700">
                Advanced / evidence view →
              </Link>
              <Link href={`/young-people/${encodeURIComponent(view.child.id)}`} prefetch={false} className="text-sm font-black text-slate-600">
                Full care profile →
              </Link>
            </div>
          </Card>

          <Card data-testid="child-workspace-evidence-link">
            <SectionHeader
              eyebrow="Advanced"
              title="Evidence and workflow"
              description="Lifecycle, linked evidence and technical workflow tools."
            />
            <ChildWorkspaceMoreLinks actions={view.evidenceActions} />
          </Card>
        </div>

        <div className="hidden xl:block">
          <ChildWorkspaceOrbRail view={view} />
        </div>
      </div>
    </div>
  )
}
