import Link from 'next/link'

import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

const ORB_PROMPTS = [
  'What should I check before recording?',
  'Help me write a daily note',
  'What needs manager review?',
  'What might help feel safer today?',
  'What evidence is missing from this child’s record?'
]

export function ChildWorkspaceOrbRail({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const name = view.child.preferredName || view.child.displayName

  return (
    <aside
      className="rounded-[28px] border border-indigo-100/80 bg-gradient-to-b from-indigo-50/90 to-white p-5 shadow-lg shadow-indigo-100/40"
      data-testid="child-workspace-orb-rail"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">ORB</p>
      <h2 className="mt-2 text-lg font-black text-slate-950">Connected to {name}&apos;s workspace</h2>
      <dl className="mt-4 space-y-2 text-sm text-slate-600">
        <div>
          <dt className="font-bold text-slate-800">Active workspace</dt>
          <dd>Young person</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-800">Child / home</dt>
          <dd>
            {name}
            {view.child.homeName && view.child.homeName !== 'Not recorded yet' ? ` · ${view.child.homeName}` : ''}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-800">Privacy</dt>
          <dd>Summary-level child context only</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-6 text-slate-500">Try asking:</p>
      <ul className="mt-2 space-y-2">
        {ORB_PROMPTS.map((prompt) => (
          <li key={prompt} className="rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-indigo-100">
            {prompt.replace('feel safer', `help ${name} feel safer`)}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-2">
        <Link
          href={view.routes.orbRecordQuality}
          prefetch={false}
          data-testid="child-orb-record-quality"
          className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-black text-white"
        >
          Ask ORB
        </Link>
        <Link href={view.routes.orbSafeguardingThemes} prefetch={false} className="text-center text-xs font-bold text-indigo-700">
          Safeguarding themes
        </Link>
        <Link href={view.routes.orbChildJourney} prefetch={false} className="text-center text-xs font-bold text-indigo-700">
          Child journey summary
        </Link>
        <Link href={view.routes.orbOfstedEvidence} prefetch={false} className="text-center text-xs font-bold text-indigo-700">
          Ofsted evidence review
        </Link>
      </div>
    </aside>
  )
}
