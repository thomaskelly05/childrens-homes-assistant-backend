export function CalmEmptyState({
  title,
  description,
  action
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[30px] bg-gradient-to-br from-white via-slate-50 to-blue-50/70 p-8 text-center shadow-[0_18px_48px_rgba(15,23,42,0.06)] ring-1 ring-white/80">
      <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
