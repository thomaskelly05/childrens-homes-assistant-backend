import Link from 'next/link'

import { ScopeOrbLauncher } from '@/components/orb-operational/scope-orb-launcher'
import { childOrbHref } from '@/lib/navigation/scope-routes'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

const ORB_PROMPTS = [
  'What should I check before recording?',
  'Summarise this child’s archive themes',
  'Help review this child’s chronology story',
  'What plan impact suggestions need review?',
  'What LifeEcho memories could be added safely?'
]

export function ChildWorkspaceOrbRail({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const name = view.child.preferredName || view.child.displayName
  const childId = view.child.id

  return (
    <div className="space-y-4" data-testid="child-workspace-orb-rail">
      <ScopeOrbLauncher
        workspace="child"
        childId={childId}
        childDisplayName={name}
        homeName={view.child.homeName}
        testId="child-workspace-scope-orb"
      />
      <aside className="rounded-[28px] border border-indigo-100/60 bg-white/80 p-4">
        <p className="text-xs leading-6 text-slate-500">Try asking:</p>
        <ul className="mt-2 space-y-2">
          {ORB_PROMPTS.map((prompt) => (
            <li
              key={prompt}
              className="rounded-xl bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-indigo-100"
            >
              {prompt.replace('feel safer', `help ${name} feel safer`)}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={view.routes.orb}
            prefetch={false}
            data-testid="child-orb-record-quality"
            className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-black text-white"
          >
            Ask ORB
          </Link>
          <Link
            href={childOrbHref(childId, 'safeguarding_themes')}
            prefetch={false}
            className="text-center text-xs font-bold text-indigo-700"
          >
            Safeguarding themes
          </Link>
          <Link
            href={childOrbHref(childId, 'child_journey_summary')}
            prefetch={false}
            className="text-center text-xs font-bold text-indigo-700"
          >
            Child journey summary
          </Link>
          <Link
            href={childOrbHref(childId, 'ofsted_evidence_review')}
            prefetch={false}
            className="text-center text-xs font-bold text-indigo-700"
          >
            Ofsted evidence review
          </Link>
          <Link
            href={childOrbHref(childId, 'archive_summary')}
            prefetch={false}
            data-testid="child-orb-archive-summary"
            className="text-center text-xs font-bold text-indigo-700"
          >
            Archive themes
          </Link>
          <Link
            href={childOrbHref(childId, 'chronology_story_review')}
            prefetch={false}
            data-testid="child-orb-chronology-story"
            className="text-center text-xs font-bold text-indigo-700"
          >
            Chronology story
          </Link>
          <Link
            href={childOrbHref(childId, 'plan_impact_review')}
            prefetch={false}
            data-testid="child-orb-plan-impact-review"
            className="text-center text-xs font-bold text-indigo-700"
          >
            Plan impacts
          </Link>
          <Link
            href={childOrbHref(childId, 'lifeecho_memory_support')}
            prefetch={false}
            data-testid="child-orb-lifeecho-support"
            className="text-center text-xs font-bold text-indigo-700"
          >
            LifeEcho support
          </Link>
        </div>
      </aside>
    </div>
  )
}
