import Link from 'next/link'

import { buildScopeOrbContextLabel, scopeOrbLaunchHref, type ScopeOrbWorkspace } from '@/lib/orb/scope-orb-context'
import type { ScopeOrbMode } from '@/lib/navigation/scope-routes'

type ScopeOrbLauncherProps = {
  workspace: ScopeOrbWorkspace
  childId?: string | number
  homeId?: string | number
  childDisplayName?: string | null
  homeName?: string | null
  mode?: ScopeOrbMode
  query?: string
  testId?: string
  compact?: boolean
}

export function ScopeOrbLauncher({
  workspace,
  childId,
  homeId,
  childDisplayName,
  homeName,
  mode,
  query,
  testId = 'scope-orb-launcher',
  compact = false
}: ScopeOrbLauncherProps) {
  const label = buildScopeOrbContextLabel({ workspace, childDisplayName, homeName })
  const href = scopeOrbLaunchHref({ workspace, childId, homeId, mode, query })

  if (compact) {
    return (
      <Link
        href={href}
        prefetch={false}
        data-testid={testId}
        className="inline-flex rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white"
      >
        Ask ORB
      </Link>
    )
  }

  return (
    <aside
      data-testid={testId}
      className="rounded-[28px] border border-indigo-100/80 bg-gradient-to-b from-indigo-50/90 to-white p-5 shadow-lg shadow-indigo-100/40"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">ORB</p>
      <h2 className="mt-2 text-lg font-black text-slate-950">{label.headline}</h2>
      <p className="mt-2 text-sm text-slate-600">{label.subline}</p>
      <p className="mt-3 text-xs leading-6 text-slate-500">{label.privacyNotice}</p>
      <Link
        href={href}
        prefetch={false}
        data-testid={`${testId}-open`}
        className="mt-5 inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white"
      >
        Open operational ORB
      </Link>
    </aside>
  )
}
