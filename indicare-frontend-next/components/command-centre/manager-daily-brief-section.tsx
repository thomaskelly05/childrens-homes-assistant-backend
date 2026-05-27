'use client'

import Link from 'next/link'

import type { ManagerDailyBriefSection } from '@/lib/os-api/manager-daily-brief'

const toneRing: Record<string, string> = {
  urgent: 'border-red-200 bg-red-50/50',
  attention: 'border-amber-200 bg-amber-50/50',
  positive: 'border-emerald-200 bg-emerald-50/50',
  neutral: 'border-slate-100 bg-slate-50/50'
}

export function ManagerDailyBriefSectionCard({ section }: { section: ManagerDailyBriefSection }) {
  return (
    <section
      data-testid={`manager-daily-brief-section-${section.id}`}
      className={`rounded-[24px] border p-5 ${toneRing[section.tone] || toneRing.neutral}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{section.title}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{section.summary}</p>
        </div>
        {section.action_label ? (
          <Link
            href={section.route}
            className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-blue-800 shadow-sm ring-1 ring-blue-100"
          >
            {section.action_label}
          </Link>
        ) : null}
      </div>
      {section.items.length ? (
        <ul className="mt-4 space-y-2">
          {section.items.map((item) => (
            <li key={item.id}>
              <Link href={item.route} className="block rounded-2xl border border-white/80 bg-white px-3 py-3 shadow-sm">
                <p className="text-sm font-black text-slate-950">{item.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600" data-testid="manager-daily-brief-safe-summary">
                  {item.safe_summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
