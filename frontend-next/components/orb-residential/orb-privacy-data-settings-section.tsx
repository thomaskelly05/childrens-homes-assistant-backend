'use client'

import { useState, type ReactNode } from 'react'
import {
  Camera,
  ChevronRight,
  FileText,
  Fingerprint,
  Lock,
  Mic,
  Search,
  Shield,
  UserCircle
} from 'lucide-react'

import { OrbPrivacyDetailSheet } from '@/components/orb-residential/orb-privacy-detail-sheet'
import { OrbResidentialPrivacyGuidanceSheet } from '@/components/orb-residential/orb-privacy-guidance-sheet'
import {
  ORB_APP_PERMISSIONS,
  orbAppPermissionStatusLabel,
  type OrbAppPermission
} from '@/lib/orb/orb-app-permissions'
import { getPrivacyCapability } from '@/lib/orb/orb-privacy-capability-evidence'
import {
  ORB_ADULT_REVIEW_REQUIRED_COPY,
  ORB_FOLLOW_SAFEGUARDING_COPY,
  ORB_MINIMAL_IDENTIFIABLE_INFO_COPY,
  ORB_PRIVACY_SURFACE_COPY
} from '@/lib/orb/orb-privacy-framework'
import {
  ORB_NO_CHILD_MEMORY_CLAIM,
  ORB_PERSONAL_CONTEXT_SUMMARY,
  getPersonalContextRule
} from '@/lib/orb/orb-personal-context'
import { safePublicCopy } from '@/lib/orb/orb-private-compute-framework'

const PERMISSION_ICONS: Record<string, typeof Mic> = {
  microphone: Mic,
  camera: Camera,
  photos_files: FileText,
  voice: Mic,
  dictate: Mic,
  saved_outputs: FileText,
  personal_context: UserCircle,
  search: Search,
  billing: Shield,
  sign_in_security: Fingerprint
}

type PrivacyRow = {
  id: string
  icon: typeof Mic
  title: string
  subtitle: string
  status?: string
  onClick: () => void
}

function PrivacyGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1" data-orb-privacy-data-group>
      <h4 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">{title}</h4>
      <div className="overflow-hidden rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)]">
        {children}
      </div>
    </section>
  )
}

function PrivacyRowButton({ row, isLast }: { row: PrivacyRow; isLast?: boolean }) {
  const Icon = row.icon
  return (
    <button
      type="button"
      onClick={row.onClick}
      className={`flex w-full min-h-[3.25rem] items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-[var(--orb-surface-hover)] ${
        isLast ? '' : 'border-b border-[var(--orb-line)]/45'
      }`}
      data-orb-privacy-data-row={row.id}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--orb-surface-hover)] text-[var(--orb-primary)]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--orb-foreground)]">{row.title}</span>
        <span className="block text-xs leading-5 text-[var(--orb-muted)]">{row.subtitle}</span>
      </span>
      {row.status ? (
        <span className="shrink-0 text-xs text-[var(--orb-muted)]" data-orb-privacy-data-status>
          {row.status}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--orb-muted)]" aria-hidden />
    </button>
  )
}

function permissionDetailCopy(permission: OrbAppPermission): ReactNode {
  return (
    <div className="space-y-3 text-sm leading-6">
      <p>{permission.description}</p>
      <p className="text-[var(--orb-muted)]">{permission.whyOrbAsks}</p>
      <p>
        <span className="font-medium text-[var(--orb-foreground)]">Your control.</span> {permission.userControl}
      </p>
      <p>
        <span className="font-medium text-[var(--orb-foreground)]">If unavailable.</span> {permission.safeFallback}
      </p>
      {permission.browserPermission ? (
        <p className="text-xs text-[var(--orb-muted)]">{ORB_PRIVACY_SURFACE_COPY.browserPermission}</p>
      ) : null}
    </div>
  )
}

