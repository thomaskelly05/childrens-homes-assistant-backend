'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import {
  Database,
  LogOut,
  Mic,
  Save,
  Settings,
  User
} from 'lucide-react'

import { OrbUserAvatar } from '@/components/orb-residential/orb-user-avatar'
import type { AdultProfile } from '@/lib/orb/adult-profile-store'
import { ORB_NAV_RECORDS } from '@/lib/orb/orb-user-facing-names'
import { formatOrbPlanLabel, getOrbBillingDisplayStatus } from '@/lib/orb/orb-billing-display'

export type OrbAccountMenuSettingsSection = 'appearance' | 'voice' | 'safety_privacy' | 'account_billing'

export type OrbAccountMenuProps = {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  /** Prefer opening above the anchor (collapsed sidebar account icon). */
  preferAbove?: boolean
  profile: AdultProfile | null
  userEmail?: string | null
  userName?: string | null
  avatarUrl?: string | null
  planLabel?: string | null
  subscriptionActive?: boolean
  access?: import('@/lib/orb/orb-billing-client').OrbAccessPayload | null
  accessStatus?: 'idle' | 'loading' | 'ready' | 'error'
  savedOutputsCount?: number
  role?: string | null
  passkeyEnabled?: boolean
  realtimeVoiceEnabled?: boolean
  onOpenProfile: () => void
  onOpenSettings: (section?: OrbAccountMenuSettingsSection) => void
  onOpenBilling: () => void
  onOpenVoiceSettings?: () => void
  onOpenSavedOutputs?: () => void
  onSignOut: () => void
}

