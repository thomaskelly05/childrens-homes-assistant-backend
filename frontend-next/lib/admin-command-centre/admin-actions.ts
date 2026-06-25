import type { AdminActionDescriptor, AdminActionKind } from './types'

const WIRED_ACTIONS = new Set<AdminActionKind>([
  'disable-user',
  'reactivate-user',
  'force-password-reset'
])

const UNWIRED_ACTIONS = new Set<AdminActionKind>(['resend-invite', 'revoke-sessions'])

/** Phase 2: action descriptors — wired status reflects backend capability. */
const ACTION_CATALOG: Record<AdminActionKind, Omit<AdminActionDescriptor, 'kind'>> = {
  'resend-invite': {
    label: 'Resend invite',
    wired: false,
    description: 'Not wired to current auth provider yet'
  },
  'force-password-reset': {
    label: 'Force password reset',
    wired: true,
    description: 'Sets a temporary password via admin API'
  },
  'disable-user': {
    label: 'Disable user',
    wired: true,
    description: 'Deactivates account access'
  },
  'reactivate-user': {
    label: 'Reactivate user',
    wired: true,
    description: 'Restores account access'
  },
  'revoke-sessions': {
    label: 'Revoke sessions',
    wired: false,
    description: 'Not wired to current auth provider yet'
  },
  'pause-provider': { label: 'Pause provider', wired: false },
  'add-home': { label: 'Add home', wired: false },
  'invite-manager': { label: 'Invite manager', wired: false },
  'assign-manager': { label: 'Assign manager', wired: false },
  'disable-home': { label: 'Disable home', wired: false },
  'review-flag': { label: 'Review', wired: false },
  'resolve-flag': { label: 'Mark resolved', wired: false },
  'escalate-flag': { label: 'Escalate', wired: false },
  'suspend-user': { label: 'Suspend user', wired: false },
  'mark-safe': { label: 'Mark safe', wired: false },
  'lock-account': { label: 'Lock account', wired: false },
  'require-password-reset': { label: 'Require password reset', wired: false },
  investigate: { label: 'Investigate', wired: false }
}

export function getAdminAction(kind: AdminActionKind): AdminActionDescriptor {
  const entry = ACTION_CATALOG[kind]
  return {
    kind,
    ...entry,
    description: entry.description ?? (entry.wired ? undefined : 'Not wired to current auth provider yet')
  }
}

export function getAdminActions(kinds: AdminActionKind[]): AdminActionDescriptor[] {
  return kinds.map(getAdminAction)
}

export function isAdminActionGloballyWired(kind: AdminActionKind): boolean {
  return WIRED_ACTIONS.has(kind)
}

export function isAdminActionGloballyUnwired(kind: AdminActionKind): boolean {
  return UNWIRED_ACTIONS.has(kind)
}

export function describePendingAdminAction(kind: AdminActionKind, target: string): string {
  const action = getAdminAction(kind)
  return `${action.label} on ${target} — ${action.description ?? 'pending backend'}`
}
