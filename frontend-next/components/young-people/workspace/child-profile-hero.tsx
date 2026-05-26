import { MobileSafeLink } from '@/components/indicare/mobile/mobile-safe-link'
import { ChildWorkspaceAvatar } from '@/components/young-people/workspace/child-workspace-avatar'
import { RiskBadge, StatusBadge } from '@/components/indicare/ui'
import { childOrbHref, childRecordHref } from '@/lib/navigation/scope-routes'
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
  const childId = child.id
  const recordHref = childRecordHref(childId)
  const orbHref = childOrbHref(childId, 'record_quality_review')

  return (
    <header
      className="child-workspace-hero-mobile-compact rounded-[28px] border border-white/80 bg-gradient-to-br from-sky-50 via-white to-violet-50/40 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:rounded-[36px] md:p-8 md:shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
      data-testid="child-workspace-hero"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-700">Child story</p>
      <div className="mt-4 flex items-start gap-4 md:mt-5 md:gap-6">
        <ChildWorkspaceAvatar photo={photo} displayName={child.displayName} initials={initials} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">{child.displayName}</h1>
          {child.preferredName && child.preferredName !== child.displayName ? (
            <p className="mt-1 text-sm text-slate-600 md:mt-2 md:text-base">
              Known as <span className="font-bold text-slate-800">{child.preferredName}</span>
            </p>
          ) : null}
          <p className="mt-2 hidden max-w-2xl text-sm leading-7 text-slate-600 md:block">
            Who is this child, what matters to them, and what does the adult need to know before recording?
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
        className="child-workspace-hero-actions mt-4 flex flex-wrap gap-2 md:mt-6"
        data-testid="child-workspace-hero-actions"
      >
        <MobileSafeLink
          href={recordHref}
          prefetch={false}
          data-testid="child-hero-record"
          tapDebugLabel="child-hero-record"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-sky-500/25 transition hover:bg-sky-700 sm:flex-none"
        >
          Record
        </MobileSafeLink>
        <MobileSafeLink
          href={orbHref}
          prefetch={false}
          data-testid="child-hero-ask-orb"
          tapDebugLabel="child-hero-ask-orb"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-black text-sky-800 transition hover:bg-sky-50 xl:hidden sm:flex-none"
        >
          Ask ORB
        </MobileSafeLink>
      </div>
    </header>
  )
}
