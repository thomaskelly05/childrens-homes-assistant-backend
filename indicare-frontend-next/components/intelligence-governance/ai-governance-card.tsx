import type { ReactNode } from 'react'

export function AiGovernanceCard({
  title,
  value,
  detail,
  testId,
  children
}: {
  title: string
  value: string | number
  detail?: string
  testId?: string
  children?: ReactNode
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-sm font-medium text-slate-600">{detail}</p> : null}
      {children}
    </div>
  )
}
