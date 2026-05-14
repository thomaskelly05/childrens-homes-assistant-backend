import { CheckCircle2, CloudOff, RefreshCw, ShieldCheck } from 'lucide-react'

import type { WorkflowReliabilitySnapshot } from '@/lib/workflows/reliability'

const toneClasses: Record<WorkflowReliabilitySnapshot['state'], string> = {
  not_saved: 'bg-slate-50 text-slate-600 ring-slate-200',
  draft: 'bg-blue-50 text-blue-700 ring-blue-100',
  saving: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  saved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  review: 'bg-amber-50 text-amber-800 ring-amber-100',
  offline_draft: 'bg-slate-50 text-slate-700 ring-slate-200',
  retry_needed: 'bg-rose-50 text-rose-700 ring-rose-100',
  stale_session: 'bg-amber-50 text-amber-800 ring-amber-100'
}

export function WorkflowSaveIndicator({ snapshot, compact = false }: { snapshot: WorkflowReliabilitySnapshot; compact?: boolean }) {
  const Icon = snapshot.state === 'saved' ? CheckCircle2 : snapshot.state === 'offline_draft' ? CloudOff : snapshot.retryable ? RefreshCw : ShieldCheck
  return (
    <div className={`inline-flex items-start gap-3 rounded-full px-4 py-2 text-sm ring-1 ${toneClasses[snapshot.state]}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${snapshot.state === 'saving' ? 'motion-safe:animate-spin' : ''}`} aria-hidden />
      <span>
        <span className="block font-black">{snapshot.label}</span>
        {!compact ? <span className="block text-xs leading-5 opacity-80">{snapshot.message}</span> : null}
      </span>
    </div>
  )
}
