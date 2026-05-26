import Link from 'next/link'

import { RiskBadge, StatusBadge } from '@/components/indicare/ui'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  ''
).replace(/\/+$/, '')

function photoUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path
  if (path.startsWith('/') && API_BASE) return `${API_BASE}${path}`
  return path
}

export function ChildProfileHero({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const { child } = view
  const photo = photoUrl(child.profilePhotoPath)
  const initials = (child.preferredName || child.displayName).slice(0, 2).toUpperCase()

  return (
    <header
      className="child-workspace-hero-mobile-compact rounded-[28px] border border-white/80 bg-gradient-to-br from-sky-50 via-white to-violet-50/40 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:rounded-[36px] md:p-8 md:shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
      data-testid="child-workspace-hero"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-700">Child workspace overview</p>
      <div className="mt-4 flex items-start gap-4 md:mt-5 md:gap-6">
        {photo ? (
          <div
            className="h-16 w-16 shrink-0 rounded-2xl bg-cover bg-center shadow-md shadow-sky-200/40 ring-2 ring-white md:h-28 md:w-28 md:rounded-[32px] md:ring-4"
            style={{ backgroundImage: `url(${photo})` }}
            role="img"
            aria-label={`Photo of ${child.displayName}`}
            data-testid="child-workspace-hero-avatar"
          />
        ) : (
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-xl font-black text-white shadow-md md:h-28 md:w-28 md:rounded-[32px] md:text-3xl"
            data-testid="child-workspace-hero-avatar"
          >
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">{child.displayName}</h1>
          {child.preferredName && child.preferredName !== child.displayName ? (
            <p className="mt-1 text-sm text-slate-600 md:mt-2 md:text-base">
              Known as <span className="font-bold text-slate-800">{child.preferredName}</span>
            </p>
          ) : null}
          <p className="mt-2 hidden max-w-2xl text-sm leading-7 text-slate-600 md:block">
            Get to know {child.preferredName || child.displayName} before recording — one child, one home, child-centred care.
          </p>
          <div className="mt-3 flex flex-wrap gap-2" data-testid="child-workspace-hero-badges">
            {child.age && child.age !== 'Not recorded yet' ? <StatusBadge value={`Age ${child.age}`} /> : null}
            {child.placementStatus && child.placementStatus !== 'Not recorded yet' ? (
              <StatusBadge value={child.placementStatus} />
            ) : null}
            {child.homeName && child.homeName !== 'Not recorded yet' ? <StatusBadge value={child.homeName} /> : null}
            <RiskBadge value={(child.riskLevel as 'low' | 'medium' | 'high') || 'medium'} />
          </div>
        </div>
      </div>
      <div
        className="child-workspace-hero-actions mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2 md:mt-6 md:flex md:flex-wrap"
        data-testid="child-workspace-hero-actions"
      >
        {view.quickActions.slice(0, 4).map((action) => (
          <Link
            key={action.href}
            href={action.href}
            prefetch={false}
            data-testid={
              action.testId === 'child-quick-record'
                ? 'mobile-child-record-button'
                : action.testId === 'child-quick-daily-note'
                  ? 'mobile-child-daily-note-button'
                  : action.testId === 'child-quick-orb'
                    ? 'mobile-child-orb-button'
                    : action.testId
            }
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-600 px-3 py-2.5 text-center text-sm font-black text-white shadow-md shadow-sky-500/25 transition hover:bg-sky-700 md:px-4"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </header>
  )
}
