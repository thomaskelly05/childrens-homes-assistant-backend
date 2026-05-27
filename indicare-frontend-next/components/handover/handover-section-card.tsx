'use client'

import Link from 'next/link'

import type { HandoverIntelligenceSection } from '@/lib/os-api/handover-intelligence'

export function HandoverSectionCard({ section }: { section: HandoverIntelligenceSection }) {
  return (
    <article
      data-testid={`handover-section-${section.id}`}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-950">{section.title}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{section.summary}</p>
        </div>
        {section.action_label ? (
          <Link
            href={section.route}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700"
          >
            {section.action_label}
          </Link>
        ) : null}
      </div>
      {section.warnings?.length ? (
        <ul className="mt-3 space-y-1 text-xs font-semibold text-amber-800">
          {section.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {section.items.length ? (
        <ul className="mt-3 space-y-2">
          {section.items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-50 bg-slate-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-xs font-black text-slate-900">{item.title}</strong>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                  {item.priority}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600" data-testid="handover-safe-summary">
                {item.safe_summary}
              </p>
              {item.action_label ? (
                <Link href={item.route} className="mt-2 inline-block text-[10px] font-black text-blue-700 underline">
                  {item.action_label}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs font-semibold text-slate-500">No items in this section for current scope.</p>
      )}
    </article>
  )
}
