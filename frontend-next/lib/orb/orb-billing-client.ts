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
  checkout: '/orb/subscription/checkout',
  checkoutLegacy: '/orb/standalone/billing/checkout',
  portal: '/orb/standalone/billing/portal',
  trialStart: '/orb/standalone/trial/start',
  setup: '/orb/setup',
  profile: '/orb/profile',
  memory: '/orb/memory',
  subscription: '/orb/subscription',
  subscriptionCancel: '/orb/subscription/cancel',
  subscriptionPortal: '/orb/subscription/portal',
  usage: '/orb/usage',
  spendingCap: '/orb/usage/spending-cap',
  topUpCheckout: '/orb/usage/top-up-checkout',
  onboarding: '/orb/setup',
  onboardingLegacy: '/orb/standalone/onboarding/preferences',
  learnFromAnswer: '/orb/learn/from-answer',
  authProviders: '/orb/auth/providers',
  safetyAccept: '/orb/standalone/safety/accept',
  safetyStatus: '/orb/standalone/safety/status',
  signup: '/orb/standalone/auth/signup',
  analytics: '/orb/standalone/analytics/event'
} as const

export const ORB_TEMPLATES_API = {
  list: '/templates',
  categories: '/templates/categories',
  generate: '/templates/generate',
  exportPdf: '/templates/export/pdf',
  exportDocx: '/templates/export/docx'
} as const

export const ORB_SAVED_OUTPUTS_API = {
  list: '/saved-outputs'
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

export type OrbUsageSummary = {
  messages_this_period: number
  included_messages: number | null
  extra_usage_pence: number
  estimated_spend_pence: number
  monthly_cap_pence: number | null
  warning_threshold_percent: number
  allow_overage: boolean
  credits_balance: number
}

export async function fetchOrbUsage(): Promise<OrbUsageSummary> {
  const response = await authFetch<OrbUsageSummary | { data?: OrbUsageSummary }>(ORB_BILLING_API.usage, {
    credentials: 'include'
  })
  if (response && typeof response === 'object' && 'messages_this_period' in response) {
    return response as OrbUsageSummary
  }
  return (response as { data?: OrbUsageSummary }).data ?? {
    messages_this_period: 0,
    included_messages: null,
    extra_usage_pence: 0,
    estimated_spend_pence: 0,
    monthly_cap_pence: null,
    warning_threshold_percent: 80,
    allow_overage: false,
    credits_balance: 0
  }
}

export async function saveOrbSpendingCap(body: {
  monthly_cap_pence: number | null
  warning_threshold_percent: number
  allow_overage: boolean
}) {
  return authFetch<{ ok: boolean }>(ORB_BILLING_API.spendingCap, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

export async function startOrbTopUpCheckout(amountPence: number): Promise<string> {
  const response = await authFetchResponse(ORB_BILLING_API.topUpCheckout, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount_pence: amountPence })
  })
  const body = (await response.json()) as { checkout_url?: string }
  if (!response.ok || !body.checkout_url) {
    throw new Error('Top-up checkout could not be started')
  }
  return body.checkout_url
}

export async function startOrbCheckout(successUrl?: string, cancelUrl?: string) {
  const base =
    typeof window !== 'undefined' ? window.location.origin : ''
  const resolvedSuccess = successUrl ?? (base ? `${base}/orb?billing=success` : undefined)
  const resolvedCancel = cancelUrl ?? (base ? `${base}/orb?billing=cancelled` : undefined)
  const response = await authFetchResponse(ORB_BILLING_API.checkout, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success_url: resolvedSuccess, cancel_url: resolvedCancel })
  })
  const body = (await response.json()) as { checkout_url?: string; success?: boolean }
  if (!response.ok || !body.checkout_url) {
    throw new Error('Checkout could not be started')
  }
  return body.checkout_url
}

