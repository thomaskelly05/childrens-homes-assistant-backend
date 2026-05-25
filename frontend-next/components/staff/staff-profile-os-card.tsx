'use client'

import Link from 'next/link'

import type { StaffProfileOsItem } from '@/lib/os-api/staff-profile-os'

export function StaffProfileOsCard({ item }: { item: StaffProfileOsItem }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
        {item.priority ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
            {item.priority}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.safe_summary}</p>
      {item.route ? (
        <Link
          href={item.route}
          className="mt-3 inline-flex text-xs font-black text-blue-700 hover:text-blue-900"
        >
          {item.action_label || 'Open'}
        </Link>
      ) : null}
    </article>
  )
}
