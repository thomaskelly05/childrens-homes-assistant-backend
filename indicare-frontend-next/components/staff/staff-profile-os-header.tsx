'use client'

import type { StaffProfileOsOverview } from '@/lib/os-api/staff-profile-os'

export function StaffProfileOsHeader({ overview }: { overview: StaffProfileOsOverview }) {
  return (
    <header
      data-testid="staff-profile-os-header"
      className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-white p-6 shadow-sm"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-800">Adult working-life profile</p>
      <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">{overview.staff_name}</h1>
      <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
        {overview.role ? <span>Role: {overview.role}</span> : null}
        {overview.home_name || overview.home_id ? (
          <span>Home: {overview.home_name || overview.home_id}</span>
        ) : null}
        {overview.employment_status ? <span>Status: {overview.employment_status}</span> : null}
        {overview.shift_label ? (
          <span>
            Shift: {overview.shift_label}
            {overview.shift_role ? ` (${overview.shift_role})` : ''}
          </span>
        ) : null}
      </div>
      {overview.badges.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {overview.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-900"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  )
}
