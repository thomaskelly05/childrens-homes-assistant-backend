'use client'

import { useEffect, useState } from 'react'
import { CreditCard, LogOut, Settings, Shield } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { fetchOrbAccess, type OrbAccessPayload } from '@/lib/orb/orb-billing-client'
import type { AdultProfile } from '@/lib/orb/adult-profile-store'
import { ORB_RESIDENTIAL_PRODUCT_NAME } from '@/lib/orb/orb-residential-copy'

export function OrbAccountModal({
  open,
  onClose,
  profile,
  onOpenSettings,
  onOpenBilling,
  onLogOut,
  passkeyEnabled
}: {
  open: boolean
  onClose: () => void
  profile: AdultProfile | null
  onOpenSettings: () => void
  onOpenBilling: () => void
  onLogOut?: () => void
  passkeyEnabled?: boolean
}) {
  const [access, setAccess] = useState<OrbAccessPayload | null>(null)

  useEffect(() => {
    if (!open) return
    void fetchOrbAccess()
      .then(setAccess)
      .catch(() => setAccess(null))
  }, [open])

  const displayName = profile?.name?.trim() || 'Your account'
  const subscriptionLabel =
    access?.subscription?.status ??
    (access?.trial?.active ? 'Trial active' : access?.can_use_orb ? 'Active' : 'Inactive')

  return (
    <OrbAppModal
      open={open}
      title="Account"
      subtitle={ORB_RESIDENTIAL_PRODUCT_NAME}
      onClose={onClose}
      panelId="account"
      size="compact"
    >
      <div className="space-y-4 p-4" data-orb-account-modal>
        <div className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-4 py-3">
          <p className="text-base font-semibold text-[var(--orb-foreground)]">{displayName}</p>
          <p className="mt-0.5 text-xs text-[var(--orb-muted)]">ORB Residential account</p>
          <p className="mt-2 text-xs">
            <span className="text-[var(--orb-muted)]">Subscription: </span>
            <span className="font-medium capitalize" data-orb-account-subscription>
              {subscriptionLabel}
            </span>
          </p>
          <p className="mt-1 text-xs">
            <span className="text-[var(--orb-muted)]">Passkeys: </span>
            <span className="font-medium" data-orb-account-passkey>
              {passkeyEnabled ? 'Enabled' : 'Not set up'}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-1">
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
      </div>
    </OrbAppModal>
  )
}
