'use client'

export function StaffProfileOsSafetyNote({ notice }: { notice: string }) {
  return (
    <p
      data-testid="staff-profile-os-safety-note"
      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-600"
    >
      {notice ||
        'This profile uses safe operational summaries. Confidential HR, supervision and wellbeing details remain in permissioned areas.'}
    </p>
  )
}
