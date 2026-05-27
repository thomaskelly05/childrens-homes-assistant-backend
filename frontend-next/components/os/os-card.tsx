import type { ReactNode } from 'react'

export function OsCard({ children, className = '', testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <article
      data-testid={testId}
      className={`rounded-[24px] border border-white/80 bg-white/95 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] ring-1 ring-slate-100/80 ${className}`}
    >
      {children}
    </article>
  )
}
