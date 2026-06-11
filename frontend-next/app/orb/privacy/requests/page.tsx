import Link from 'next/link'
import { cookies } from 'next/headers'

import { OrbPrivacyRequestsForm } from '@/components/orb/privacy/orb-privacy-requests-form'

export const metadata = {
  title: 'Privacy Requests — ORB Residential',
  description: 'Submit ORB Residential privacy, deletion and export requests for closed pilot review.'
}

export default async function OrbPrivacyRequestsPage() {
  const cookieStore = await cookies()
  const authenticated = Boolean(
    cookieStore.get('indicare_session')?.value || cookieStore.get('__Host-indicare_session')?.value
  )

  return (
    <main
      className="min-h-screen bg-[var(--orb-page-bg,var(--orb-bg-deep,#05070d))] px-4 py-10 text-[var(--orb-foreground)] md:px-8"
      data-orb-privacy-requests-page
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--orb-primary,#1677ff)]">
          ORB Residential
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Privacy Requests</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--orb-muted)]">
          Request deletion, export or ask a privacy question. Requests are reviewed manually — not instant self-service.
        </p>

        <OrbPrivacyRequestsForm authenticated={authenticated} />

        <footer className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/orb/privacy" className="font-semibold text-[var(--orb-primary,#1677ff)] hover:underline">
            Privacy notice
          </Link>
          <Link href="/orb" className="font-semibold text-[var(--orb-primary,#1677ff)] hover:underline">
            Return to ORB
          </Link>
        </footer>
      </div>
    </main>
  )
}
