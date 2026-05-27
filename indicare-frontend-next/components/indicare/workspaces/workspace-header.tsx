import { LifecycleStatusBadge } from '@/components/indicare/lifecycle/lifecycle-status-badge'

export function WorkspaceHeader({ title, status, context }: { title: string; status: string; context?: string }) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-5">
      <LifecycleStatusBadge status={status} />
      <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
      {context ? <p className="mt-2 text-sm leading-6 text-slate-500">{context}</p> : null}
    </div>
  )
}

