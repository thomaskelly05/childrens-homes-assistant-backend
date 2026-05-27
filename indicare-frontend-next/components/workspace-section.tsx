import { ReactNode } from 'react'

export function WorkspaceSection({
  eyebrow,
  title,
  children
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
          {title}
        </h2>
      </div>

      {children}
    </section>
  )
}
