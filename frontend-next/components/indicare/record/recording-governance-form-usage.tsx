'use client'

import type { RecordingGovernanceFormUsage } from '@/lib/os-api/recording-governance'

export function RecordingGovernanceFormUsageTable({ items }: { items: RecordingGovernanceFormUsage[] }) {
  if (!items.length) {
    return (
      <p className="text-sm font-semibold text-slate-600" data-testid="recording-governance-form-usage-empty">
        No form usage in this scope yet.
      </p>
    )
  }

  return (
    <div data-testid="recording-governance-form-usage" className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Form / type</th>
            <th className="px-4 py-3">Count</th>
            <th className="px-4 py-3">High risk</th>
            <th className="px-4 py-3">Review req.</th>
            <th className="px-4 py-3">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={`${row.form_id || row.recording_type}`} className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold text-slate-800">
                {row.title || row.recording_type}
                {row.category ? (
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">{row.category}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 font-black">{row.count}</td>
              <td className="px-4 py-3">{row.high_risk_count}</td>
              <td className="px-4 py-3">{row.review_required_count}</td>
              <td className="px-4 py-3">{row.submitted_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
