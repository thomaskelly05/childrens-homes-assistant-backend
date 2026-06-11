import Link from 'next/link'
import { cookies } from 'next/headers'

import { OrbPilotFeedbackForm } from '@/components/orb/pilot/orb-pilot-feedback-form'

export const metadata = {
  title: 'Help improve ORB Residential — Closed pilot feedback',
  description:
    'Tell us whether ORB helped your recording, confidence and time with children. Closed pilot validation only.'
}

export default async function OrbPilotFeedbackPage() {
  const cookieStore = await cookies()
  const authenticated = Boolean(
    cookieStore.get('indicare_session')?.value || cookieStore.get('__Host-indicare_session')?.value
  )

  return (
    <main
      className="min-h-screen bg-[var(--orb-page-bg,var(--orb-bg-deep,#05070d))] px-4 py-10 text-[var(--orb-foreground)] md:px-8"
      data-orb-pilot-feedback-page
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--orb-primary,#1677ff)]">
          ORB Residential · Closed pilot
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Help improve ORB Residential</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--orb-muted)]">
          Tell us whether ORB helped your recording, confidence and time with children.
        </p>
        <p className="mt-2 text-xs leading-5 text-[var(--orb-muted)]">
          Behaviour is communication. The child&apos;s voice remains central. ORB supports staff but does not replace
          professional judgement or local policy.
        </p>

        <div className="mt-8">
          <OrbPilotFeedbackForm authenticated={authenticated} />
        </div>

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
