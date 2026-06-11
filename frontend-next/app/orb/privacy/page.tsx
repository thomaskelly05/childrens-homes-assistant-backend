import Link from 'next/link'

import { OrbRetentionStatusCard } from '@/components/orb/privacy/orb-retention-status-card'
import {
  buildOrbDataCategories,
  buildOrbPrivacyNotice,
  buildOrbRetentionPolicySummary,
  ORB_PRIVACY_CONTACT_EMAIL,
  ORB_PRIVACY_SUPPORT_EMAIL
} from '@/lib/orb/privacy/orb-privacy-content'
import { getOrbDataClassificationGuidance } from '@/lib/orb/privacy/orb-data-classification'

export const metadata = {
  title: 'ORB Privacy & Data Handling — ORB Residential',
  description:
    'How ORB Residential handles information, drafts, transcripts and usage data for closed pilot homes.'
}

export default function OrbPrivacyPage() {
  const notice = buildOrbPrivacyNotice()
  const classification = getOrbDataClassificationGuidance()
  const retention = buildOrbRetentionPolicySummary()
  const categories = buildOrbDataCategories()
  const stored = categories.filter((c) => c.stored)
  const notStoredSection = notice.sections.find((s) => s.id === 'what-not-stored')

  return (
    <main
      className="min-h-screen bg-[var(--orb-page-bg,var(--orb-bg-deep,#05070d))] px-4 py-10 text-[var(--orb-foreground)] md:px-8"
      data-orb-privacy-page
    >
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--orb-primary,#1677ff)]">
          ORB Residential
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{notice.title}</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--orb-muted)]">
          How ORB Residential handles information, drafts, transcripts and usage data.
        </p>
        <p className="mt-2 text-xs text-[var(--orb-muted)]">
          Version {notice.version} · Updated {notice.lastUpdated}
        </p>

        <section className="mt-10 space-y-4" data-orb-privacy-quick-summary>
          <h2 className="text-lg font-bold">Quick summary</h2>
          {notice.sections
            .find((s) => s.id === 'quick-summary')
            ?.body.map((line) => (
              <p key={line} className="text-sm leading-7 text-[var(--orb-muted)]">
                {line}
              </p>
            ))}
        </section>

        <section className="mt-10 space-y-4" data-orb-privacy-classification-section>
          <h2 className="text-lg font-bold">Green / Amber / Red data guidance</h2>
          <div className="space-y-4 rounded-2xl border border-[var(--orb-line)] p-4">
            <div data-orb-classification-green>
              <h3 className="text-sm font-semibold text-emerald-400">{classification.green.label}</h3>
              <p className="mt-1 text-sm text-[var(--orb-muted)]">{classification.green.summary}</p>
            </div>
            <div data-orb-classification-amber>
              <h3 className="text-sm font-semibold text-amber-400">{classification.amber.label}</h3>
              <p className="mt-1 text-sm text-[var(--orb-muted)]">{classification.amber.summary}</p>
            </div>
            <div data-orb-classification-red>
              <h3 className="text-sm font-semibold text-rose-400">{classification.red.label}</h3>
              <p className="mt-1 text-sm text-[var(--orb-muted)]">{classification.red.summary}</p>
            </div>
            <p className="text-sm text-[var(--orb-muted)]" data-orb-behaviour-is-communication>
              {classification.behaviourIsCommunication}
            </p>
            <p className="text-sm text-[var(--orb-muted)]" data-orb-child-voice-central>
              {classification.childVoiceCentral}
            </p>
          </div>
        </section>

        <section className="mt-10" data-orb-privacy-what-stored>
          <h2 className="text-lg font-bold">What ORB stores</h2>
          <ul className="mt-4 space-y-3">
            {stored.map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--orb-line)] px-4 py-3 text-sm">
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-[var(--orb-muted)]">{item.description}</p>
                <p className="mt-1 text-xs text-[var(--orb-muted)]">{item.storageLocation}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" data-orb-privacy-what-not-stored>
          <h2 className="text-lg font-bold">What ORB does not store</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--orb-muted)]">
            {(notStoredSection?.body ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 space-y-3 text-sm leading-7 text-[var(--orb-muted)]" data-orb-privacy-voice-dictate>
          <h2 className="text-lg font-bold text-[var(--orb-foreground)]">Voice and Dictate</h2>
          <p>{retention.audioRetention}</p>
          <p>{retention.transcriptRetention}</p>
        </section>

        <section className="mt-10 space-y-3 text-sm leading-7 text-[var(--orb-muted)]" data-orb-privacy-drafts-exports>
          <h2 className="text-lg font-bold text-[var(--orb-foreground)]">Drafts, reports and exports</h2>
          <p>{retention.draftRetention}</p>
          <p>{retention.savedOutputRetention}</p>
          <p>Exported documents may contain sensitive information. Store and share them according to your organisation&apos;s policy.</p>
        </section>

        <section className="mt-10 space-y-3 text-sm leading-7 text-[var(--orb-muted)]" data-orb-privacy-telemetry>
          <h2 className="text-lg font-bold text-[var(--orb-foreground)]">Telemetry</h2>
          <p>{retention.telemetryRetention}</p>
        </section>

        <section className="mt-10 space-y-3 text-sm leading-7 text-[var(--orb-muted)]" data-orb-privacy-billing>
          <h2 className="text-lg font-bold text-[var(--orb-foreground)]">Billing data</h2>
          <p>{retention.billingRetention}</p>
        </section>

        <section className="mt-10 space-y-3 text-sm leading-7 text-[var(--orb-muted)]" data-orb-privacy-responsibilities>
          <h2 className="text-lg font-bold text-[var(--orb-foreground)]">Your responsibilities when using ORB</h2>
          <p>{classification.professionalJudgement}</p>
          <p>Follow your organisation&apos;s safeguarding procedures and local policies.</p>
          <p>Emergency safeguarding concerns must be escalated through usual procedures.</p>
          <p>{classification.behaviourIsCommunication}</p>
          <p>{classification.childVoiceCentral}</p>
        </section>

        <section className="mt-10 space-y-3 text-sm leading-7 text-[var(--orb-muted)]" data-orb-privacy-deletion-export>
          <h2 className="text-lg font-bold text-[var(--orb-foreground)]">Deletion and access requests</h2>
          <p>{retention.deletionRequestProcess}</p>
          <p>{retention.exportRequestProcess}</p>
          <Link href="/orb/privacy/requests" className="inline-block font-semibold text-[var(--orb-primary,#1677ff)] hover:underline">
            Submit a privacy request
          </Link>
        </section>

        <section className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4" data-orb-privacy-closed-pilot>
          <h2 className="text-lg font-bold text-amber-100">Closed pilot notice</h2>
          <p className="mt-2 text-sm leading-7 text-amber-50/90">
            This build is for closed pilot homes. ORB is a support tool — not a replacement for organisational recording
            systems unless your provider has explicitly approved it. Retention controls are being finalised for closed pilot.
          </p>
        </section>

        <div className="mt-10">
          <OrbRetentionStatusCard />
        </div>

        <footer className="mt-10 flex flex-wrap gap-4 border-t border-[var(--orb-line)] pt-6 text-sm">
          <Link href="/orb" className="font-semibold text-[var(--orb-primary,#1677ff)] hover:underline">
            Return to ORB
          </Link>
          <a href={`mailto:${ORB_PRIVACY_CONTACT_EMAIL}`} className="font-semibold text-[var(--orb-primary,#1677ff)] hover:underline">
            {ORB_PRIVACY_CONTACT_EMAIL}
          </a>
          <a href={`mailto:${ORB_PRIVACY_SUPPORT_EMAIL}`} className="font-semibold text-[var(--orb-primary,#1677ff)] hover:underline">
            {ORB_PRIVACY_SUPPORT_EMAIL}
          </a>
        </footer>
      </div>
    </main>
  )
}
