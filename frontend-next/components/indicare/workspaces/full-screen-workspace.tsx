import Link from 'next/link'
import type { ReactNode } from 'react'

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
    <main className="min-h-[calc(100vh-48px)] rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.10)] md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-[28px] bg-slate-950 p-6 text-white">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] md:text-5xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{description}</p> : null}
        </div>
        <Link href={backHref} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Close workspace</Link>
      </div>
      <div className={sidePanel ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]' : ''}>
        <div>{children}</div>
        {sidePanel ? <aside className="space-y-4">{sidePanel}</aside> : null}
      </div>
    </main>
  )
}

