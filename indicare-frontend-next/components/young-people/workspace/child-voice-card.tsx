import { Card, SectionHeader } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

import { ChildWorkspaceEmptyState } from './child-workspace-empty-state'

export function ChildVoiceCard({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const name = view.child.preferredName || view.child.displayName

  return (
    <Card data-testid="child-voice-card">
      <SectionHeader eyebrow="Voice" title="Child voice" description={`Wishes, feelings and direct words linked to ${name}'s record.`} />
      {view.childVoice.length ? (
        <ul className="space-y-3">
          {view.childVoice.map((item) => (
            <li key={item.id} className="rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-violet-600">{item.label}</p>
              <p className="mt-2 text-sm leading-7 text-slate-800 italic">&ldquo;{item.excerpt}&rdquo;</p>
              {item.when ? <p className="mt-1 text-xs text-slate-500">{item.when}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <ChildWorkspaceEmptyState message={view.emptyStates.childVoice} />
      )}
    </Card>
  )
}
