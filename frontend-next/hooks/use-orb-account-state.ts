'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/contexts/auth-context'
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

export type OrbAccountState = {
  isLoading: boolean
  isSignedIn: boolean
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

export function useOrbAccountState(): OrbAccountState {
  const auth = useAuth()
  const [adultProfile, setAdultProfile] = useState<AdultProfile>(() => readAdultProfile())
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)
  const [hasPasskeys, setHasPasskeys] = useState(false)
  const [accessLoading, setAccessLoading] = useState(false)
  const refreshInFlight = useRef<Promise<void> | null>(null)

  const isAuthLoading = auth.status === 'loading'
  const isSignedIn = auth.status === 'authenticated' && Boolean(auth.user)
  const isLoading = isAuthLoading || (isSignedIn && accessLoading)

  const refreshAccessAndPasskeys = useCallback(async () => {
    if (auth.status !== 'authenticated' || !auth.user) {
      setAccess(null)
      setHasPasskeys(Boolean(auth.user?.has_passkeys))
      setAccessLoading(false)
      return
    }

    setAccessLoading(true)
    try {
      const [accessPayload, passkeyStatus] = await Promise.all([
        fetchOrbAccess().catch(() => null),
        fetchOrbPasskeyStatus().catch(() => null)
      ])
      setAccess(accessPayload)
      setHasPasskeys(
        Boolean(passkeyStatus?.has_passkeys ?? auth.user.has_passkeys ?? passkeyStatus?.items?.length)
      )
    } finally {
      setAccessLoading(false)
    }
  }, [auth.status, auth.user])

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

  const planName =
    access?.subscription?.plan_name?.trim() ||
    auth.user?.plan_name?.trim() ||
    (access?.trial?.active ? 'ORB trial' : null)

  const accessState = access?.access_state ?? null
  const subscriptionStatus = access?.subscription?.status ?? auth.user?.subscription_status ?? null
  const trialEndsAt = access?.trial?.expires_at ?? null

  return {
    isLoading,
    isSignedIn,
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
    refresh,
    signInUrl: ORB_SIGN_IN_URL,
    accessUrl: ORB_ACCESS_URL
  }
}