function MenuItem({
  icon,
  label,
  onClick,
  testId,
  tone = 'default',
  dataOrbSignOut = false
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  testId: string
  tone?: 'default' | 'danger'
  dataOrbSignOut?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full min-h-[2.75rem] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
        tone === 'danger'
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]'
      }`}
      data-orb-account-menu-item={testId}
      {...(dataOrbSignOut ? { 'data-orb-account-menu-signout': true } : {})}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center opacity-80" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}

function formatRoleLabel(profile: AdultProfile | null, role: string | null | undefined): string | null {
  if (profile?.roleLabel?.trim()) return profile.roleLabel.trim()
  if (!role?.trim()) return null
  return role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/** ChatGPT-style compact account popover for ORB Residential. */
export function OrbAccountMenu({
  open,
  onClose,
  anchorRef,
  preferAbove = false,
  profile,
  userEmail,
  userName,
  avatarUrl,
  planLabel,
  subscriptionActive = false,
  access = null,
  accessStatus = 'idle',
  savedOutputsCount = 0,
  role = null,
  onOpenProfile,
  onOpenSettings,
  onOpenBilling,
  onOpenVoiceSettings,
  onOpenSavedOutputs,
  onSignOut
}: OrbAccountMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = userName?.trim() || profile?.name?.trim() || 'Your account'
  const email = userEmail?.trim() || null
  const billingDisplay = getOrbBillingDisplayStatus(access, {
    isLoading: accessStatus === 'loading' || (accessStatus === 'idle' && !access),
    hasError: accessStatus === 'error',
    isSignedIn: true
  })
  const subscriptionStatus = billingDisplay.headline
  const roleLabel = formatRoleLabel(profile, role)
  const planDisplay = formatOrbPlanLabel(planLabel?.trim() || access?.subscription?.plan_name)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [anchorRef, onClose, open])

  useEffect(() => {
    if (!open || !menuRef.current) return
    const first = menuRef.current.querySelector<HTMLElement>('[role="menuitem"]')
    first?.focus()
  }, [open])

  if (!open) return null

  const anchor = anchorRef.current
  const rect = anchor?.getBoundingClientRect()
  const menuWidth = Math.min(272, typeof window !== 'undefined' ? window.innerWidth - 24 : 272)
  const left = rect
    ? Math.min(Math.max(12, rect.right - menuWidth), typeof window !== 'undefined' ? window.innerWidth - menuWidth - 12 : 12)
    : 12
  const estimatedHeight = 360
  const openAbove =
    preferAbove ||
    Boolean(rect && rect.bottom > (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.55)
  const top = rect
    ? openAbove
      ? Math.max(12, rect.top - estimatedHeight - 8)
      : rect.bottom + 8
    : 56

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Account menu"
      className="orb-account-menu fixed z-[80] w-[min(15rem,calc(100vw-1.5rem))] max-h-[min(21rem,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem))] overflow-y-auto overscroll-contain rounded-xl border border-[var(--orb-line)]/45 bg-[var(--orb-surface-elevated)] p-1 shadow-lg shadow-black/10"
      style={{ top, left }}
      data-orb-account-menu
      data-orb-account-menu-open="true"
    >
      <div className="rounded-lg border border-[var(--orb-line)]/25 bg-[var(--orb-surface)]/80 px-2 py-1.5" data-orb-account-menu-header>
        <div className="flex items-start gap-2.5">
          <OrbUserAvatar name={displayName} avatarUrl={avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--orb-foreground)]" data-orb-account-menu-name>
              {displayName}
            </p>
            {email ? (
              <p className="truncate text-xs text-[var(--orb-muted)]" data-orb-account-menu-email>
                {email}
              </p>
            ) : null}
            <dl className="mt-2 space-y-1 text-[11px] text-[var(--orb-muted)]" data-orb-account-menu-summary>
              {roleLabel ? (
                <div className="flex gap-1.5">
                  <dt className="shrink-0">Role:</dt>
                  <dd className="font-medium capitalize text-[var(--orb-foreground)]" data-orb-account-menu-role>
                    {roleLabel}
                  </dd>
                </div>
              ) : null}
              <div className="flex gap-1.5">
                <dt className="shrink-0">Plan:</dt>
                <dd className="font-medium text-[var(--orb-foreground)]" data-orb-account-menu-plan>
                  {planDisplay}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="shrink-0">Subscription:</dt>
                <dd
                  className="font-medium capitalize text-[var(--orb-foreground)]"
                  data-orb-account-menu-subscription
                >
                  {subscriptionActive && billingDisplay.isPaidActive ? 'Active' : subscriptionStatus}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-0.5 flex flex-col gap-0 py-0.5" data-orb-account-menu-items>
        <MenuItem
          icon={<User className="h-4 w-4" />}
          label="Profile"
          testId="profile"
          onClick={() => {
            onClose()
            onOpenProfile()
          }}
        />
        {onOpenSavedOutputs ? (
          <MenuItem
            icon={<Save className="h-4 w-4" />}
            label={ORB_NAV_RECORDS}
            testId="saved-outputs"
            onClick={() => {
              onClose()
              onOpenSavedOutputs()
            }}
          />
        ) : null}
        {onOpenVoiceSettings ? (
          <MenuItem
            icon={<Mic className="h-4 w-4" />}
            label="Voice settings"
            testId="voice-settings"
            onClick={() => {
              onClose()
              onOpenSettings('voice')
            }}
          />
        ) : null}
        <MenuItem
          icon={<Database className="h-4 w-4" />}
          label="Privacy & data"
          testId="privacy"
          onClick={() => {
            onClose()
            onOpenSettings('safety_privacy')
          }}
        />
        <MenuItem
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          testId="settings"
          onClick={() => {
            onClose()
            onOpenSettings('appearance')
          }}
        />
      </div>

      <div className="mt-1 border-t border-[var(--orb-line)]/40 pt-1" data-orb-account-menu-sign-out-wrap>
        <MenuItem
          icon={<LogOut className="h-4 w-4" />}
          label="Sign out"
          testId="sign-out"
          tone="danger"
          onClick={() => {
            onClose()
            onSignOut()
          }}
          dataOrbSignOut
        />
      </div>
      {savedOutputsCount > 0 ? (
        <p className="sr-only" data-orb-account-menu-saved-count>
          {savedOutputsCount} records and drafts
        </p>
      ) : null}
    </div>
  )
}
