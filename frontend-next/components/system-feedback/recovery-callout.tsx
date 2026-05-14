import { RefreshCw } from 'lucide-react'

export function RecoveryCallout({
  title = 'Recovery ready',
  message,
  action
}: {
  title?: string
  message: string
  action?: React.ReactNode
}) {
  return (
    <section className="rounded-[28px] bg-white/85 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/70 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
            <RefreshCw className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{message}</p>
          </div>
        </div>
        {action}
      </div>
    </section>
  )
}
