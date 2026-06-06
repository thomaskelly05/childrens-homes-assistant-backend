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
  profile: AdultProfile | null
  userEmail?: string | null
  userName?: string | null
  planLabel?: string | null
  subscriptionActive?: boolean
  savedOutputsCount?: number
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
  tone = 'default'
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  testId: string
  tone?: 'default' | 'danger'
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
  profile,
  userEmail,
  userName,
  planLabel,
  subscriptionActive = false,
  savedOutputsCount = 0,
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
  const top = rect ? rect.bottom + 8 : 56
  const left = rect ? Math.max(12, rect.left) : 12

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Account menu"
      className="orb-account-menu fixed z-[80] w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl"
      style={{ top, left }}
      data-orb-account-menu
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
            <span
              className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                subscriptionActive
                  ? 'border-emerald-200/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-200/40 bg-amber-500/10 text-amber-100'
              }`}
              data-orb-account-menu-plan
            >
              {statusLabel}
            </span>
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
        />
      </div>
    </div>
  )
}
