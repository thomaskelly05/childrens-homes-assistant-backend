'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/contexts/auth-context'
import { AuthApiError, isAuthFailureStatus, isTemporaryUnavailableStatus } from '@/lib/auth/api'
import {
  readAdultProfile,
  roleLabelFor,
  type AdultProfile,
  type AdultProfileRole
} from '@/lib/orb/adult-profile-store'
import { resetOrbAccessLoadingDeadline } from '@/lib/orb/orb-access-loading-deadline'
import {
  fetchOrbAccessCached,
  resetOrbAccessRequestCache
} from '@/lib/orb/orb-access-request-cache'
import { ORB_AUTH_LOADING_TIMEOUT_MS } from '@/lib/orb/orb-front-door-routing'
import type { OrbAccessPayload } from '@/lib/orb/orb-billing-client'
import {
  allowPasskeyStatusFetch,
  fetchPasskeyStatusCached
} from '@/lib/auth/passkey-status-cache'
import { recordOrbPasskeyStatusBootstrapRequest } from '@/lib/orb/orb-product-bootstrap-guard'
import { normaliseRole } from '@/lib/auth/permissions'
import type { StaffUser } from '@/lib/auth/types'

export const ORB_SIGN_IN_URL = '/orb'
export const ORB_ACCESS_URL = '/orb/billing'

export type OrbProfileDisplayMode = 'local_profile' | 'signed_in_account'

export type OrbAccessFailureKind =
  | 'none'
  | 'unauthorized'
  | 'payment_required'
  | 'safety_required'
  | 'rate_limited'
  | 'unavailable'
  | 'timeout'

export type OrbAccessStatus = 'idle' | 'loading' | 'ready' | 'error'

export type OrbAccountState = {
  isLoading: boolean
  /** Explicit access fetch lifecycle — hook never routes. */
  accessStatus: OrbAccessStatus
  accessError: string | null
  contractMismatch: boolean
  isSignedIn: boolean
  /** True when backend /auth/me succeeded; local adult profile alone does not count. */
  hasBackendSession: boolean
  profileDisplayMode: OrbProfileDisplayMode
  userEmail: string | null
  userName: string | null
  role: string | null
  roleLabel: string | null
  planName: string | null
  accessState: string | null
  subscriptionStatus: string | null
  trialEndsAt: string | null
  hasPasskeys: boolean
  adultProfile: AdultProfile
  access: OrbAccessPayload | null
  /** Set when signed in but /orb/standalone/access failed. */
  accessFetchStatus: number | null
  accessFailureKind: OrbAccessFailureKind
  hasConfirmedAccess: boolean
  /** null when signed out or access payload unavailable. */
  safetyAccepted: boolean | null
  adminBypass: boolean
  refresh: () => Promise<void>
  retry: () => Promise<void>
  loadPasskeyStatus: () => Promise<void>
  signInUrl: string
  accessUrl: string
}

const STAFF_ROLE_TO_ADULT: Partial<Record<string, AdultProfileRole>> = {
  support_worker: 'residential_support_worker',
  manager: 'registered_manager',
  deputy_manager: 'deputy_manager',
  responsible_individual: 'responsible_individual',
  provider: 'provider_director',
  admin: 'registered_manager',
  viewer: 'other',
  orb_residential: 'residential_support_worker'
}

function displayNameFromUser(user: StaffUser): string {
  const parts = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return parts || user.email
}

function mergeProfileWithAuthUser(profile: AdultProfile, user: StaffUser | null): AdultProfile {
  if (!user) return profile
  const authName = displayNameFromUser(user)
  const staffRole = normaliseRole(user.role)
  const mappedRole = STAFF_ROLE_TO_ADULT[staffRole] ?? profile.role
  const isDefaultProfile =
    !profile.name.trim() && profile.role === 'residential_support_worker' && profile.id === 'adult-default'
  return {
    ...profile,
    name: profile.name.trim() ? profile.name : authName,
    role: isDefaultProfile ? mappedRole : profile.role,
    roleLabel: isDefaultProfile ? roleLabelFor(mappedRole) : profile.roleLabel || roleLabelFor(profile.role)
  }
}

function accessIsActive(payload: OrbAccessPayload | null): boolean {
  if (!payload) return false
  return Boolean(
    payload.can_use_orb ||
      payload.subscription?.active ||
      payload.trial?.active
  )
}

function classifyAccessFailure(status: number, code?: string): OrbAccessFailureKind {
  if (status === 401) return 'unauthorized'
  if (status === 402) return 'payment_required'
  if (status === 403) {
    const normalized = (code || '').toLowerCase()
    if (normalized.includes('safety')) return 'safety_required'
    return 'payment_required'
  }
  if (status === 429) return 'rate_limited'
  if (status === 504) return 'timeout'
  if (isTemporaryUnavailableStatus(status) || status >= 500) return 'unavailable'
  return 'unavailable'
}

