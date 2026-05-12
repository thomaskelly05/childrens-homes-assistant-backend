import { ChronologyRecord } from '@/lib/api'

function label(record: ChronologyRecord) {
  return record.record_type || record.source_type || 'Care record'
}

function narrative(record: ChronologyRecord) {
  return record.summary || record.narrative || record.child_voice || 'No narrative supplied yet.'
}

export function CareOperatingStream({ records }: { records: ChronologyRecord[] }) {
  const source = records.length ? records : [
    {
      id: 'demo-1',
      record_type: 'Daily record',
      title: 'Evening support and emotional regulation',
      summary: 'Young person accepted staff reassurance, completed the evening routine and remained settled. No escalation indicators were identified.',
      status: 'Recorded',
      inspection_relevant: true
    },
    {
      id: 'demo-2',
      record_type: 'Assistant insight',
      title: 'Positive routine pattern strengthening',
      summary: 'Engagement appears stronger when the evening routine is structured and emotionally prepared in advance.',
      status: 'Insight',
      manager_review_required: true
    }
  ]

  return (
    <section className="rounded-[34px] border border-white/70 bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
            Live journey
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] text-slate-950">
            Care operating stream
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            One continuous care timeline bringing together daily records, incidents, health, education, direct work, assistant insights and oversight.
          </p>
        </div>

        <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">
          + New record
        </button>
      </div>

      <div className="relative space-y-5 before:absolute before:left-5 before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-slate-200">
        {source.slice(0, 14).map((record, index) => (
          <article key={`${record.id || index}`} className="relative pl-12">
            <div className="absolute left-0 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-black text-blue-700 shadow-sm">
              {index + 1}
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-6 shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-blue-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                  {label(record)}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {record.occurred_at || record.created_at || 'Current shift'}
                </span>
                <span className="ml-auto rounded-full bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                  {record.status || 'Active'}
                </span>
              </div>

              <h3 className="text-2xl font-black tracking-[-0.045em] text-slate-950">
                {record.title || 'Care journey event'}
              </h3>

              <p className="mt-4 text-[15px] leading-8 text-slate-600">
                {narrative(record)}
              </p>

              {(record.safeguarding_relevant || record.manager_review_required || record.inspection_relevant) ? (
                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                    Intelligence layer
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    This entry has operational relevance and should remain visible in handover, review and evidence continuity.
                  </p>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
