'use client'

import type { RecordingGovernanceQualityMetric } from '@/lib/os-api/recording-governance'

export function RecordingGovernanceQuality({ quality }: { quality: RecordingGovernanceQualityMetric }) {
  const rows = [
    { label: 'Incomplete structured forms', value: quality.incomplete_structured_forms, id: 'structured' },
    { label: 'Missing child voice', value: quality.missing_child_voice },
    { label: 'Missing follow-up', value: quality.missing_follow_up },
    { label: 'Judgemental language flags', value: quality.judgemental_language_flags },
    { label: 'Privacy identifiers / flags', value: quality.privacy_flags },
    { label: 'Manager review flags', value: quality.manager_review_flags },
    { label: 'Safeguarding review flags', value: quality.safeguarding_review_flags }
  ]

  return (
    <section data-testid="recording-governance-quality" id="quality" className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-950">Quality and privacy flags</h2>
        <p className="text-sm font-semibold text-slate-600">
          Structured completion gaps, language and privacy markers — no raw record bodies.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            id={row.id}
            data-testid={row.id ? `recording-governance-${row.id}` : undefined}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3"
          >
            <span className="text-sm font-semibold text-slate-700">{row.label}</span>
            <span className="text-lg font-black text-slate-950">{row.value}</span>
          </div>
        ))}
      </div>
      <section id="structured" data-testid="recording-governance-structured-gaps" className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
        <p className="text-sm font-black text-amber-950">Structured completion gaps</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-amber-900/90">
          {quality.incomplete_structured_forms} draft(s) have required structured fields missing. Open the draft to
          complete high-risk templates — summary cards do not show field values.
        </p>
      </section>
    </section>
  )
}
