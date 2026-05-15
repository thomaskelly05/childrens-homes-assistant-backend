import type { OrbProductMode } from './identity'

export type OrbProductBoundary = {
  productMode: OrbProductMode
  liveOsAccess: boolean
  activeChildAllowed: boolean
  memoryStore: 'os_scoped_memory' | 'standalone_user_memory'
  retrievalPolicy: 'rbac_active_child_os_retrieval' | 'static_sector_and_user_supplied_only'
}

export function boundaryForOrbProductMode(productMode: OrbProductMode): OrbProductBoundary {
  if (productMode === 'standalone') {
    return {
      productMode,
      liveOsAccess: false,
      activeChildAllowed: false,
      memoryStore: 'standalone_user_memory',
      retrievalPolicy: 'static_sector_and_user_supplied_only'
    }
  }
  return {
    productMode,
    liveOsAccess: true,
    activeChildAllowed: true,
    memoryStore: 'os_scoped_memory',
    retrievalPolicy: 'rbac_active_child_os_retrieval'
  }
}

export function isStandaloneOrbRoute(pathname: string | null | undefined) {
  return Boolean(pathname === '/assistant' || pathname?.startsWith('/assistant/'))
}

export function assertStandaloneContextIsClean(context: Record<string, unknown>) {
  const unsafeKeys = [
    'home_id',
    'home_scope',
    'selected_young_person_id',
    'selected_record_id',
    'selected_record_type',
    'current_child',
    'child_context_lock',
    'operational_memory'
  ]
  return unsafeKeys.filter((key) => {
    const value = context[key]
    return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
  })
}

