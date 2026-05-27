'use client'

import Link from 'next/link'

import type { StaffProfileOsSection } from '@/lib/os-api/staff-profile-os'

import { StaffProfileOsCard } from './staff-profile-os-card'

export function StaffProfileOsSectionBlock({ section }: { section: StaffProfileOsSection }) {
  return (
    <section
      data-testid={`staff-profile-os-section-${section.section_type}`}
      className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">{section.title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{section.summary}</p>
        </div>
        {section.route ? (
          <Link
            href={section.route}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-800"
          >
            {section.action_label || 'Open area'}
          </Link>
        ) : null}
      </div>
      {section.warnings?.length ? (
        <ul className="mt-3 space-y-1 text-xs font-semibold text-amber-900">
          {section.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {section.items.map((item) => (
          <StaffProfileOsCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
