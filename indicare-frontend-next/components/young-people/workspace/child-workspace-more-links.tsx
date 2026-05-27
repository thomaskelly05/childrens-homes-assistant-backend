import { MobileSafeLink } from '@/components/indicare/mobile/mobile-safe-link'
import type { ChildWorkspaceQuickAction } from '@/lib/young-people/child-workspace-normaliser'

export function ChildWorkspaceMoreLinks({ actions }: { actions: ChildWorkspaceQuickAction[] }) {
  if (!actions.length) return null

  return (
    <div className="flex flex-wrap gap-2" data-testid="child-workspace-more-links">
      {actions.map((action) => (
        <MobileSafeLink
          key={action.href}
          href={action.href}
          prefetch={false}
          data-testid={action.testId}
          tapDebugLabel={`child-more-${action.label}`}
          className="min-h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
        >
          {action.label}
        </MobileSafeLink>
      ))}
    </div>
  )
}
