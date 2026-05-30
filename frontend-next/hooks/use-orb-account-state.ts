'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/contexts/auth-context'
import { AuthApiError, isAuthFailureStatus } from '@/lib/auth/api'
import {
  readAdultProfile,
  roleLabelFor,
  type AdultProfile,
  type AdultProfileRole
} from '@/lib/orb/adult-profile-store'
import { fetchOrbAccess, type OrbAccessPayload } from '@/lib/orb/orb-billing-client'
import { fetchOrbPasskeyStatus } from '@/lib/orb/orb-passkey-client'
import { normaliseRole } from '@/lib/auth/permissions'
import type { StaffUser } from '@/lib/auth/types'

export const ORB_SIGN_IN_URL = '/orb/login?returnUrl=%2Forb'
export const ORB_ACCESS_URL = '/orb/access'

export type OrbProfileDisplayMode = 'local_profile' | 'signed_in_account'

export type OrbAccountState = {
  isLoading: boolean
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
  /** Set when signed in but /orb/standalone/access failed (403/503). */
  accessFetchStatus: number | null
  hasConfirmedAccess: boolean
  refresh: () => Promise<void>
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

export function useOrbAccountState(): OrbAccountState {
  const auth = useAuth()
  const [adultProfile, setAdultProfile] = useState<AdultProfile>(() => readAdultProfile())
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)
  const [hasPasskeys, setHasPasskeys] = useState(false)
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessFetchStatus, setAccessFetchStatus] = useState<number | null>(null)
  const refreshInFlight = useRef<Promise<void> | null>(null)

  const isAuthLoading = auth.status === 'loading'
  const hasBackendSession = auth.status === 'authenticated' && Boolean(auth.user)
  const isSignedIn = hasBackendSession
  const isLoading = isAuthLoading || (isSignedIn && accessLoading)
  const profileDisplayMode: OrbProfileDisplayMode = isSignedIn ? 'signed_in_account' : 'local_profile'

  const refreshAccessAndPasskeys = useCallback(async () => {
    if (!hasBackendSession || !auth.user) {
      setAccess(null)
      setAccessFetchStatus(null)
      setHasPasskeys(Boolean(auth.user?.has_passkeys))
      setAccessLoading(false)
      return
    }

    setAccessLoading(true)
    try {
      let accessPayload: OrbAccessPayload | null = null
      let accessStatus: number | null = null
      try {
        accessPayload = await fetchOrbAccess()
        accessStatus = null
      } catch (caught) {
        accessPayload = null
        accessStatus = caught instanceof AuthApiError ? caught.status : 503
      }

      const passkeyStatus = await fetchOrbPasskeyStatus().catch(() => null)
      setAccess(accessPayload)
      setAccessFetchStatus(accessStatus)
      setHasPasskeys(
        Boolean(passkeyStatus?.has_passkeys ?? auth.user.has_passkeys ?? passkeyStatus?.items?.length)
      )
    } finally {
      setAccessLoading(false)
    }
  }, [auth.user, hasBackendSession])

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current
    const run = async () => {
      setAdultProfile(readAdultProfile())
      await auth.refreshSession()
      await refreshAccessAndPasskeys()
    }
    refreshInFlight.current = run().finally(() => {
      refreshInFlight.current = null
    })
    return refreshInFlight.current
  }, [auth, refreshAccessAndPasskeys])

  useEffect(() => {
    setAdultProfile(readAdultProfile())
  }, [])

  useEffect(() => {
    if (auth.status === 'loading') return
    void refreshAccessAndPasskeys()
  }, [auth.status, auth.user?.id, refreshAccessAndPasskeys])

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
  const hasConfirmedAccess = isSignedIn && accessIsActive(access) && !isAuthFailureStatus(accessFetchStatus ?? 0)

  return {
    isLoading,
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
    hasConfirmedAccess,
    refresh,
    signInUrl: ORB_SIGN_IN_URL,
    accessUrl: ORB_ACCESS_URL
  }
}
