import type { OrbAccessPayload } from '@/lib/orb/orb-billing-client'

export type OrbBillingDisplayStatus = {
  headline: string
  subscriptionLabel: string
  showTrialChip: boolean
  trialChipLabel: string | null
  showUpgrade: boolean
  showManageBilling: boolean
  showTrialCta: boolean
  isPaidActive: boolean
}

export function isPaidSubscriptionActive(access: OrbAccessPayload | null): boolean {
  if (!access) return false
  const status = (access.subscription?.status || '').toLowerCase()
  if (access.subscription?.active && status === 'active') return true
  return access.access_state === 'subscription_active' && Boolean(access.subscription?.active)
}

export function formatOrbBillingHeadline(access: OrbAccessPayload | null): string {
  if (!access) return 'Loading…'
  if (isPaidSubscriptionActive(access)) return 'Active'
  if (access.trial?.active) {
    const days =
      access.trial.days_left != null ? ` · ${access.trial.days_left} days left` : ''
    return `Trial active${days}`
  }
  const state = access.access_state
  if (state === 'subscription_past_due' || access.subscription?.status === 'past_due') {
    return 'Past due'
  }
  if (state === 'subscription_cancelled') return 'Cancelled'
  if (state === 'subscription_incomplete') return 'Incomplete'
  if (access.trial?.available === false && !access.can_use_orb) return 'Trial ended'
  return 'Inactive'
}

export function formatOrbSubscriptionLabel(access: OrbAccessPayload | null): string {
  if (!access) return '—'
  if (isPaidSubscriptionActive(access)) return 'Active'
  if (access.trial?.active) {
    const days =
      access.trial.days_left != null ? ` · ${access.trial.days_left} days left` : ''
    return `Trial active${days}`
  }
  if (access.trial?.available === false && !access.subscription?.active) return 'Trial ended'
  const raw = access.subscription?.status
  if (raw) return raw.replace(/_/g, ' ')
  return formatOrbBillingHeadline(access)
}

export function shouldShowTrialChip(access: OrbAccessPayload | null): boolean {
  if (!access?.trial?.active) return false
  return !isPaidSubscriptionActive(access)
}

export function getOrbBillingDisplayStatus(access: OrbAccessPayload | null): OrbBillingDisplayStatus {
  const paidActive = isPaidSubscriptionActive(access)
  const trialActive = Boolean(access?.trial?.active) && !paidActive
  const showUpgrade = Boolean(access) && !paidActive && !trialActive
  const showManageBilling = Boolean(access) && (paidActive || trialActive)
  const showTrialCta = Boolean(access?.trial?.available && !access?.can_use_orb && !paidActive)

  return {
    headline: formatOrbBillingHeadline(access),
    subscriptionLabel: formatOrbSubscriptionLabel(access),
    showTrialChip: shouldShowTrialChip(access),
    trialChipLabel: trialActive
      ? `Trial active${
          access?.trial?.days_left != null ? ` · ${access.trial.days_left} days left` : ''
        }`
      : null,
    showUpgrade,
    showManageBilling: paidActive || showManageBilling,
    showTrialCta,
    isPaidActive: paidActive
  }
}
