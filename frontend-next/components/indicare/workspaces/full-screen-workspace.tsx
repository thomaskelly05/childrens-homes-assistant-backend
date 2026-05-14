import type { ReactNode } from 'react'

import { WorkspaceCloseButton } from '@/components/indicare/workspaces/workspace-close-button'

export function FullScreenWorkspace({
  title,
  eyebrow,
  description,
  backHref,
  children,
  sidePanel
}: {
  title: string
  eyebrow: string
  description?: string
  backHref: string
  children: ReactNode
  sidePanel?: ReactNode
}) {
  return (
    <main className="min-h-screen bg-[#eef4fb] p-3 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.10)] md:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-[28px] bg-slate-950 p-6 text-white">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] md:text-5xl">{title}</h1>
            {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{description}</p> : null}
          </div>
          <WorkspaceCloseButton href={backHref} />
        </div>
        <div className={sidePanel ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]' : ''}>
          <div>{children}</div>
          {sidePanel ? <aside className="space-y-4">{sidePanel}</aside> : null}
        </div>
      </div>
    </main>
  )
}

