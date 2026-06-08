'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CreditCard,
  Database,
  LogOut,
  Mic,
  Save,
  Settings,
  Shield,
  Sparkles
} from 'lucide-react'

import { OrbUserAvatar } from '@/components/orb-residential/orb-user-avatar'
import { getOrbBillingDisplayStatus } from '@/lib/orb/orb-billing-display'
import { orbOverlayDrawerShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import { fetchOrbAccess, type OrbAccessPayload } from '@/lib/orb/orb-billing-client'
import type { AdultProfile } from '@/lib/orb/adult-profile-store'
import { ORB_RESIDENTIAL_PRODUCT_NAME } from '@/lib/orb/orb-residential-copy'

export function OrbAccountModal({
  open,
  onClose,
  profile,
  userEmail,
  avatarUrl,
  onOpenSettings,
  onOpenBilling,
  onOpenVoiceSettings,
  onOpenSavedOutputs,
  onLogOut,
  passkeyEnabled,
  projectCount = 0,
  savedOutputsCount = 0,
  localContentMode = false,
  subscriptionActive = false,
  adminBypass = false,
  realtimeVoiceEnabled = false,
  safetyAccepted = null,
  role = null
}: {
  open: boolean
  onClose: () => void
  profile: AdultProfile | null
  userEmail?: string | null
  avatarUrl?: string | null
  onOpenSettings: () => void
  onOpenBilling: () => void
  onOpenVoiceSettings?: () => void
  onOpenSavedOutputs?: () => void
  onLogOut?: () => void
  passkeyEnabled?: boolean
  projectCount?: number
  savedOutputsCount?: number
  localContentMode?: boolean
  subscriptionActive?: boolean
  adminBypass?: boolean
  realtimeVoiceEnabled?: boolean
  safetyAccepted?: boolean | null
  role?: string | null
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
  const isSignedIn = Boolean(onLogOut || userEmail?.trim() || adminBypass)

  const billingDisplay = useMemo(() => getOrbBillingDisplayStatus(access), [access])

  const subscriptionLabel = useMemo(() => {
    if (adminBypass && realtimeVoiceEnabled) return 'Admin · voice enabled'
    return billingDisplay.subscriptionLabel
  }, [adminBypass, billingDisplay.subscriptionLabel, realtimeVoiceEnabled])

  const planLabel =
    access?.subscription?.plan_name?.trim() ||
    (billingDisplay.showTrialChip ? 'ORB trial' : 'ORB Residential — Individual')

  const statusChips = [
    { id: 'signed-in', label: 'Signed in', show: isSignedIn, tone: 'neutral' as const },
    { id: 'plan', label: subscriptionLabel, show: true, tone: subscriptionActive ? ('success' as const) : ('warn' as const) },
    {
      id: 'safety',
      label: safetyAccepted ? 'Safety accepted' : safetyAccepted === false ? 'Safety pending' : 'Safety status unknown',
      show: isSignedIn,
      tone: safetyAccepted ? ('success' as const) : ('warn' as const)
    },
    {
      id: 'voice',
      label: realtimeVoiceEnabled ? 'Voice ready' : 'Voice settings available',
      show: true,
      tone: 'neutral' as const
    },
    { id: 'passkey', label: passkeyEnabled ? 'Passkey on' : 'Passkey off', show: true, tone: 'neutral' as const },
    ...(profile?.roleLabel ? [{ id: 'role', label: profile.roleLabel, show: true as const, tone: 'neutral' as const }] : []),
    ...(role ? [{ id: 'org-role', label: role.replace(/_/g, ' '), show: true as const, tone: 'neutral' as const }] : [])
  ]

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Account"
      subtitle={ORB_RESIDENTIAL_PRODUCT_NAME}
      onClose={onClose}
      panelId="account"
      ariaLabel="ORB account"
      {...orbOverlayDrawerShellProps('wide')}
    >
      <div className="space-y-4 p-3 sm:p-4" data-orb-account-modal>
        <div className="orb-studio-modal-section orb-mobile-workspace-card rounded-2xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-3 py-4 sm:px-4">
          <div className="flex items-start gap-3">
            <OrbUserAvatar name={displayName} avatarUrl={avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-[var(--orb-foreground)]" data-orb-account-name>
                {displayName}
              </p>
              {email ? (
                <p className="mt-0.5 text-sm text-[var(--orb-muted)]" data-orb-account-email>
                  {email}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-[var(--orb-res-primary,#1677ff)]">ORB Residential account</p>
            </div>
          </div>

          {!subscriptionActive && isSignedIn ? (
            <p
              className="mt-3 rounded-lg border border-[var(--orb-res-warning-border,#fbbf24)] bg-[var(--orb-res-warning-bg,#fffbeb)] px-3 py-2 text-xs leading-5 text-[var(--orb-res-warning-text,#92400e)]"
              data-orb-account-inactive
            >
              Your ORB Residential subscription is not active. Start a free trial or subscribe to unlock full access.
            </p>
          ) : null}

          {localContentMode ? (
            <p
              className="mt-2 rounded-lg border border-[var(--orb-res-info-border,#bfdbfe)] bg-[var(--orb-res-info-bg,#eff6ff)] px-3 py-2 text-xs leading-5 text-[var(--orb-res-info-text,#1e3a8a)]"
              data-orb-account-local-mode
            >
              Using local ORB content until your session reconnects. Projects, drafts and saved outputs on this device
              remain available.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-1.5" data-orb-account-status-chips>
            {statusChips
              .filter((chip) => chip.show)
              .map((chip) => (
                <span
                  key={chip.id}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${
                    chip.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : chip.tone === 'warn'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-[var(--orb-line)]/50 bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)]'
                  }`}
                  data-orb-account-chip={chip.id}
                >
                  {chip.label}
                </span>
              ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs sm:gap-3" data-orb-account-stats>
          <div className="orb-mobile-workspace-card rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-2.5 py-2.5 sm:px-3 sm:py-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--orb-muted)]">Current plan</p>
            <p className="mt-0.5 font-semibold capitalize text-[var(--orb-foreground)]" data-orb-account-plan>
              {planLabel}
            </p>
          </div>
          <div className="orb-mobile-workspace-card rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-2.5 py-2.5 sm:px-3 sm:py-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--orb-muted)]">Subscription</p>
            <p className="mt-0.5 font-semibold capitalize text-[var(--orb-foreground)]" data-orb-account-subscription>
              {subscriptionLabel}
            </p>
          </div>
          <div className="orb-mobile-workspace-card rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-2.5 py-2.5 sm:px-3 sm:py-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--orb-muted)]">Saved outputs</p>
            <p className="mt-0.5 font-semibold text-[var(--orb-foreground)]" data-orb-account-saved-count>
              {savedOutputsCount}
            </p>
          </div>
          <div className="orb-mobile-workspace-card rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--orb-muted)]">Projects</p>
            <p className="mt-0.5 font-semibold text-[var(--orb-foreground)]" data-orb-account-project-count>
              {projectCount}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-3 py-3 text-xs leading-5 text-[var(--orb-muted)]" data-orb-account-privacy-summary>
          <p className="font-semibold text-[var(--orb-foreground)]">Data &amp; privacy</p>
          <p className="mt-1">
            ORB Residential keeps conversations, uploads and saved outputs within your account boundary. Provider AI trust
            settings apply where your organisation enables them.
          </p>
        </div>

        <div className="flex flex-col gap-1" data-orb-account-quick-actions>
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
            Quick actions
          </p>
          {!billingDisplay.isPaidActive && !access?.trial?.active && isSignedIn ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenBilling()
              }}
              className="orb-sidebar-nav-item w-full justify-start rounded-xl bg-[var(--orb-primary)] px-3 py-2.5 text-white"
              data-orb-account-subscribe
            >
              <CreditCard className="h-4 w-4" />
              <span>Upgrade · £9.99/month</span>
            </button>
          ) : null}
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
            <span>Manage billing</span>
          </button>
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
          {onOpenSavedOutputs ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenSavedOutputs()
              }}
              className="orb-sidebar-nav-item w-full justify-start rounded-xl px-3 py-2.5"
              data-orb-account-saved-outputs
            >
              <Save className="h-4 w-4" />
              <span>Saved outputs</span>
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
              <span>Sign out</span>
            </button>
          ) : !isSignedIn ? (
            <a
              href="/orb/login"
              className="orb-sidebar-nav-item w-full justify-start rounded-xl px-3 py-2.5"
              data-orb-account-sign-in
            >
              <Shield className="h-4 w-4" />
              <span>Sign in</span>
            </a>
          ) : null}
        </div>

        <p className="flex items-center gap-2 px-1 text-[10px] leading-4 text-[var(--orb-muted)]">
          <Sparkles className="h-3.5 w-3.5 text-[#5ec8ff]" aria-hidden />
          Powered by IndiCare Intelligence
        </p>
        <span className="sr-only" data-orb-account-voice-status>
          {realtimeVoiceEnabled ? 'Voice enabled' : 'Voice not enabled'}
        </span>
        <span className="sr-only" data-orb-account-passkey>
          {passkeyEnabled ? 'Passkey enabled' : 'Passkey not set'}
        </span>
      </div>
    </OrbStandalonePanelShell>
  )
}
