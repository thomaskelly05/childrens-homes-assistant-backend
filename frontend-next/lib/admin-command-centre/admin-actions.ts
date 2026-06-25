import type { AdminActionDescriptor, AdminActionKind } from './types'

/** Phase 1: action descriptors — UI-ready, backend wiring tracked per action. */
const ACTION_CATALOG: Record<AdminActionKind, Omit<AdminActionDescriptor, 'kind'>> = {
  'resend-invite': { label: 'Resend invite', wired: false },
  'force-password-reset': { label: 'Force password reset', wired: false },
  'disable-user': { label: 'Disable user', wired: false },
  'reactivate-user': { label: 'Reactivate user', wired: false },
  'revoke-sessions': { label: 'Revoke sessions', wired: false },
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
    description: entry.wired ? undefined : 'Action wiring pending'
  }
}

export function getAdminActions(kinds: AdminActionKind[]): AdminActionDescriptor[] {
  return kinds.map(getAdminAction)
}

/** Future: every admin mutation should append to audit log via this hook. */
export function describePendingAdminAction(kind: AdminActionKind, target: string): string {
  const action = getAdminAction(kind)
  return `${action.label} on ${target} — ${action.description ?? 'pending backend'}`
}
