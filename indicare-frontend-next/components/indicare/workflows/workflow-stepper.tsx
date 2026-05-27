import Link from 'next/link'

type WorkflowStep = {
  title: string
  status: 'complete' | 'current' | 'pending' | 'review'
  href?: string
  detail?: string
}

const statusClasses: Record<WorkflowStep['status'], string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  current: 'border-blue-200 bg-blue-50 text-blue-800',
  pending: 'border-slate-200 bg-slate-50 text-slate-600',
  review: 'border-amber-200 bg-amber-50 text-amber-800'
}

export function WorkflowStepper({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => {
        const content = (
          <li className={`h-full rounded-[22px] border p-4 ${statusClasses[step.status]}`}>
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">Step {index + 1} · {step.status}</span>
            <h3 className="mt-2 text-sm font-black">{step.title}</h3>
            {step.detail ? <p className="mt-2 text-xs font-bold leading-5 opacity-80">{step.detail}</p> : null}
          </li>
        )

        return step.href ? <Link key={step.title} href={step.href}>{content}</Link> : <div key={step.title}>{content}</div>
      })}
    </ol>
  )
}
