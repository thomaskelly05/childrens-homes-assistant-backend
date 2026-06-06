'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { OrbAuthGate } from '@/components/orb-residential/orb-auth-gate'
import { OrbAdultProfileDrawer } from '@/components/orb-standalone/orb-adult-profile-drawer'
import { readAdultProfile, type AdultProfile } from '@/lib/orb/adult-profile-store'
import { cognitionLabelForMode } from '@/lib/orb/residential-agents'
import { agentById } from '@/lib/orb/residential-agents'

export default function OrbProfileSettingsPage() {
  const [profile, setProfile] = useState<AdultProfile | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(true)

  useEffect(() => {
    setProfile(readAdultProfile())
  }, [])

  if (!profile) {
    return (
      <OrbAuthGate mode="product">
        <main className="flex min-h-dvh items-center justify-center bg-[var(--orb-bg-deep)] text-[var(--orb-foreground)]">
          <p className="text-sm text-[var(--orb-muted)]">Loading profile…</p>
        </main>
      </OrbAuthGate>
    )
  }

  const agent = agentById(profile.preferredAgent)

  return (
    <OrbAuthGate mode="product">
    <main className="min-h-dvh bg-[var(--orb-bg-deep)] text-[var(--orb-foreground)]" data-orb-profile-page>
      <div className="mx-auto max-w-lg px-5 py-8">
        <Link href="/orb" className="text-sm text-[var(--orb-accent)] hover:underline">
          ← Back to ORB
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Your adult profile</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--orb-muted)]">
          Profile shapes ORB tone, reasoning depth and workspace defaults. It does not access IndiCare OS records.
        </p>
        <dl className="mt-8 space-y-4 rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-5 text-sm">
          <div>
            <dt className="text-[var(--orb-muted)]">Name</dt>
            <dd className="font-medium">{profile.name || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-[var(--orb-muted)]">Role</dt>
            <dd className="font-medium">{profile.roleLabel}</dd>
          </div>
          <div>
            <dt className="text-[var(--orb-muted)]">Home</dt>
            <dd className="font-medium">{profile.homeName || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-[var(--orb-muted)]">Preferred agent</dt>
            <dd className="font-medium">{agent.title}</dd>
          </div>
          <div>
            <dt className="text-[var(--orb-muted)]">Cognition</dt>
            <dd className="font-medium">{cognitionLabelForMode(agent.mode)}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mt-6 w-full rounded-xl bg-[var(--orb-accent)] py-3 text-sm font-semibold text-[var(--orb-on-accent)]"
        >
          Edit profile
        </button>
      </div>
      <OrbAdultProfileDrawer
        open={drawerOpen}
        profile={profile}
        cognitionModeLabel={agent.cognitionLabel}
        onClose={() => setDrawerOpen(false)}
        onSave={setProfile}
      />
    </main>
    </OrbAuthGate>
  )
}
