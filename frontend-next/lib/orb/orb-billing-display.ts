import type { OrbAccessPayload } from '@/lib/orb/orb-billing-client'

const ORB_PLAN_LABELS: Record<string, string> = {
  orb_residential_individual: 'ORB Residential — Individual',
  orb_residential: 'ORB Residential — Individual'
}

/** Human-friendly plan label — raw plan IDs stay in diagnostics only. */
export function formatOrbPlanLabel(planIdOrName: string | null | undefined): string {
  const raw = planIdOrName?.trim()
  if (!raw) return 'Individual'
  const roleLike = /^(admin|manager|staff|user|owner|residential_support_worker)$/i.test(raw)
  if (roleLike) return 'Individual'
  const mapped = ORB_PLAN_LABELS[raw.toLowerCase()]
  if (mapped) return mapped.replace(/^ORB Residential — /, '')
  if (raw.includes(' — ')) return raw
  if (/^orb[_\s]/i.test(raw)) {
    const normalised = raw.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
    if (/individual/i.test(normalised)) return 'Individual'
    return normalised.replace(/\b\w/g, (char) => char.toUpperCase())
  }
  if (/individual/i.test(raw)) return 'Individual'
  return raw
}

export type OrbBillingStatusContext = {
  isLoading?: boolean
  hasError?: boolean
  isSignedIn?: boolean
}

export type OrbBillingDisplayStatus = {
  headline: string
  subscriptionLabel: string
  showTrialChip: boolean
  trialChipLabel: string | null
  showUpgrade: boolean
  showManageBilling: boolean
  showTrialCta: boolean
  isPaidActive: boolean
  statusKind: OrbBillingStatusKind
}

export type OrbBillingStatusKind =
  | 'loading'
  | 'unavailable'
  | 'unable_to_verify'
  | 'active'
  | 'trial_active'
  | 'past_due'
  | 'cancelled'
  | 'incomplete'
  | 'trial_ended'
  | 'inactive'

const PAID_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export function isPaidSubscriptionActive(access: OrbAccessPayload | null): boolean {
  if (!access) return false
  const state = access.access_state
  if (state === 'admin_bypass' || state === 'founding_plan_bypass') return true
  const status = (access.subscription?.status || '').toLowerCase()
  if (access.subscription?.active) {
    if (!status || PAID_SUBSCRIPTION_STATUSES.has(status)) return true
  }
  if (state === 'subscription_active') {
    return Boolean(access.subscription?.active ?? true)
  }
  return false
}

function resolveBillingStatusKind(
  access: OrbAccessPayload | null,
  context?: OrbBillingStatusContext
): OrbBillingStatusKind {
  if (context?.isLoading) return 'loading'
  if (context?.hasError) return 'unavailable'
  if (!access) return context?.isSignedIn === false ? 'inactive' : 'unable_to_verify'
  if (isPaidSubscriptionActive(access)) return 'active'
  if (access.trial?.active) return 'trial_active'
  const state = access.access_state
  if (state === 'subscription_past_due' || access.subscription?.status === 'past_due') return 'past_due'
  if (state === 'subscription_cancelled') return 'cancelled'
  if (state === 'subscription_incomplete') return 'incomplete'
  if (state === 'access_check_unavailable') return 'unavailable'
  if (access.trial?.available === false && !access.can_use_orb) return 'trial_ended'
  return 'inactive'
}

export function formatOrbBillingHeadline(
  access: OrbAccessPayload | null,
  context?: OrbBillingStatusContext
): string {
  const kind = resolveBillingStatusKind(access, context)
  switch (kind) {
    case 'loading':
      return 'Syncing…'
    case 'unavailable':
      return 'Status unavailable'
    case 'unable_to_verify':
      return 'Unable to verify'
    case 'active':
      return 'Active'
    case 'trial_active': {
      const days =
        access?.trial?.days_left != null ? ` · ${access.trial.days_left} days left` : ''
      return `Trial active${days}`
    }
    case 'past_due':
      return 'Past due'
    case 'cancelled':
      return 'Cancelled'
    case 'incomplete':
      return 'Incomplete'
    case 'trial_ended':
      return 'Trial ended'
    case 'inactive':
      return 'Inactive'
    default:
      return 'Unable to verify'
  }
}

export function formatOrbSubscriptionLabel(
  access: OrbAccessPayload | null,
  context?: OrbBillingStatusContext
): string {
  const kind = resolveBillingStatusKind(access, context)
  if (kind === 'loading') return 'Syncing…'
  if (kind === 'unavailable') return 'Status unavailable'
  if (kind === 'unable_to_verify') return 'Unable to verify'
  if (kind === 'active') return 'Active'
  if (kind === 'trial_active') {
    const days =
      access?.trial?.days_left != null ? ` · ${access.trial.days_left} days left` : ''
    return `Trial active${days}`
  }
  if (kind === 'trial_ended') return 'Trial ended'
  if (access?.subscription?.status) return access.subscription.status.replace(/_/g, ' ')
  return formatOrbBillingHeadline(access, context)
}

export function shouldShowTrialChip(access: OrbAccessPayload | null): boolean {
  if (!access?.trial?.active) return false
  return !isPaidSubscriptionActive(access)
}

export function getOrbBillingDisplayStatus(
  access: OrbAccessPayload | null,
  context?: OrbBillingStatusContext
): OrbBillingDisplayStatus {
  const statusKind = resolveBillingStatusKind(access, context)
  const paidActive = isPaidSubscriptionActive(access)
  const trialActive = Boolean(access?.trial?.active) && !paidActive
  const confirmedPayload = Boolean(access) && statusKind !== 'loading' && statusKind !== 'unavailable' && statusKind !== 'unable_to_verify'
  const showUpgrade = confirmedPayload && !paidActive && !trialActive
  const showManageBilling = confirmedPayload && (paidActive || trialActive)
  const showTrialCta = Boolean(
    access?.trial?.available && !access?.can_use_orb && !paidActive && confirmedPayload
  )

  return {
    headline: formatOrbBillingHeadline(access, context),
    subscriptionLabel: formatOrbSubscriptionLabel(access, context),
    showTrialChip: shouldShowTrialChip(access),
    trialChipLabel: trialActive
      ? `Trial active${
          access?.trial?.days_left != null ? ` · ${access.trial.days_left} days left` : ''
        }`
      : null,
    showUpgrade,
    showManageBilling: paidActive || showManageBilling,
    showTrialCta,
    isPaidActive: paidActive,
    statusKind
  }
}
