import Link from 'next/link'
import { notFound } from 'next/navigation'

import { OrbEvidenceDiagnosticsPanel } from '@/components/orb-operational/orb-evidence-diagnostics-panel'

type SearchParams = Promise<{ young_person_id?: string; home_id?: string }>

export default async function OrbEvidenceDiagnosticsPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_ORB_DIAGNOSTICS !== 'true') {
    notFound()
  }

  const query = await searchParams

  return (
    <main className="min-h-[100dvh] bg-slate-50 px-4 py-8 md:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">ORB diagnostics</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Evidence spine probe</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Confirms runtime identity, scope resolution, evidence counts and source-labelled items before answers are generated.
            </p>
          </div>
          <Link href="/assistant/orb" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800">
            Back to ORB
          </Link>
        </div>
        <OrbEvidenceDiagnosticsPanel
          initialChildId={query.young_person_id}
          initialHomeId={query.home_id}
        />
      </div>
    </main>
  )
}
