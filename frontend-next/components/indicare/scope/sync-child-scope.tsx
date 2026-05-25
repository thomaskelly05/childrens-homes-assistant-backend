'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import { useActiveChild } from '@/lib/context/active-child-context'
import { scopeFromRoute } from '@/lib/os-scope'

/** Keeps OS session scope aligned when user lands on a child workspace route. */
export function SyncChildScope({ childId, childName, homeId }: { childId: string; childName?: string; homeId?: string | number | null }) {
  const pathname = usePathname() || '/'
  const { scope, applyScopeSelection } = useOsScope()
  const { selectChild } = useActiveChild()

  useEffect(() => {
    const parsedId = Number.parseInt(childId, 10)
    if (!Number.isFinite(parsedId)) return
    const route = scopeFromRoute(pathname)
    if (route.childId !== childId) return

    selectChild(
      {
        id: childId,
        displayName: childName || `Young person ${childId}`,
        homeId: homeId ?? undefined
      },
      'route'
    )

    if (scope.scope_type === 'child' && scope.selected_child_id === parsedId) return

    void applyScopeSelection({
      scope_type: 'child',
      child_id: parsedId,
      child_name: childName,
      home_id: homeId ? Number(homeId) : scope.selected_home_id ?? undefined,
      home_name: scope.selected_home_name ?? undefined
    }).catch(() => undefined)
  }, [
    applyScopeSelection,
    childId,
    childName,
    homeId,
    pathname,
    scope.scope_type,
    scope.selected_child_id,
    scope.selected_home_id,
    scope.selected_home_name,
    selectChild
  ])

  return null
}
