'use client'

import type { AdultProfileRole } from '@/lib/orb/adult-profile-store'
import { readAdultProfile, writeAdultProfile } from '@/lib/orb/adult-profile-store'

const AVATAR_STORAGE_KEY = 'orb-residential-user-avatar-v1'

export type OrbResidentialUserProfile = {
  displayName: string
  role: AdultProfileRole
  roleLabel: string
  avatarDataUrl: string | null
  updatedAt?: string
}

export function readOrbResidentialUserProfile(): OrbResidentialUserProfile {
  const adult = readAdultProfile()
  let avatarDataUrl: string | null = null
  if (typeof window !== 'undefined') {
    try {
      avatarDataUrl = window.localStorage.getItem(AVATAR_STORAGE_KEY)
    } catch {
      avatarDataUrl = null
    }
  }
  return {
    displayName: adult.name?.trim() || '',
    role: adult.role,
    roleLabel: adult.roleLabel?.trim() || '',
    avatarDataUrl,
    updatedAt: adult.updatedAt ? new Date(adult.updatedAt).toISOString() : undefined
  }
}

export function saveOrbResidentialUserProfile(
  patch: Partial<OrbResidentialUserProfile>
): OrbResidentialUserProfile {
  const current = readOrbResidentialUserProfile()
  const next: OrbResidentialUserProfile = {
    ...current,
    ...patch
  }
  const adult = readAdultProfile()
  writeAdultProfile({
    ...adult,
    name: next.displayName.trim() || adult.name,
    role: next.role,
    roleLabel: next.roleLabel.trim() || adult.roleLabel
  })
  if (typeof window !== 'undefined') {
    try {
      if (next.avatarDataUrl) {
        window.localStorage.setItem(AVATAR_STORAGE_KEY, next.avatarDataUrl)
      } else {
        window.localStorage.removeItem(AVATAR_STORAGE_KEY)
      }
    } catch {
      // local avatar optional
    }
  }
  return { ...next, updatedAt: new Date().toISOString() }
}
