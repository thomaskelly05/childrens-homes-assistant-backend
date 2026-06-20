'use client'

import { useEffect, useState } from 'react'

import { OrbUserAvatar } from '@/components/orb-residential/orb-user-avatar'
import type { AdultProfileRole } from '@/lib/orb/adult-profile-store'
import { CANONICAL_ADULT_PROFILE_ROLES, roleLabelFor } from '@/lib/orb/adult-profile-store'
import {
  readOrbResidentialUserProfile,
  saveOrbResidentialUserProfile
} from '@/lib/orb/orb-residential-user-profile'

export function OrbResidentialProfileSettingsSection({
  authName,
  authAvatarUrl
}: {
  authName?: string | null
  authAvatarUrl?: string | null
}) {
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<AdultProfileRole>('residential_support_worker')
  const [roleLabel, setRoleLabel] = useState('')
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    const profile = readOrbResidentialUserProfile()
    setDisplayName(profile.displayName || authName?.trim() || '')
    setRole(profile.role)
    setRoleLabel(profile.roleLabel)
    setAvatarDataUrl(profile.avatarDataUrl)
  }, [authName, authAvatarUrl])

  function handleSave() {
    saveOrbResidentialUserProfile({
      displayName,
      role,
      roleLabel,
      avatarDataUrl
    })
    setSavedMessage('Profile saved on this device.')
    window.setTimeout(() => setSavedMessage(null), 3000)
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 512_000) {
      setSavedMessage('Choose an image under 500KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatarDataUrl(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const previewAvatar = avatarDataUrl || authAvatarUrl || null

  return (
    <section className="space-y-4" data-orb-settings-profile-section>
      <div>
        <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Profile</h3>
        <p className="mt-1 text-xs text-[var(--orb-muted)]">
          Edit how you appear in ORB Residential. Saved locally on this device until backend sync is available.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <OrbUserAvatar name={displayName || authName || 'User'} avatarUrl={previewAvatar} size="md" />
        <label className="inline-flex cursor-pointer rounded-lg border border-[var(--orb-line)] px-3 py-2 text-xs font-medium text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]">
          Change photo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleAvatarChange}
            data-orb-settings-profile-avatar-input
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--orb-foreground)]">Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2 text-sm"
          data-orb-settings-profile-name
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--orb-foreground)]">Role</span>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as AdultProfileRole)}
          className="w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2 text-sm"
          data-orb-settings-profile-role
        >
          {CANONICAL_ADULT_PROFILE_ROLES.map((option) => (
            <option key={option} value={option}>
              {roleLabelFor(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--orb-foreground)]">Role label (optional)</span>
        <input
          type="text"
          value={roleLabel}
          onChange={(event) => setRoleLabel(event.target.value)}
          placeholder="e.g. Senior residential support worker"
          className="w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2 text-sm"
          data-orb-settings-profile-role-label
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-[var(--orb-res-navy,#0f172a)] px-4 py-2 text-sm font-semibold text-white"
          data-orb-settings-profile-save
        >
          Save profile
        </button>
        {savedMessage ? (
          <p className="text-xs text-[var(--orb-muted)]" role="status" data-orb-settings-profile-saved>
            {savedMessage}
          </p>
        ) : null}
      </div>
    </section>
  )
}
