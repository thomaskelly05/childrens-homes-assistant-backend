'use client'

import type { InspectionPackType } from '@/lib/os-api/inspection-readiness'

const PACK_OPTIONS: { id: InspectionPackType; label: string; hint: string }[] = [
  { id: 'reg44', label: 'Reg 44', hint: 'Monthly visit evidence support' },
  { id: 'reg45', label: 'Reg 45', hint: 'Quality of care review evidence support' },
  { id: 'sccif', label: 'SCCIF', hint: 'Judgement area evidence support' },
  { id: 'quality_standards', label: 'Quality Standards', hint: 'Standards evidence support' }
]

type Props = {
  selected: InspectionPackType
  onSelect: (type: InspectionPackType) => void
  periodStart: string
  periodEnd: string
  onPeriodStart: (v: string) => void
  onPeriodEnd: (v: string) => void
}

export function InspectionPackSelector({
  selected,
  onSelect,
  periodStart,
  periodEnd,
  onPeriodStart,
  onPeriodEnd
}: Props) {
  return (
    <div data-testid="inspection-pack-selector" className="space-y-4 rounded-[28px] border border-slate-100 bg-white p-6">
      <div className="flex flex-wrap gap-2">
        {PACK_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            data-testid={`inspection-pack-type-${opt.id}`}
            onClick={() => onSelect(opt.id)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              selected === opt.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
            }`}
          >
            <span className="block text-sm font-black text-slate-950">{opt.label}</span>
            <span className="mt-1 block text-[10px] font-semibold text-slate-500">{opt.hint}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-black uppercase text-slate-400">
          Period start
          <input
            type="date"
            value={periodStart}
            onChange={(e) => onPeriodStart(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-black uppercase text-slate-400">
          Period end
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => onPeriodEnd(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  )
}
