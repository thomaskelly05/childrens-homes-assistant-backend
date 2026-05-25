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
      className="rounded-[36px] border border-white/80 bg-gradient-to-br from-sky-50 via-white to-violet-50/40 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
      data-testid="child-workspace-hero"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-700">Child workspace overview</p>
      <div className="mt-5 flex flex-wrap items-start gap-6">
        {photo ? (
          <div
            className="h-28 w-28 shrink-0 rounded-[32px] bg-cover bg-center shadow-lg shadow-sky-200/40 ring-4 ring-white"
            style={{ backgroundImage: `url(${photo})` }}
            role="img"
            aria-label={`Photo of ${child.displayName}`}
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[32px] bg-gradient-to-br from-sky-500 to-indigo-500 text-3xl font-black text-white shadow-lg shadow-sky-300/30">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-5xl">{child.displayName}</h1>
          {child.preferredName && child.preferredName !== child.displayName ? (
            <p className="mt-2 text-base text-slate-600">
              Known as <span className="font-bold text-slate-800">{child.preferredName}</span>
            </p>
          ) : null}
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Get to know {child.preferredName || child.displayName} before recording — one child, one home, child-centred care.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {child.age && child.age !== 'Not recorded yet' ? <StatusBadge value={`Age ${child.age}`} /> : null}
            {child.placementStatus && child.placementStatus !== 'Not recorded yet' ? (
              <StatusBadge value={child.placementStatus} />
            ) : null}
            {child.homeName && child.homeName !== 'Not recorded yet' ? <StatusBadge value={child.homeName} /> : null}
            <RiskBadge value={(child.riskLevel as 'low' | 'medium' | 'high') || 'medium'} />
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {view.quickActions.slice(0, 4).map((action) => (
          <Link
            key={action.href}
            href={action.href}
            prefetch={false}
            data-testid={action.testId}
            className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-sky-500/25 transition hover:bg-sky-700"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </header>
  )
}
