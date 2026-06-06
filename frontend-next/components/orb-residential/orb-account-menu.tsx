'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import {
  CreditCard,
  Database,
  LogOut,
  Mic,
  Save,
  Settings,
  User
} from 'lucide-react'

import type { AdultProfile } from '@/lib/orb/adult-profile-store'
import { profileInitialsFromName } from '@/lib/orb/orb-profile-initials'

export type OrbAccountMenuProps = {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  /** Prefer opening above the anchor (collapsed sidebar account icon). */
  preferAbove?: boolean
  profile: AdultProfile | null
  userEmail?: string | null
  userName?: string | null
  planLabel?: string | null
  subscriptionActive?: boolean
  savedOutputsCount?: number
  role?: string | null
  passkeyEnabled?: boolean
  realtimeVoiceEnabled?: boolean
  onOpenProfile: () => void
  onOpenSettings: () => void
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
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
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

/** ChatGPT-style compact account popover for ORB Residential. */
export function OrbAccountMenu({
  open,
  onClose,
  anchorRef,
  preferAbove = false,
  profile,
  userEmail,
  userName,
  planLabel,
  subscriptionActive = false,
  savedOutputsCount = 0,
  role = null,
  passkeyEnabled = false,
  realtimeVoiceEnabled = false,
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
  const initials = profileInitialsFromName(displayName)
  const statusLabel = subscriptionActive ? planLabel?.trim() || 'Active' : 'Inactive'

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
  const menuWidth = Math.min(288, typeof window !== 'undefined' ? window.innerWidth - 24 : 288)
  const left = rect
    ? Math.min(Math.max(12, rect.right - menuWidth), typeof window !== 'undefined' ? window.innerWidth - menuWidth - 12 : 12)
    : 12
  const estimatedHeight = 420
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
      className="orb-account-menu fixed z-[80] w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl"
      style={{ top, left }}
      data-orb-account-menu
      data-orb-account-menu-open="true"
    >
      <div className="rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/80 px-3 py-3" data-orb-account-menu-header>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] text-sm font-semibold text-[var(--orb-primary)]"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--orb-foreground)]" data-orb-account-menu-name>
              {displayName}
            </p>
            {email ? (
              <p className="truncate text-xs text-[var(--orb-muted)]" data-orb-account-menu-email>
                {email}
              </p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5" data-orb-account-menu-status-row>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                  subscriptionActive
                    ? 'border-emerald-200/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-amber-200/40 bg-amber-500/10 text-amber-100'
                }`}
                data-orb-account-menu-plan
              >
                {statusLabel}
              </span>
              {profile?.roleLabel ? (
                <span
                  className="inline-flex rounded-full border border-[var(--orb-line)]/45 px-2 py-0.5 text-[10px] font-medium text-[var(--orb-muted)]"
                  data-orb-account-menu-role
                >
                  {profile.roleLabel}
                </span>
              ) : role ? (
                <span
                  className="inline-flex rounded-full border border-[var(--orb-line)]/45 px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--orb-muted)]"
                  data-orb-account-menu-role
                >
                  {role.replace(/_/g, ' ')}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1" data-orb-account-menu-quick-status>
              <span className="rounded-md bg-[var(--orb-surface)]/80 px-1.5 py-0.5 text-[9px] text-[var(--orb-muted)]" data-orb-account-menu-passkey>
                {passkeyEnabled ? 'Passkey on' : 'Passkey off'}
              </span>
              <span className="rounded-md bg-[var(--orb-surface)]/80 px-1.5 py-0.5 text-[9px] text-[var(--orb-muted)]" data-orb-account-menu-voice>
                {realtimeVoiceEnabled ? 'Voice ready' : 'Voice available'}
              </span>
              {savedOutputsCount > 0 ? (
                <span className="rounded-md bg-[var(--orb-surface)]/80 px-1.5 py-0.5 text-[9px] text-[var(--orb-muted)]" data-orb-account-menu-saved-count>
                  {savedOutputsCount} saved
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-0.5 py-1" data-orb-account-menu-items>
        <MenuItem
          icon={<User className="h-4 w-4" />}
          label="Profile"
          testId="profile"
          onClick={() => {
            onClose()
            onOpenProfile()
          }}
        />
        <MenuItem
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          testId="settings"
          onClick={() => {
            onClose()
            onOpenSettings()
          }}
        />
        <MenuItem
          icon={<CreditCard className="h-4 w-4" />}
          label="Billing"
          testId="billing"
          onClick={() => {
            onClose()
            onOpenBilling()
          }}
        />
        <MenuItem
          icon={<Database className="h-4 w-4" />}
          label="Data & privacy"
          testId="privacy"
          onClick={() => {
            onClose()
            onOpenSettings()
          }}
        />
        {onOpenVoiceSettings ? (
          <MenuItem
            icon={<Mic className="h-4 w-4" />}
            label="Voice settings"
            testId="voice"
            onClick={() => {
              onClose()
              onOpenVoiceSettings()
            }}
          />
        ) : null}
        {onOpenSavedOutputs ? (
          <MenuItem
            icon={<Save className="h-4 w-4" />}
            label={`Saved outputs${savedOutputsCount ? ` (${savedOutputsCount})` : ''}`}
            testId="saved-outputs"
            onClick={() => {
              onClose()
              onOpenSavedOutputs()
            }}
          />
        ) : null}
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
    </div>
  )
}
