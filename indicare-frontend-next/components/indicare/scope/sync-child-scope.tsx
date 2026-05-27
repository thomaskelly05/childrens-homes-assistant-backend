'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import { useActiveChild } from '@/lib/context/active-child-context'
import { childIdFromPath } from '@/lib/navigation/child-workspace-routes'
import { scopeFromRoute } from '@/lib/os-scope'

/** Keeps OS session scope aligned when user lands on a child workspace route. */
export function SyncChildScope({ childId, childName, homeId }: { childId: string; childName?: string; homeId?: string | number | null }) {
  const pathname = usePathname() || '/'
  const { scope, applyScopeSelection } = useOsScope()
  const { selectChild } = useActiveChild()
  const lastSyncedChildIdRef = useRef<number | null>(null)
  const syncInFlightRef = useRef(false)

  useEffect(() => {
    const parsedId = Number.parseInt(childId, 10)
    if (!Number.isFinite(parsedId)) return
    const routeChildId = scopeFromRoute(pathname).childId ?? childIdFromPath(pathname)
    if (routeChildId !== childId) return

    const scopeMatches = scope.scope_type === 'child' && scope.selected_child_id === parsedId
    if (scopeMatches) {
      lastSyncedChildIdRef.current = parsedId
      selectChild(
        {
          id: childId,
          displayName: childName || scope.selected_child_name || `Young person ${childId}`,
          homeId: homeId ?? scope.selected_home_id ?? undefined
        },
        'route'
      )
      return
    }

    if (lastSyncedChildIdRef.current === parsedId || syncInFlightRef.current) return

    selectChild(
      {
        id: childId,
        displayName: childName || `Young person ${childId}`,
        homeId: homeId ?? undefined
      },
      'route'
    )

    syncInFlightRef.current = true
    void applyScopeSelection({
      scope_type: 'child',
      child_id: parsedId,
      child_name: childName,
      home_id: homeId ? Number(homeId) : scope.selected_home_id ?? undefined,
      home_name: scope.selected_home_name ?? undefined
    })
      .then(() => {
        lastSyncedChildIdRef.current = parsedId
      })
      .catch(() => undefined)
      .finally(() => {
        syncInFlightRef.current = false
      })
  }, [
    applyScopeSelection,
    childId,
    childName,
    homeId,
    pathname,
    scope.scope_type,
    scope.selected_child_id,
    scope.selected_home_id,
    scope.selected_child_name,
    scope.selected_home_name,
    selectChild
  ])

  return null
}
