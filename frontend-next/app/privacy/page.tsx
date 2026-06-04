import Link from 'next/link'

import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'

export const metadata = {
  title: 'Privacy — ORB Residential',
  description: 'How IndiCare processes data for ORB Residential accounts.'
}

export default function PrivacyPage() {
  return (
    <main
      className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC,#FFFFFF)] px-6 py-12 text-slate-950"
      data-orb-privacy-page
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">ORB Residential</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Privacy</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          This page explains, in plain English, how IndiCare may process information when you use ORB Residential.
          It is a starter summary and should be reviewed by legal counsel before production launch.
        </p>

        <section className="mt-10 space-y-6 text-sm leading-7 text-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Who we are</h2>
            <p className="mt-2">
              ORB Residential is provided by IndiCare. IndiCare builds software to support adults working in and
              around children&apos;s homes. Contact:{' '}
              <a href="mailto:privacy@indicare.co.uk" className="font-semibold text-indigo-700">
                privacy@indicare.co.uk
              </a>{' '}
              (placeholder — confirm before launch).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">What data we may process</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Account data</strong> — email, name, sign-in method, session and security settings (including
                passkeys where you enable them).
              </li>
              <li>
                <strong>Billing data</strong> — subscription status, Stripe customer identifiers and payment outcomes.
                Card details are handled by Stripe, not stored on IndiCare servers.
              </li>
              <li>
                <strong>ORB usage data</strong> — messages, documents, templates, voice or dictate sessions you choose
                to send, and related metadata needed to run the service.
              </li>
              <li>
                <strong>AI processing data</strong> — prompts and outputs sent to AI providers when you use ORB
                features. Provider organisations may apply additional AI trust and data-protection settings where
                enabled.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Provider controls</h2>
            <p className="mt-2">
              Where your organisation uses IndiCare provider features, administrators may control AI settings,
              retention, and whether external AI processing is permitted. ORB Residential standalone accounts are
              separate from IndiCare OS care records unless your organisation explicitly connects them.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">External AI and storage</h2>
            <p className="mt-2">
              External AI services may be used to generate responses where enabled. Prompt and transcript storage for
              audit or replay is off by default where that setting applies. We apply redaction and minimisation
              controls before sending data to models where configured.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Usage audit metadata</h2>
            <p className="mt-2">
              We may record usage audit metadata (for example feature used, outcome, and timestamps) to operate billing
              meters, improve reliability, and support governance. This is not a substitute for your organisation&apos;s
              own record-keeping obligations.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Cookies and local storage</h2>
            <p className="mt-2">
              We use cookies and browser local storage for sign-in sessions, preferences, and ORB settings on your
              device. You can sign out to end your session; some preferences may remain locally until cleared.
            </p>
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6">
          <OrbLegalLinks className="flex gap-4 text-sm" linkClassName="font-semibold text-indigo-700 hover:underline" />
          <p className="mt-4 text-xs text-slate-500">
            <Link href="/orb/login" className="text-indigo-700 hover:underline">
              Back to sign in
            </Link>
          </p>
        </footer>
      </div>
    </main>
  )
}
