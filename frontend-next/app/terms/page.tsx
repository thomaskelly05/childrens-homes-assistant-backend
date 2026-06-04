import Link from 'next/link'

import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'

export const metadata = {
  title: 'Terms — ORB Residential',
  description: 'Terms of use for ORB Residential.'
}

export default function TermsPage() {
  return (
    <main
      className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC,#FFFFFF)] px-6 py-12 text-slate-950"
      data-orb-terms-page
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">ORB Residential</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Terms of use</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          These terms describe how you may use ORB Residential. They are a starter summary and should be reviewed by
          legal counsel before production launch.
        </p>

        <section className="mt-10 space-y-6 text-sm leading-7 text-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Professional judgement</h2>
            <p className="mt-2">
              ORB supports professional judgement. It does not replace safeguarding procedures, registered managers,
              emergency services, local protocols, or legal or medical advice. You must review ORB outputs before
              relying on them in practice.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Safeguarding and emergencies</h2>
            <p className="mt-2">
              If there is immediate risk of harm, follow your organisation&apos;s procedures and contact emergency
              services where required. ORB is not an emergency service and must not be used as one.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Subscription</h2>
            <p className="mt-2">
              ORB Residential Individual is billed at the price shown at checkout (currently £9.99 per month unless
              stated otherwise). A free trial may be offered when eligible. Subscription status is managed through
              Stripe; you can update payment methods and cancel through the billing portal where available.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Acceptable use</h2>
            <p className="mt-2">
              Use ORB only for lawful professional purposes related to work in or around children&apos;s homes. Do not
              misuse sensitive information beyond your lawful purpose, attempt to bypass access controls, or use ORB
              to generate content you know to be harmful or misleading without appropriate human review.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Cancellation and billing</h2>
            <p className="mt-2">
              Cancellation and refunds follow Stripe and your subscription status at the time of cancellation. Access
              may continue until the end of a paid period where applicable. Past-due payments may limit ORB features
              until billing is updated.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Provider team plans</h2>
            <p className="mt-2">
              Organisation-wide provider team billing and seat management are planned for a future release. Contact
              IndiCare if you need ORB for a provider team today.
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
