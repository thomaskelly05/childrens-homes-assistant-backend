export type StaffRole = 'admin' | 'responsible_individual' | 'provider' | 'manager' | 'deputy_manager' | 'support_worker' | 'viewer'

export type StaffUser = {
  id: number
  email: string
  role: StaffRole
  home_id?: number | null
  provider_id?: number | null
  first_name?: string | null
  last_name?: string | null
  is_active: boolean
  archived?: boolean
  allowed_home_ids?: number[]
  permissions: string[]
  subscription_active?: boolean | null
  subscription_status?: string | null
  plan_name?: string | null
  mfa_enabled?: boolean | null
  mfa_verified?: boolean | null
  has_passkeys?: boolean | null
}

export type AuthErrorDetail = {
  code?: string
  message?: string
  retry_after_seconds?: number
}

export type AuthMeResponse = {
  ok: boolean
  user: StaffUser
  mfa_mandatory?: boolean
}

export type LoginResponse = {
  ok: boolean
  authenticated: boolean
  message: string
  mfa_required?: boolean
  mfa_enabled?: boolean
  mfa_setup_required?: boolean
  mfa_mandatory?: boolean
  mfa_pending?: boolean
  user?: StaffUser
}
