import type { ReactNode } from 'react'

export function LabSectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
  id,
  className = ''
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <section
      id={id}
      className={`founder-surface rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">{eyebrow}</p>
          ) : null}
          <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
