import type { OrbProductMode, OrbRole } from './identity'

export type OrbRoleContract = {
  role: OrbRole
  canAccessOsRecords: boolean
  canRetrieveActiveChild: boolean
  canWriteWithoutConfirmation: false
  memoryBoundary: string
  rules: string[]
}

export function orbRoleContract(productMode: OrbProductMode): OrbRoleContract {
  if (productMode === 'standalone') {
    return {
      role: 'standalone_assistant',
      canAccessOsRecords: false,
      canRetrieveActiveChild: false,
      canWriteWithoutConfirmation: false,
      memoryBoundary: 'standalone-user-only-no-os-context',
      rules: [
        'Use general, static sector and user-supplied content only.',
        'Never access active child context.',
        'Never inherit OS memory.'
      ]
    }
  }
  return {
    role: 'operational_companion',
    canAccessOsRecords: true,
    canRetrieveActiveChild: true,
    canWriteWithoutConfirmation: false,
    memoryBoundary: 'rbac-user-home-active-child-scoped',
    rules: [
      'Use RBAC and active-child scoped retrieval.',
      'Create drafts and suggestions unless explicitly confirmed.',
      'Keep citations and evidence internally traceable.'
    ]
  }
}