function isSafetyAcceptanceRequired(payload: OrbAccessPayload | null): boolean {
  if (!payload) return false
  if (payload.safety_accepted) return false
  const blocker = String((payload as { access_blocker?: string }).access_blocker || '').toLowerCase()
  if (blocker === 'safety_acceptance') return true
  const entitled =
    Boolean(payload.trial?.active) ||
    Boolean(payload.subscription?.active) ||
    payload.access_state === 'admin_bypass' ||
    payload.access_state === 'founding_plan_bypass'
  return entitled
}

type UseOrbAccountStateOptions = {
  accessProbeEnabled?: boolean
  initialAccess?: OrbAccessPayload | null
}

/** Internal hook — consume via OrbAccountStateProvider / useOrbAccountState from context. */
export function useOrbAccountStateInternal(options: UseOrbAccountStateOptions = {}): OrbAccountState {
  const accessProbeEnabled = options.accessProbeEnabled ?? true
  const auth = useAuth()
  const [adultProfile, setAdultProfile] = useState<AdultProfile>(() => readAdultProfile())
  const [access, setAccess] = useState<OrbAccessPayload | null>(options.initialAccess ?? null)
  const [hasPasskeys, setHasPasskeys] = useState(false)
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessFetchStatus, setAccessFetchStatus] = useState<number | null>(null)
  const [accessFailureKind, setAccessFailureKind] = useState<OrbAccessFailureKind>('none')
  const [accessError, setAccessError] = useState<string | null>(null)
  const [contractMismatch, setContractMismatch] = useState(false)
  const refreshInFlight = useRef<Promise<void> | null>(null)
  const accessInFlight = useRef<Promise<void> | null>(null)

  const isAuthLoading = auth.status === 'loading'
  const hasBackendSession = auth.status === 'authenticated' && Boolean(auth.user)
  const isSignedIn = hasBackendSession
  const isLoading = isAuthLoading || (isSignedIn && accessLoading)
  const accessStatus: OrbAccessStatus = !isSignedIn
    ? 'idle'
    : accessLoading
      ? 'loading'
      : accessFailureKind !== 'none' || contractMismatch
        ? 'error'
        : 'ready'
  const profileDisplayMode: OrbProfileDisplayMode = isSignedIn ? 'signed_in_account' : 'local_profile'

  const refreshAccessAndPasskeys = useCallback(
    async (options?: { force?: boolean }) => {
      if (!hasBackendSession || !auth.user) {
        setAccess(null)
        setAccessFetchStatus(null)
        setAccessFailureKind('none')
        setHasPasskeys(Boolean(auth.user?.has_passkeys))
        setAccessLoading(false)
        return
      }

      if (accessInFlight.current && !options?.force) {
        return accessInFlight.current
      }

      const run = async () => {
        const sessionUser = auth.user
        if (!sessionUser) return

        setAccessLoading(true)
        setAccessFailureKind('none')
        setAccessError(null)
        setContractMismatch(false)
        let accessTimeoutId: ReturnType<typeof setTimeout> | undefined
        try {
          let accessPayload: OrbAccessPayload | null = null
          let httpStatus: number | null = null
          let failureKind: OrbAccessFailureKind = 'none'
          let errorMessage: string | null = null
          let mismatch = false
          try {
            const accessTimeout = new Promise<never>((_, reject) => {
              accessTimeoutId = setTimeout(() => {
                reject(new AuthApiError(504, { code: 'access_timeout', message: 'ORB access check timed out' }))
              }, ORB_AUTH_LOADING_TIMEOUT_MS)
            })
            accessPayload = await Promise.race([
              fetchOrbAccessCached({ force: options?.force, reason: 'account_state' }),
              accessTimeout
            ])
            httpStatus = null
            failureKind = 'none'
            resetOrbAccessLoadingDeadline()
          } catch (caught) {
            accessPayload = null
            if (caught instanceof AuthApiError) {
              httpStatus = caught.status
              if (caught.code === 'access_contract_mismatch') {
                mismatch = true
                failureKind = 'unavailable'
                errorMessage = caught.message
              } else {
                failureKind = classifyAccessFailure(caught.status, caught.code)
                errorMessage = caught.message
              }
            } else {
              httpStatus = 503
              failureKind = 'unavailable'
              errorMessage = 'ORB access could not be verified'
            }
          }

          setAccess(accessPayload)
          setAccessFetchStatus(httpStatus)
          setAccessFailureKind(failureKind)
          setAccessError(errorMessage)
          setContractMismatch(mismatch)
          setHasPasskeys(Boolean(sessionUser.has_passkeys))
        } finally {
          if (accessTimeoutId) clearTimeout(accessTimeoutId)
          setAccessLoading(false)
        }
      }

      accessInFlight.current = run().finally(() => {
        accessInFlight.current = null
      })
      return accessInFlight.current
    },
    [auth.user, hasBackendSession]
  )

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current
    const run = async () => {
      resetOrbAccessLoadingDeadline()
      resetOrbAccessRequestCache('refresh')
      setAdultProfile(readAdultProfile())
      await auth.refreshSession()
      await refreshAccessAndPasskeys({ force: true })
    }
    refreshInFlight.current = run().finally(() => {
      refreshInFlight.current = null
    })
    return refreshInFlight.current
  }, [auth, refreshAccessAndPasskeys])

  const retry = useCallback(async () => {
    resetOrbAccessLoadingDeadline()
    resetOrbAccessRequestCache('retry')
    await refreshAccessAndPasskeys({ force: true })
  }, [refreshAccessAndPasskeys])

  const loadPasskeyStatus = useCallback(async () => {
    const user = auth.user
    if (!user) return
    allowPasskeyStatusFetch('settings')
    recordOrbPasskeyStatusBootstrapRequest()
    const passkeyStatus = await fetchPasskeyStatusCached()
    setHasPasskeys(Boolean(passkeyStatus?.has_passkeys ?? user.has_passkeys ?? passkeyStatus?.items?.length))
  }, [auth.user])

  useEffect(() => {
    setAdultProfile(readAdultProfile())
  }, [])

  useEffect(() => {
    if (!accessProbeEnabled) return
    if (auth.status === 'loading') return
    if (auth.status === 'unauthenticated') {
      resetOrbAccessRequestCache('signed_out')
      setAccess(null)
      setAccessFetchStatus(null)
      setAccessFailureKind('none')
      setAccessLoading(false)
      setHasPasskeys(false)
      return
    }
    if (options.initialAccess && access && !accessLoading) {
      return
    }
    void refreshAccessAndPasskeys()
  }, [
    access,
    accessLoading,
    accessProbeEnabled,
    auth.status,
    auth.user?.id,
    options.initialAccess,
    refreshAccessAndPasskeys
  ])

  const mergedProfile = useMemo(
    () => mergeProfileWithAuthUser(adultProfile, isSignedIn ? auth.user : null),
    [adultProfile, auth.user, isSignedIn]
  )

  const userEmail = isSignedIn ? auth.user?.email ?? null : null
  const userName = isSignedIn && auth.user ? displayNameFromUser(auth.user) : null
  const role = isSignedIn ? auth.user?.role ?? null : null
  const roleLabel = isSignedIn ? mergedProfile.roleLabel : null

  const planName = isSignedIn
    ? access?.subscription?.plan_name?.trim() ||
      auth.user?.plan_name?.trim() ||
      (access?.trial?.active ? 'ORB trial' : null)
    : null

  const accessState = isSignedIn ? access?.access_state ?? null : null
  const subscriptionStatus = isSignedIn
    ? access?.subscription?.status ?? auth.user?.subscription_status ?? null
    : null
  const trialEndsAt = isSignedIn ? access?.trial?.expires_at ?? null : null
  const safetyAccepted = isSignedIn && access ? Boolean(access.safety_accepted) : isSignedIn ? false : null
  const safetyRequired = isSignedIn && isSafetyAcceptanceRequired(access)
  const hasConfirmedAccess =
    isSignedIn &&
    accessIsActive(access) &&
    !isAuthFailureStatus(accessFetchStatus ?? 0) &&
    accessFailureKind === 'none' &&
    !safetyRequired
  const adminBypass = isSignedIn && access?.access_state === 'admin_bypass'

  return {
    isLoading,
    accessStatus,
    accessError,
    contractMismatch,
    isSignedIn,
    hasBackendSession,
    profileDisplayMode,
    userEmail,
    userName,
    role,
    roleLabel,
    planName,
    accessState,
    subscriptionStatus,
    trialEndsAt,
    hasPasskeys,
    adultProfile: mergedProfile,
    access,
    accessFetchStatus,
    accessFailureKind,
    hasConfirmedAccess,
    safetyAccepted,
    adminBypass,
    refresh,
    retry,
    loadPasskeyStatus,
    signInUrl: ORB_SIGN_IN_URL,
    accessUrl: ORB_ACCESS_URL
  }
}
