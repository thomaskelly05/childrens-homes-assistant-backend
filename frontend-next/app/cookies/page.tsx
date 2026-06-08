import Link from 'next/link'

import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'

export const metadata = {
  title: 'Cookies — ORB Residential',
  description: 'How ORB Residential uses cookies and similar technologies.'
}

export default function CookiesPage() {
  return (
    <main
      className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC,#FFFFFF)] px-6 py-12 text-slate-950"
      data-orb-cookies-page
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">ORB Residential</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Cookies</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          This page explains how ORB Residential may use cookies and similar technologies to keep you signed in,
          protect your account and improve the service.
        </p>

        <section className="mt-10 space-y-6 text-sm leading-7 text-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Essential cookies</h2>
            <p className="mt-2">
              We use session cookies to authenticate you, enforce security checks (including CSRF protection) and
              remember your sign-in preferences where you choose &ldquo;keep me signed in&rdquo;.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Analytics and performance</h2>
            <p className="mt-2">
              We may use privacy-conscious analytics to understand how ORB Residential is used and to improve
              reliability. We do not sell cookie data to third parties.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Managing cookies</h2>
            <p className="mt-2">
              You can clear cookies in your browser settings. Clearing essential cookies will sign you out of ORB
              Residential.
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
