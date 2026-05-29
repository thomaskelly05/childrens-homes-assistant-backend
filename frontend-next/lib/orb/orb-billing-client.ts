import { authFetch, authFetchResponse } from '@/lib/auth/api'

export type OrbAccessPayload = {
  product: string
  price_label: string
  can_use_orb: boolean
  access_state: string
  trial: {
    available?: boolean
    active?: boolean
    days_left?: number | null
    expires_at?: string | null
  }
  subscription: {
    active?: boolean
    status?: string | null
    plan_name?: string | null
    current_period_end?: string | null
  }
  billing: {
    stripe_configured?: boolean
    price_gbp_monthly?: number
  }
  usage_meter?: Record<string, unknown>
  standalone: boolean
  os_records_accessed: boolean
  os_access_granted: boolean
  safety_accepted?: boolean
  onboarding_completed?: boolean
  upgrade?: {
    checkout_available?: boolean
    trial_available?: boolean
    manage_billing_available?: boolean
    features?: string[]
    boundary_note?: string
  }
  oauth?: {
    google?: boolean
    microsoft?: boolean
    apple?: boolean
  }
}

export const ORB_BILLING_API = {
  access: '/orb/standalone/access',
  status: '/orb/standalone/billing/status',
  meter: '/orb/standalone/billing/meter',
  checkout: '/orb/standalone/billing/checkout',
  portal: '/orb/standalone/billing/portal',
  trialStart: '/orb/standalone/trial/start',
  onboarding: '/orb/standalone/onboarding/preferences',
  safetyAccept: '/orb/standalone/safety/accept',
  safetyStatus: '/orb/standalone/safety/status',
  signup: '/orb/standalone/auth/signup',
  analytics: '/orb/standalone/analytics/event'
} as const

export async function fetchOrbAccess(): Promise<OrbAccessPayload> {
  const response = await authFetch<{ success?: boolean; data?: OrbAccessPayload }>(ORB_BILLING_API.access, {
    credentials: 'include'
  })
  return response.data ?? (response as unknown as OrbAccessPayload)
}

export async function fetchOrbBillingMeter() {
  const response = await authFetch<{ success?: boolean; data?: Record<string, unknown> }>(ORB_BILLING_API.meter, {
    credentials: 'include'
  })
  return response.data ?? {}
}

export async function startOrbTrial() {
  return authFetch<{ success?: boolean; data?: { access?: OrbAccessPayload } }>(ORB_BILLING_API.trialStart, {
    method: 'POST',
    credentials: 'include'
  })
}

export async function startOrbCheckout(successUrl?: string, cancelUrl?: string) {
  const response = await authFetchResponse(ORB_BILLING_API.checkout, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl })
  })
  const body = (await response.json()) as { checkout_url?: string; success?: boolean }
  if (!response.ok || !body.checkout_url) {
    throw new Error('Checkout could not be started')
  }
  return body.checkout_url
}

export async function openOrbBillingPortal() {
  const response = await authFetchResponse(ORB_BILLING_API.portal, {
    method: 'POST',
    credentials: 'include'
  })
  const body = (await response.json()) as { portal_url?: string }
  if (!response.ok || !body.portal_url) {
    throw new Error('Billing portal unavailable')
  }
  return body.portal_url
}

export async function acceptOrbSafety(version: string) {
  return authFetch(ORB_BILLING_API.safetyAccept, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, accepted: true })
  })
}

export async function saveOrbOnboarding(payload: Record<string, unknown>) {
  return authFetch(ORB_BILLING_API.onboarding, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export async function trackOrbAnalytics(event: string, metadata?: Record<string, unknown>) {
  try {
    await authFetch(ORB_BILLING_API.analytics, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, metadata: metadata ?? {} })
    })
  } catch {
    // Analytics must not block UX.
  }
}

export async function orbStandaloneSignup(input: {
  email: string
  password: string
  first_name?: string
  last_name?: string
}) {
  const response = await authFetchResponse(ORB_BILLING_API.signup, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: string }
    throw new Error(typeof body.detail === 'string' ? body.detail : 'Signup failed')
  }
  return response.json()
}

export const ORB_ROLE_OPTIONS = [
  'Residential support worker',
  'Senior support worker',
  'Deputy manager',
  'Registered manager',
  'Responsible Individual',
  'Provider / director',
  'Reg 44 visitor',
  'Social worker',
  'NVQ assessor',
  'NVQ learner',
  'Diploma learner',
  'Trainer / consultant',
  'Other'
] as const

export const ORB_COMMON_NEEDS = [
  'autism',
  'ADHD',
  'global developmental delay',
  'learning disability',
  'trauma',
  'missing from care',
  'exploitation risk',
  'self-harm',
  'medication support',
  'education concerns',
  'other'
] as const

export const ORB_SAFETY_STATEMENTS = [
  'I understand ORB supports professional thinking and does not replace safeguarding procedures.',
  'I understand standalone ORB does not access IndiCare OS records.',
  'I will avoid entering unnecessary identifiable personal details where possible.',
  'I understand saved outputs and feedback may be used to improve ORB quality safely.'
] as const

export const ORB_SAFETY_VERSION = '2026-05-29-v1'
