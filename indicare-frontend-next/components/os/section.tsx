import type { ReactNode } from 'react'

export function Section({
  eyebrow,
  title,
  description,
  children,
  className = '',
  testId
}: {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <section data-testid={testId} className={`space-y-4 ${className}`}>
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 md:text-2xl">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
