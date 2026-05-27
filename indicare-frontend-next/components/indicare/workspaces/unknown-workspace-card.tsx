'use client'

export function UnknownWorkspaceCard({ cardType }: { cardType: string }) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.warn('missing_workspace_component_type', cardType)
  }

  return (
    <article
      data-testid="unknown-workspace-card"
      data-workspace-card-type={cardType}
      className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Workspace section</p>
      <p className="mt-1 text-sm font-black text-slate-800">{cardType || 'unknown'}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
        This workspace section is not available in the current build. Other areas remain safe to use.
      </p>
    </article>
  )
}
