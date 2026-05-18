import Link from 'next/link'

import { EmptyState, SectionHeader } from '@/components/indicare/ui'
import { buildLiveOfstedEvidenceOutline, buildLiveRiskReview, buildLiveSafeguardingChronology, buildLiveWeeklyCareSummary } from '@/lib/indicare/reports'
import { text } from '@/lib/os-api/bundles'
import { getServerChildProfileBundle } from '@/lib/os-api/server-bundles'

type Section = {
  title: string
  body: string
  evidence?: string[]
}

function ReportPanel({ title, sections }: { title: string; sections: Section[] }) {
  return (
    <section className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <SectionHeader eyebrow="Live report" title={title} />
      <div className="mt-5 grid gap-4">
        {sections.length ? sections.map((section, index) => (
          <article key={`${section.title}-${index}`} className="rounded-[24px] bg-slate-50 p-4">
            <h3 className="text-sm font-black text-slate-950">{section.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{section.body}</p>
            {section.evidence?.length ? <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Evidence: {section.evidence.slice(0, 6).join(', ')}</p> : null}
          </article>
        )) : <EmptyState title="No live report sections returned" description="The report builder is ready, but this child has no linked live records for this report yet." />}
      </div>
    </section>
  )
}

export default async function YoungPersonReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getServerChildProfileBundle(id)
  const identity = result.data.identity || {}
  const name = text(identity, ['preferred_name', 'first_name', 'display_name'], `Young person ${id}`)
  const [weekly, risk, safeguarding, ofsted] = await Promise.all([
    buildLiveWeeklyCareSummary(id),
    buildLiveRiskReview(id),
    buildLiveSafeguardingChronology(id),
    buildLiveOfstedEvidenceOutline(id)
  ])

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/young-people/${encodeURIComponent(id)}`} className="text-sm font-black text-blue-700">← Back to {name}</Link>
      <div className="mt-6 rounded-[32px] bg-gradient-to-br from-blue-50 to-white p-8 ring-1 ring-blue-100">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Reports</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Live evidence reports for {name}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">These reports use live chronology, evidence, risk, health, safeguarding and plan context where linked. Empty sections mean there is no linked live evidence yet, not demo data.</p>
      </div>
      <div className="mt-8 grid gap-6">
        <ReportPanel title="Weekly care summary" sections={weekly} />
        <ReportPanel title="Risk review" sections={risk} />
        <ReportPanel title="Safeguarding chronology" sections={safeguarding} />
        <ReportPanel title="Ofsted evidence outline" sections={ofsted} />
      </div>
    </main>
  )
}
