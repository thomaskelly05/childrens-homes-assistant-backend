'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CreditCard,
  Database,
  LogOut,
  Mic,
  Settings,
  Shield,
  Sparkles
} from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { fetchOrbAccess, type OrbAccessPayload } from '@/lib/orb/orb-billing-client'
import type { AdultProfile } from '@/lib/orb/adult-profile-store'
import { ORB_RESIDENTIAL_PRODUCT_NAME } from '@/lib/orb/orb-residential-copy'

export function OrbAccountModal({
  open,
  onClose,
  profile,
  userEmail,
  onOpenSettings,
  onOpenBilling,
  onOpenVoiceSettings,
  onLogOut,
  passkeyEnabled,
  projectCount = 0,
  savedOutputsCount = 0
}: {
  open: boolean
  onClose: () => void
  profile: AdultProfile | null
  userEmail?: string | null
  onOpenSettings: () => void
  onOpenBilling: () => void
  onOpenVoiceSettings?: () => void
  onLogOut?: () => void
  passkeyEnabled?: boolean
  projectCount?: number
  savedOutputsCount?: number
}) {
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)

  useEffect(() => {
    if (!open) return
    void fetchOrbAccess()
      .then(setAccess)
      .catch(() => setAccess(null))
  }, [open])

  const displayName = profile?.name?.trim() || 'Your account'
  const email = userEmail?.trim() || null

  const subscriptionLabel = useMemo(() => {
    if (access?.subscription?.status) return access.subscription.status
    if (access?.trial?.active) return 'Trial active'
    if (access?.can_use_orb) return 'Subscribed'
    return 'Inactive'
  }, [access])

  const statusChips = [
    { id: 'signed-in', label: 'Signed in', show: Boolean(onLogOut) },
    { id: 'plan', label: subscriptionLabel, show: true },
    { id: 'passkey', label: passkeyEnabled ? 'Passkey enabled' : 'Passkey not set', show: true },
    ...(profile?.roleLabel ? [{ id: 'role', label: profile.roleLabel, show: true }] : [])
  ]

  return (
    <OrbAppModal
      open={open}
      title="Account"
      subtitle={ORB_RESIDENTIAL_PRODUCT_NAME}
      onClose={onClose}
      panelId="account"
      size="standard"
    >
      <div className="space-y-5 p-4" data-orb-account-modal>
        <div className="rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-4 py-4">
          <p className="text-lg font-semibold text-[var(--orb-foreground)]" data-orb-account-name>
            {displayName}
          </p>
          {email ? (
            <p className="mt-0.5 text-sm text-[var(--orb-muted)]" data-orb-account-email>
              {email}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-[#5ec8ff]/90">ORB Residential account</p>
          <div className="mt-3 flex flex-wrap gap-1.5" data-orb-account-status-chips>
            {statusChips
              .filter((chip) => chip.show)
              .map((chip) => (
                <span
                  key={chip.id}
                  className="rounded-full border border-[var(--orb-line)]/50 bg-[var(--orb-surface-hover)] px-2.5 py-0.5 text-[10px] font-medium capitalize text-[var(--orb-foreground)]"
                  data-orb-account-chip={chip.id}
                >
                  {chip.label}
                </span>
              ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs" data-orb-account-stats>
          <div className="rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--orb-muted)]">Plan</p>
            <p className="mt-0.5 font-semibold capitalize text-[var(--orb-foreground)]" data-orb-account-subscription>
              {subscriptionLabel}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--orb-muted)]">Projects</p>
            <p className="mt-0.5 font-semibold text-[var(--orb-foreground)]" data-orb-account-project-count>
              {projectCount}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--orb-muted)]">Saved outputs</p>
            <p className="mt-0.5 font-semibold text-[var(--orb-foreground)]" data-orb-account-saved-count>
              {savedOutputsCount}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--orb-muted)]">Passkeys</p>
            <p className="mt-0.5 font-semibold text-[var(--orb-foreground)]" data-orb-account-passkey>
              {passkeyEnabled ? 'On' : 'Off'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1" data-orb-account-quick-actions>
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
            Quick actions
          </p>
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenSettings()
            }}
            className="orb-sidebar-nav-item w-full justify-start rounded-xl px-3 py-2.5"
            data-orb-account-settings
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenBilling()
            }}
            className="orb-sidebar-nav-item w-full justify-start rounded-xl px-3 py-2.5"
            data-orb-account-billing
          >
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </button>
          {onOpenVoiceSettings ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenVoiceSettings()
              }}
              className="orb-sidebar-nav-item w-full justify-start rounded-xl px-3 py-2.5"
              data-orb-account-voice-settings
            >
              <Mic className="h-4 w-4" />
              <span>Voice settings</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenSettings()
            }}
            className="orb-sidebar-nav-item w-full justify-start rounded-xl px-3 py-2.5"
            data-orb-account-privacy
          >
            <Database className="h-4 w-4" />
            <span>Data &amp; privacy</span>
          </button>
          {onLogOut ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onLogOut()
              }}
              className="orb-sidebar-nav-item w-full justify-start rounded-xl px-3 py-2.5 text-red-300 hover:text-red-200"
              data-orb-account-logout
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          ) : (
            <a
              href="/orb/login"
              className="orb-sidebar-nav-item w-full justify-start rounded-xl px-3 py-2.5"
              data-orb-account-sign-in
            >
              <Shield className="h-4 w-4" />
              <span>Sign in</span>
            </a>
          )}
        </div>

        <p className="flex items-center gap-2 px-1 text-[10px] leading-4 text-[var(--orb-muted)]">
          <Sparkles className="h-3.5 w-3.5 text-[#5ec8ff]" aria-hidden />
          Powered by IndiCare Intelligence
        </p>
      </div>
    </OrbAppModal>
  )
}