export function OrbPrivacyDataSettingsSection({
  passkeysSupported,
  passkeyCount,
  passkeys = [],
  onAddPasskey,
  onDeletePasskey,
  passkeyBusy,
  onExportWorkspace,
  onClearMemory,
  onClearProfiles,
  onClearProjects
}: {
  passkeysSupported: boolean
  passkeyCount: number
  passkeys?: Array<{ id: number; nickname?: string | null; last_used_at?: string | null }>
  onAddPasskey: () => void
  onDeletePasskey?: (id: number) => void
  passkeyBusy: boolean
  onExportWorkspace?: () => void
  onClearMemory?: () => void
  onClearProfiles?: () => void
  onClearProjects?: () => void
}) {
  const [guidanceOpen, setGuidanceOpen] = useState(false)
  const [detailPermission, setDetailPermission] = useState<OrbAppPermission | null>(null)
  const [detailTopic, setDetailTopic] = useState<
    'personal_context' | 'encryption' | 'adult_review' | 'safeguarding' | 'identifiable' | 'sign_in_security' | null
  >(null)

  const appPermissions = ORB_APP_PERMISSIONS.filter((p) =>
    ['microphone', 'camera', 'photos_files', 'voice', 'dictate'].includes(p.id)
  )
  const dataPermissions = ORB_APP_PERMISSIONS.filter((p) =>
    ['saved_outputs', 'personal_context', 'search'].includes(p.id)
  )

  const tls = getPrivacyCapability('encryption_in_transit')
  const e2ee = getPrivacyCapability('end_to_end_encryption')
  const personalContext = getPersonalContextRule('preferences')

  const appRows: PrivacyRow[] = appPermissions.map((permission) => ({
    id: permission.id,
    icon: PERMISSION_ICONS[permission.id] ?? Shield,
    title: permission.label,
    subtitle: permission.description,
    status: permission.browserPermission
      ? orbAppPermissionStatusLabel('browser_controlled')
      : undefined,
    onClick: () => setDetailPermission(permission)
  }))

  const dataRows: PrivacyRow[] = [
    ...dataPermissions.map((permission) => ({
      id: permission.id,
      icon: PERMISSION_ICONS[permission.id] ?? Shield,
      title: permission.label,
      subtitle: permission.description,
      status: permission.id === 'personal_context' ? 'Account' : undefined,
      onClick: () =>
        permission.id === 'personal_context' ? setDetailTopic('personal_context') : setDetailPermission(permission)
    })),
    {
      id: 'uploaded_documents',
      icon: FileText,
      title: 'Uploaded documents',
      subtitle: 'Used only when you attach or upload.',
      onClick: () => setDetailPermission(ORB_APP_PERMISSIONS.find((p) => p.id === 'photos_files')!)
    },
    {
      id: 'privacy_responsibility',
      icon: Shield,
      title: 'Privacy & responsibility',
      subtitle: 'Safeguarding, adult review and data boundaries.',
      onClick: () => setGuidanceOpen(true)
    }
  ]

  const securityRows: PrivacyRow[] = [
    {
      id: 'sign_in_security',
      icon: Fingerprint,
      title: 'Sign-in security',
      subtitle: passkeyCount > 0 ? `${passkeyCount} passkey${passkeyCount === 1 ? '' : 's'} saved` : 'Passkeys and account sign-in',
      status: passkeysSupported ? (passkeyCount > 0 ? 'Allowed' : 'Available') : 'Not available',
      onClick: () => setDetailTopic('sign_in_security')
    },
    {
      id: 'encryption',
      icon: Lock,
      title: 'Encryption and protection',
      subtitle: e2ee?.publicCopy ?? 'Protected in transit and governed by privacy controls',
      status: tls?.status === 'implemented' ? 'TLS' : undefined,
      onClick: () => setDetailTopic('encryption')
    },
    {
      id: 'audit_access',
      icon: Shield,
      title: 'Audit and access',
      subtitle: 'Role-based access and audit logging on the platform.',
      status: 'RBAC',
      onClick: () => setDetailTopic('safeguarding')
    }
  ]

  const responsibilityRows: PrivacyRow[] = [
    {
      id: 'adult_review',
      icon: Shield,
      title: 'Adult review',
      subtitle: ORB_ADULT_REVIEW_REQUIRED_COPY,
      onClick: () => setDetailTopic('adult_review')
    },
    {
      id: 'safeguarding',
      icon: Shield,
      title: 'Safeguarding procedures',
      subtitle: ORB_FOLLOW_SAFEGUARDING_COPY,
      onClick: () => setDetailTopic('safeguarding')
    },
    {
      id: 'identifiable_info',
      icon: UserCircle,
      title: 'Identifiable information',
      subtitle: ORB_MINIMAL_IDENTIFIABLE_INFO_COPY,
      onClick: () => setDetailTopic('identifiable')
    }
  ]

  return (
    <div className="space-y-4" data-orb-privacy-data-section>
      <p className="text-xs leading-5 text-[var(--orb-muted)]" data-orb-privacy-data-intro data-orb-settings-data-safety>
        {safePublicCopy} {ORB_PERSONAL_CONTEXT_SUMMARY} ORB Residential does not access IndiCare OS records.
      </p>

      <PrivacyGroup title="App permissions">
        {appRows.map((row, index) => (
          <PrivacyRowButton key={row.id} row={row} isLast={index === appRows.length - 1} />
        ))}
      </PrivacyGroup>

      <PrivacyGroup title="Data & privacy">
        {dataRows.map((row, index) => (
          <PrivacyRowButton key={row.id} row={row} isLast={index === dataRows.length - 1} />
        ))}
      </PrivacyGroup>

      <PrivacyGroup title="Security">
        {securityRows.map((row, index) => (
          <PrivacyRowButton key={row.id} row={row} isLast={index === securityRows.length - 1} />
        ))}
      </PrivacyGroup>

      <PrivacyGroup title="Responsibilities">
        {responsibilityRows.map((row, index) => (
          <PrivacyRowButton key={row.id} row={row} isLast={index === responsibilityRows.length - 1} />
        ))}
      </PrivacyGroup>

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={onAddPasskey}
          disabled={!passkeysSupported || passkeyBusy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--orb-line)] px-4 py-3 text-sm font-medium text-[var(--orb-foreground)] transition hover:bg-[var(--orb-surface-hover)] disabled:opacity-50"
          data-orb-passkey-register
        >
          <Fingerprint className="h-4 w-4" aria-hidden />
          {passkeyBusy ? 'Working…' : passkeysSupported ? 'Add Face ID / Touch ID' : 'Passkeys unavailable'}
        </button>
        {passkeys.length ? (
          <div className="space-y-2" data-orb-passkey-list>
            {passkeys.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--orb-line)]/60 px-3.5 py-2.5"
              >
                <span className="min-w-0 text-sm text-[var(--orb-foreground)]">{item.nickname || 'ORB passkey'}</span>
                {onDeletePasskey ? (
                  <button
                    type="button"
                    onClick={() => onDeletePasskey(item.id)}
                    disabled={passkeyBusy}
                    className="text-xs text-[var(--orb-muted)] hover:text-red-600 disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {onExportWorkspace ? (
          <button
            type="button"
            onClick={onExportWorkspace}
            className="flex w-full min-h-[2.75rem] items-center rounded-xl border border-[var(--orb-line)]/60 px-3.5 py-2.5 text-sm text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
            data-orb-privacy-export-workspace
          >
            Export workspace JSON
          </button>
        ) : null}
        {onClearMemory ? (
          <button
            type="button"
            onClick={onClearMemory}
            className="flex w-full min-h-[2.75rem] items-center rounded-xl border border-[var(--orb-line)]/60 px-3.5 py-2.5 text-sm text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
            data-orb-privacy-clear-memory
          >
            Clear local ORB memory
          </button>
        ) : null}
        {onClearProfiles ? (
          <button type="button" onClick={onClearProfiles} className="flex w-full min-h-[2.75rem] items-center rounded-xl border border-[var(--orb-line)]/60 px-3.5 py-2.5 text-sm text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]">
            Clear profiles
          </button>
        ) : null}
        {onClearProjects ? (
          <button type="button" onClick={onClearProjects} className="flex w-full min-h-[2.75rem] items-center rounded-xl border border-[var(--orb-line)]/60 px-3.5 py-2.5 text-sm text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]">
            Clear custom projects
          </button>
        ) : null}
        <a
          href="/orb/privacy"
          className="block rounded-xl border border-[var(--orb-line)]/60 px-3.5 py-2.5 text-sm font-medium text-[var(--orb-primary,#1677ff)] hover:underline"
          data-orb-settings-privacy-page-link
        >
          ORB Privacy &amp; Data Handling
        </a>
      </div>

      <OrbResidentialPrivacyGuidanceSheet
        open={guidanceOpen}
        onClose={() => setGuidanceOpen(false)}
        returnOrigin="settings"
      />

      <OrbPrivacyDetailSheet
        open={detailPermission !== null}
        title={detailPermission?.label ?? 'Permission'}
        onClose={() => setDetailPermission(null)}
        returnOrigin="settings"
      >
        {detailPermission ? permissionDetailCopy(detailPermission) : null}
      </OrbPrivacyDetailSheet>

      <OrbPrivacyDetailSheet
        open={detailTopic !== null}
        title={
          detailTopic === 'encryption'
            ? 'Encryption and protection'
            : detailTopic === 'personal_context'
              ? 'Personal context'
              : detailTopic === 'adult_review'
                ? 'Adult review'
                : detailTopic === 'identifiable'
                  ? 'Identifiable information'
                  : detailTopic === 'sign_in_security'
                    ? 'Sign-in security'
                    : 'Safeguarding procedures'
        }
        onClose={() => setDetailTopic(null)}
        returnOrigin="settings"
      >
        {detailTopic === 'encryption' ? (
          <div className="space-y-3">
            <p>{e2ee?.publicCopy}</p>
            <p className="text-[var(--orb-muted)]">
              {tls?.label}: {tls?.status}. ORB does not claim end-to-end encryption unless implemented.
            </p>
            <p className="text-xs text-[var(--orb-muted)]">{e2ee?.limitations[0]}</p>
          </div>
        ) : null}
        {detailTopic === 'personal_context' ? (
          <div className="space-y-3">
            <p>{ORB_PERSONAL_CONTEXT_SUMMARY}</p>
            <p>{ORB_NO_CHILD_MEMORY_CLAIM}</p>
            {personalContext ? (
              <p className="text-[var(--orb-muted)]">
                {personalContext.mayUse} {personalContext.canClear}
              </p>
            ) : null}
          </div>
        ) : null}
        {detailTopic === 'adult_review' ? (
          <p>{ORB_ADULT_REVIEW_REQUIRED_COPY} {ORB_PRIVACY_SURFACE_COPY.adultReview}</p>
        ) : null}
        {detailTopic === 'safeguarding' ? (
          <p>{ORB_FOLLOW_SAFEGUARDING_COPY} {ORB_PRIVACY_SURFACE_COPY.safeguarding}</p>
        ) : null}
        {detailTopic === 'identifiable' ? (
          <p>{ORB_MINIMAL_IDENTIFIABLE_INFO_COPY}</p>
        ) : null}
        {detailTopic === 'sign_in_security' ? (
          <div className="space-y-3">
            <p>Add a passkey so this device can sign in to ORB more quickly. Your biometric stays on your device.</p>
            <button
              type="button"
              onClick={onAddPasskey}
              disabled={!passkeysSupported || passkeyBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--orb-primary,#1677ff)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {passkeyBusy ? 'Working…' : 'Add Face ID / Touch ID'}
            </button>
          </div>
        ) : null}
      </OrbPrivacyDetailSheet>
    </div>
  )
}
