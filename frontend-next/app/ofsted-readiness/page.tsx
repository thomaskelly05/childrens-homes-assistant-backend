import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getInspectionReadiness } from '@/lib/os-api/platform'

function objectRows(value: Record<string, any>) {
  return Object.entries(value)
    .filter(([, item]) => item !== undefined && item !== null && typeof item !== 'function')
    .slice(0, 12)
    .map(([key, item]) => [
      key.replaceAll('_', ' '),
      typeof item === 'object' ? JSON.stringify(item).slice(0, 220) : String(item),
      <StatusBadge key={key} value={item ? 'returned' : 'not returned'} />
    ])
}

export default async function OfstedReadinessPage() {
  const readiness = await getInspectionReadiness()
  const raw = readiness.data.raw
  const sections = readiness.data.sections
  const gaps = readiness.data.evidenceGaps
  const actions = readiness.data.actions
  const guardrails = Array.isArray(raw.guardrails) ? raw.guardrails.map(String) : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inspection evidence preparation"
        title="SCCIF and regulatory evidence readiness"
        description="Fast live readiness view for SCCIF, Quality Standards, Children’s Homes Regulations, Reg 44, Reg 45, Reg 40 and Annex A. Full inspection pack generation is reserved for explicit manager review."
        action={<Link prefetch={false} href="/regulatory" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open framework</Link>}
      />
      <LiveDataStatus result={readiness} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Readiness sections" value={sections.length || 'Not calculated'} detail="Fast backend readiness sections" href="/regulatory" />
        <StatCard label="Evidence gaps" value={gaps.length} detail="Returned by readiness endpoint" href="/evidence" />
        <StatCard label="Open actions" value={actions.length} detail="Returned by readiness endpoint" href="/actions" />
        <StatCard label="Manager review" value={raw.signoff_required ? 'Required' : 'Check'} detail="No automatic Ofsted submission" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Framework areas" title="Readiness sections" description="This page now avoids the full command-centre payload on initial render." />
          <DataTable
            headers={['Section', 'Status', 'Summary']}
            rows={sections.map((section) => [
              section.title,
              <StatusBadge key={section.id} value={section.status || 'available'} />,
              section.summary || 'Review available evidence.'
            ])}
            empty={<EmptyState title="No readiness sections returned" description="The backend readiness route did not return sections for this session." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Guardrails" title="Safe inspection use" />
          <div className="space-y-3">
            {guardrails.length ? guardrails.map((guardrail) => (
              <div key={guardrail} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{guardrail}</div>
            )) : <EmptyState title="No guardrails returned" description="The readiness endpoint did not return inspection guardrails." />}
          </div>
        </Card>
      </section>
      <Card>
        <SectionHeader eyebrow="Backend readiness pack" title="Returned readiness fields" description="Raw fields are shown as operational evidence, not an inspection judgement." />
        <DataTable
          headers={['Field', 'Value', 'Status']}
          rows={objectRows(raw)}
          empty={<EmptyState title="No readiness pack returned" description="The backend readiness route did not return a pack for this session, or access is restricted." />}
        />
      </Card>
      <Card>
        <SectionHeader eyebrow="Full pack" title="Generate full draft pack when needed" description="The full inspection pack is still available through the backend using /inspection/readiness?full=true. It is intentionally not generated on every page load." />
        <Link prefetch={false} href="/regulatory" className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Open regulatory framework</Link>
      </Card>
    </div>
  )
}