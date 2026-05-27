'use client'

import type { RecordingGovernanceBacklogMetric } from '@/lib/os-api/recording-governance'

export function RecordingGovernanceBacklog({ backlog }: { backlog: RecordingGovernanceBacklogMetric }) {
  const priorities = [
    { key: 'urgent', label: 'Urgent' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' }
  ]

  return (
    <section data-testid="recording-governance-backlog" id="backlog" className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-950">Review backlog</h2>
        <p className="text-sm font-semibold text-slate-600">Queue by priority and review state — metadata only.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Awaiting review" value={backlog.awaiting_review} />
        <Metric label="Changes requested" value={backlog.changes_requested} />
        <Metric label="Approved awaiting submission" value={backlog.approved} />
        <Metric label="Overdue" value={backlog.overdue} tone="rose" />
      </div>
      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">By priority</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {priorities.map((p) => (
            <div key={p.key} className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-500">{p.label}</p>
              <p className="text-xl font-black text-slate-950">{backlog.by_priority[p.key] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Safeguarding review" value={backlog.safeguarding_review} />
        <Metric label="Submitted" value={backlog.submitted} />
        <Metric label="Urgent count" value={backlog.urgent} tone="purple" />
      </div>
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${tone === 'rose' ? 'border-rose-100 bg-rose-50/70' : tone === 'purple' ? 'border-purple-100 bg-purple-50/70' : 'border-slate-100 bg-white'}`}
    >
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}