export async function openOrbBillingPortal() {
  const response = await authFetchResponse(ORB_BILLING_API.subscriptionPortal, {
    method: 'POST',
    credentials: 'include'
  }).catch(() =>
    authFetchResponse(ORB_BILLING_API.portal, {
      method: 'POST',
      credentials: 'include'
    })
  )
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

export async function fetchOrbSetup() {
  const response = await authFetch<{ success?: boolean; data?: Record<string, unknown> }>(ORB_BILLING_API.setup, {
    credentials: 'include'
  })
  return response.data ?? {}
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
    await fetch(ORB_BILLING_API.analytics, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, metadata: metadata ?? {} })
    })
  } catch {
    // Analytics must not block UX.
  }
}

export type OrbCheckoutRefreshResult = {
  access: OrbAccessPayload
  meter?: Record<string, unknown> | null
  confirmed: boolean
}

/** Poll access after Stripe checkout while webhooks may still be processing. */
export async function refreshOrbAccessAfterCheckout(options?: {
  maxAttempts?: number
  delayMs?: number
}): Promise<OrbCheckoutRefreshResult> {
  const maxAttempts = options?.maxAttempts ?? 8
  const delayMs = options?.delayMs ?? 1500
  let lastAccess: OrbAccessPayload | null = null
  let meter: Record<string, unknown> | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    lastAccess = await fetchOrbAccess()
    if (lastAccess.can_use_orb || lastAccess.subscription?.active || lastAccess.trial?.active) {
      try {
        meter = await fetchOrbBillingMeter()
      } catch {
        meter = null
      }
      return { access: lastAccess, meter, confirmed: true }
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return {
    access: lastAccess ?? (await fetchOrbAccess()),
    meter,
    confirmed: false
  }
}

export function orbOAuthStartUrl(provider: 'google' | 'microsoft' | 'apple', returnUrl = '/orb') {
  const params = new URLSearchParams({ return_url: returnUrl })
  return `/orb/standalone/auth/oauth/${provider}/start?${params.toString()}`
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
  'I understand ORB Residential does not access IndiCare OS records.',
  'I will avoid entering unnecessary identifiable personal details where possible.',
  'I understand saved outputs and feedback may be used to improve ORB quality safely.'
] as const

export const ORB_SAFETY_VERSION = '2026-05-29-v1'

export type OrbTemplateCategory = { id: string; name: string; slug?: string }
export type OrbTemplateSummary = {
  id: string
  title: string
  category?: string
  description?: string
  favourite?: boolean
  last_used_at?: string | null
}

export async function fetchOrbTemplateCategories() {
  const response = await authFetch<{ success?: boolean; data?: OrbTemplateCategory[] }>(
    ORB_TEMPLATES_API.categories,
    { credentials: 'include' }
  )
  return response.data ?? (Array.isArray(response) ? response : [])
}

export async function fetchOrbTemplates(params?: { category?: string; search?: string }) {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.search) query.set('search', params.search)
  const path = query.toString() ? `${ORB_TEMPLATES_API.list}?${query}` : ORB_TEMPLATES_API.list
  const response = await authFetch<{ success?: boolean; data?: OrbTemplateSummary[] }>(path, {
    credentials: 'include'
  })
  return response.data ?? []
}

export async function fetchOrbTemplate(id: string) {
  const response = await authFetch<{ success?: boolean; data?: Record<string, unknown> }>(
    `${ORB_TEMPLATES_API.list}/${encodeURIComponent(id)}`,
    { credentials: 'include' }
  )
  return response.data ?? response
}

export async function generateOrbTemplate(body: { template_id: string; context?: string }) {
  return authFetch(ORB_TEMPLATES_API.generate, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

export async function exportOrbTemplate(format: 'pdf' | 'docx', body: Record<string, unknown>) {
  const path = format === 'pdf' ? ORB_TEMPLATES_API.exportPdf : ORB_TEMPLATES_API.exportDocx
  const response = await authFetchResponse(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return response
}

export async function generateOrbLearningFromAnswer(body: {
  answer_text: string
  session_type?: string
  topic?: string
}) {
  return authFetch<{ success?: boolean; data?: Record<string, unknown> }>(ORB_BILLING_API.learnFromAnswer, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}
