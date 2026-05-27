import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { ChronologyRecord } from '@/lib/api'

function statusIcon(record: ChronologyRecord) {
  if (record.safeguarding_relevant) {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />
  }

  if (record.manager_review_required) {
    return <Clock3 className="h-4 w-4 text-blue-500" />
  }

  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
}

export function ChronologyWorkspace({ records }: { records: ChronologyRecord[] }) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Live shift
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
            Chronology
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">
            + Record
          </button>

          <button className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
            Handover
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {records.map((record, index) => (
          <article
            key={`${record.id || index}-${record.title || 'record'}`}
            className="rounded-[28px] border border-slate-100 bg-slate-50/70 p-7 transition hover:-translate-y-[1px] hover:shadow-xl hover:shadow-slate-200/50"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-full bg-blue-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                {record.record_type || record.source_type || 'Record'}
              </span>

              <span className="text-xs font-bold text-slate-400">
                {record.occurred_at || record.created_at || 'Recorded'}
              </span>

              <div className="ml-auto flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
                {statusIcon(record)}
                {record.status || 'Active'}
              </div>
            </div>

            <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
              {record.title || 'Operational record'}
            </h3>

            <p className="mt-4 text-[15px] leading-8 text-slate-600">
              {record.summary || record.narrative || record.child_voice || 'No chronology narrative supplied.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                record.priority,
                record.risk_level,
                record.manager_review_required ? 'Manager review' : null,
                record.safeguarding_relevant ? 'Safeguarding' : null,
                record.inspection_relevant ? 'Inspection' : null
              ]
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={String(tag)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
