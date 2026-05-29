import { authFetch, authFetchResponse } from '@/lib/auth/api'

export type OrbPasskeyUser = {
  id?: number | string
  email?: string
  role?: string
  home_id?: number | null
  subscription_active?: boolean
  subscription_status?: string
  plan_name?: string | null
  mfa_enabled?: boolean
  mfa_verified?: boolean
  mfa_pending?: boolean
  has_passkeys?: boolean
}

export type OrbPasskeyVerifyResponse = {
  ok?: boolean
  authenticated?: boolean
  message?: string
  user?: OrbPasskeyUser
}

export type OrbPasskeyListResponse = {
  ok?: boolean
  has_passkeys?: boolean
  should_prompt_register?: boolean
  items?: Array<{
    id: number
    nickname?: string | null
    created_at?: string | null
    last_used_at?: string | null
    transports?: string | null
  }>
}

type JsonPublicKeyCredential = PublicKeyCredential & {
  toJSON: () => unknown
}

type PublicKeyCredentialJsonParsers = typeof PublicKeyCredential & {
  parseRequestOptionsFromJSON?: (options: unknown) => PublicKeyCredentialRequestOptions
  parseCreationOptionsFromJSON?: (options: unknown) => PublicKeyCredentialCreationOptions
}

export function orbPasskeysSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.credentials
}

function requirePasskeySupport() {
  if (!orbPasskeysSupported()) {
    throw new Error('Face ID, Touch ID or passkeys are not available on this device or browser.')
  }
}

function passkeyParsers(): PublicKeyCredentialJsonParsers {
  return PublicKeyCredential as PublicKeyCredentialJsonParsers
}

function parseRequestOptions(options: unknown): PublicKeyCredentialRequestOptions {
  const parsers = passkeyParsers()
  if (typeof parsers.parseRequestOptionsFromJSON === 'function') {
    return parsers.parseRequestOptionsFromJSON(options)
  }
  return options as PublicKeyCredentialRequestOptions
}

function parseCreationOptions(options: unknown): PublicKeyCredentialCreationOptions {
  const parsers = passkeyParsers()
  if (typeof parsers.parseCreationOptionsFromJSON === 'function') {
    return parsers.parseCreationOptionsFromJSON(options)
  }
  return options as PublicKeyCredentialCreationOptions
}

function credentialToJson(credential: Credential | null): unknown {
  if (!credential) throw new Error('Passkey was cancelled.')
  const maybePublic = credential as Partial<JsonPublicKeyCredential>
  if (typeof maybePublic.toJSON === 'function') return maybePublic.toJSON()
  throw new Error('This browser cannot serialise passkey credentials.')
}

export async function beginOrbPasskeyLogin(email: string): Promise<OrbPasskeyVerifyResponse> {
  requirePasskeySupport()
  const cleanedEmail = String(email || '').trim().toLowerCase()
  if (!cleanedEmail) throw new Error('Enter your email address to use Face ID, Touch ID or passkey sign-in.')

  const optionsPayload = await authFetch<{ ok?: boolean; options?: unknown }>('/auth/passkeys/authenticate/options', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanedEmail })
  })

  if (!optionsPayload?.ok || !optionsPayload.options) {
    throw new Error('Could not start passkey sign-in.')
  }

  const credential = await navigator.credentials.get({
    publicKey: parseRequestOptions(optionsPayload.options)
  })

  const verifyPayload = await authFetch<OrbPasskeyVerifyResponse>('/auth/passkeys/authenticate/verify', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: credentialToJson(credential) })
  })

  if (!verifyPayload?.ok) {
    throw new Error(verifyPayload?.message || 'Passkey sign-in failed.')
  }

  return verifyPayload
}

export async function registerOrbPasskey(nickname = 'My passkey') {
  requirePasskeySupport()

  const optionsPayload = await authFetch<{ ok?: boolean; options?: unknown }>('/auth/passkeys/register/options', {
    method: 'POST',
    credentials: 'include'
  })

  if (!optionsPayload?.ok || !optionsPayload.options) {
    throw new Error('Could not start passkey setup.')
  }

  const credential = await navigator.credentials.create({
    publicKey: parseCreationOptions(optionsPayload.options)
  })

  return authFetch<{ ok?: boolean; message?: string; has_passkeys?: boolean }>('/auth/passkeys/register/verify', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: credentialToJson(credential), nickname })
  })
}

export async function fetchOrbPasskeyStatus(): Promise<OrbPasskeyListResponse> {
  return authFetch<OrbPasskeyListResponse>('/auth/passkeys/status', { credentials: 'include' })
}

export async function fetchOrbPasskeys(): Promise<OrbPasskeyListResponse> {
  return authFetch<OrbPasskeyListResponse>('/auth/passkeys', { credentials: 'include' })
}

export async function deleteOrbPasskey(passkeyId: number) {
  const response = await authFetchResponse(`/auth/passkeys/${passkeyId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!response.ok) {
    throw new Error('Could not remove passkey.')
  }
  return response.json()
}
