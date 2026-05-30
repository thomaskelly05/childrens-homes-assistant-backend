import { authFetch, authFetchResponse } from '@/lib/auth/api'
import {
  extractPasskeyOptionsPayload,
  parseOrbPasskeyCreationOptions,
  parseOrbPasskeyRequestOptions
} from '@/lib/orb/orb-passkey-options'

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

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i])
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function viewToArrayBuffer(view: ArrayBufferView): ArrayBuffer {
  const copy = new Uint8Array(view.byteLength)
  copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
  return copy.buffer
}

function normaliseCredentialJson(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  if (value instanceof ArrayBuffer) return bufferToBase64Url(value)
  if (ArrayBuffer.isView(value)) return bufferToBase64Url(viewToArrayBuffer(value))
  if (Array.isArray(value)) return value.map(normaliseCredentialJson)
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normaliseCredentialJson(item)])
  )
}

function wrapPasskeyUserAbort(error: unknown, cancelledMessage: string): Error {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return new Error(cancelledMessage)
  }
  if (error instanceof Error) return error
  return new Error(String(error))
}

function credentialToJson(credential: Credential | null): unknown {
  if (!credential) throw new Error('Passkey was cancelled.')
  const maybePublic = credential as Partial<JsonPublicKeyCredential>
  if (typeof maybePublic.toJSON === 'function') return maybePublic.toJSON()
  return normaliseCredentialJson(credential)
}

export function orbPasskeysSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.credentials
}

function requirePasskeySupport() {
  if (!orbPasskeysSupported()) {
    throw new Error('Face ID, Touch ID or passkeys are not available on this device or browser.')
  }
}

export async function beginOrbPasskeyLogin(email: string): Promise<OrbPasskeyVerifyResponse> {
  requirePasskeySupport()
  const cleanedEmail = String(email || '').trim().toLowerCase()
  if (!cleanedEmail) throw new Error('Enter your email address to use Face ID, Touch ID or passkey sign-in.')

  const optionsPayload = await authFetch<{ ok?: boolean; options?: unknown; publicKey?: unknown; public_key?: unknown }>(
    '/auth/passkeys/authenticate/options',
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanedEmail })
    }
  )

  const rawOptions = extractPasskeyOptionsPayload(optionsPayload)
  if (!optionsPayload?.ok || rawOptions === null) {
    throw new Error('Could not start passkey sign-in. Check that a passkey is set up for this email address.')
  }

  let credential: Credential | null
  try {
    credential = await navigator.credentials.get({
      publicKey: parseOrbPasskeyRequestOptions(rawOptions)
    })
  } catch (caught) {
    throw wrapPasskeyUserAbort(caught, 'Passkey sign-in was cancelled or timed out.')
  }

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

  const optionsPayload = await authFetch<{ ok?: boolean; options?: unknown; publicKey?: unknown; public_key?: unknown }>(
    '/auth/passkeys/register/options',
    {
      method: 'POST',
      credentials: 'include'
    }
  )

  const rawOptions = extractPasskeyOptionsPayload(optionsPayload)
  if (!optionsPayload?.ok || rawOptions === null) {
    throw new Error('Could not start passkey setup.')
  }

  let credential: Credential | null
  try {
    credential = await navigator.credentials.create({
      publicKey: parseOrbPasskeyCreationOptions(rawOptions)
    })
  } catch (caught) {
    throw wrapPasskeyUserAbort(caught, 'Passkey setup was cancelled or timed out.')
  }

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
