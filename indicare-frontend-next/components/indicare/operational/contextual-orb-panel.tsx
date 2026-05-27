'use client'

import { usePathname } from 'next/navigation'

import { OperationalOrbRail } from '@/components/orb-operational/operational-orb-rail'
import { operationalFeatureFlags } from '@/lib/navigation/operational-navigation'
import {
  idsFromPathname,
  resolveOperationalOrbScopeType,
  shouldShowShellContextualOrbPanel
} from '@/lib/orb/orb-presence-rules'
import { useOperationalContext } from '@/lib/operational/operational-context'

export function ContextualOrbPanel({ className = '' }: { className?: string }) {
  const pathname = usePathname() || '/'
  const { currentChild, assistantContext } = useOperationalContext()

  if (!operationalFeatureFlags.embeddedOrbPanel) return null
  if (!shouldShowShellContextualOrbPanel(pathname)) return null

  const scopeType = resolveOperationalOrbScopeType(pathname)
  const ids = idsFromPathname(pathname)
  const childName = currentChild?.name ? String(currentChild.name) : undefined
  const homeNameRaw =
    assistantContext.current_workspace_type === 'home_workspace' ? assistantContext.page_title : undefined
  const homeName = homeNameRaw ?? undefined

  return (
    <div data-testid="contextual-orb-panel" className={className}>
      <OperationalOrbRail
        scopeType={scopeType}
        childId={ids.childId}
        homeId={ids.homeId}
        childName={childName}
        homeName={homeName}
        testId="shell-operational-orb-rail"
      />
    </div>
  )
}
