import Link from 'next/link'

import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'

export const metadata = {
  title: 'Support — ORB Residential',
  description: 'Get help with ORB Residential sign-in, billing and access.'
}

export default function SupportPage() {
  return (
    <main
      className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC,#FFFFFF)] px-6 py-12 text-slate-950"
      data-orb-support-page
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">ORB Residential</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Support</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Need help with sign-in, billing or access? Use the guidance below or contact the IndiCare team.
        </p>

        <section className="mt-10 space-y-6 text-sm leading-7 text-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Sign-in issues</h2>
            <p className="mt-2">
              If you subscribed with Google or Microsoft, sign in with the same provider you used at checkout. Use
              &ldquo;Switch account&rdquo; on the access screen if you signed in with a different method.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Billing and subscriptions</h2>
            <p className="mt-2">
              Active subscribers can use &ldquo;Manage billing&rdquo; on the ORB access screen to open the Stripe
              customer portal. After checkout, use &ldquo;Refresh status&rdquo; if access has not updated yet.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Contact</h2>
            <p className="mt-2">
              Email{' '}
              <a href="mailto:support@indicare.co.uk" className="font-semibold text-indigo-700">
                support@indicare.co.uk
              </a>{' '}
              for ORB Residential account help.
            </p>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link href="/orb" className="font-semibold text-indigo-700 hover:underline">
            Return to ORB
          </Link>
          <OrbLegalLinks className="flex gap-4 text-sm" linkClassName="font-semibold text-indigo-700 hover:underline" />
        </div>
      </div>
    </main>
  )
}
