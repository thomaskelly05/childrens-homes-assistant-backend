import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalLifecyclePanel } from '@/components/indicare/operational-lifecycle-panel'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { deriveLifecycleState } from '@/lib/lifecycle/selectors'
import { getCommandCentre, getInspectionReadiness } from '@/lib/os-api/platform'

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
  const [readiness, command] = await Promise.all([getInspectionReadiness(), getCommandCentre()])
  const evidenceReview = command.data.evidence.filter((item) => ['draft', 'partial', 'review_required'].includes(item.quality))
  const documentReview = command.data.documents.filter((document) => ['review_required', 'action_plan_open', 'processing'].includes(document.status))
  const reg44Evidence = command.data.documents.filter((document) => document.documentType.includes('reg44') || document.regulation?.includes('44'))
  const reg45Evidence = command.data.documents.filter((document) => document.documentType.includes('reg45') || document.regulation?.includes('45'))
  const safeguardingEvidence = command.data.chronology.filter((event) => event.safeguardingFlags.length || event.category.toLowerCase().includes('safeguard'))
  const childVoiceMarkers = command.data.chronology.filter((event) => /child voice|said|told|wanted|wishes/i.test(`${event.title} ${event.summary} ${event.fullText} ${event.tags.join(' ')}`))
  const traceabilityLifecycle = [
    ...readiness.data.evidenceGaps.map((item) => deriveLifecycleState(item.raw || item, 'inspection_evidence_gap')),
    ...evidenceReview.map((item) => deriveLifecycleState(item as any, 'evidence')),
    ...documentReview.map((item) => deriveLifecycleState(item as any, 'document')),
    ...command.data.actions.filter((action) => action.status !== 'completed').map((item) => deriveLifecycleState(item as any, 'inspection_action'))
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inspection readiness"
        title="SCCIF and regulatory evidence readiness"
        description="Operational evidence organisation for SCCIF, Quality Standards, Children’s Homes Regulations, Reg 44, Reg 45, Reg 40 and Annex A. No inspection score is shown unless the backend returns one."
        action={<Link href="/regulatory" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open framework</Link>}
      />
      <LiveDataStatus result={readiness} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Readiness sections" value={readiness.data.sections.length || 'Not calculated'} detail="Backend pack sections" href="/regulatory" />
        <StatCard label="Evidence gaps" value={readiness.data.evidenceGaps.length + evidenceReview.length} detail="Backend gaps plus review-required evidence" href="/evidence" />
        <StatCard label="Reg 44 evidence" value={reg44Evidence.length} detail="Documents linked to Reg 44" href="/documents/regulatory" />
        <StatCard label="Reg 45 evidence" value={reg45Evidence.length} detail="Documents linked to Reg 45" href="/reports" />
        <StatCard label="Safeguarding evidence" value={safeguardingEvidence.length} detail="Chronology with safeguarding relevance" href="/safeguarding" />
        <StatCard label="Child voice markers" value={childVoiceMarkers.length} detail="Visible wishes/feelings markers" href="/chronology" />
        <StatCard label="Documents for review" value={documentReview.length} detail="Review or sign-off needed" href="/documents" />
        <StatCard label="Open actions" value={command.data.actions.filter((action) => action.status !== 'completed').length} detail="Follow-up evidence queue" href="/actions" />
      </section>
      <Card>
        <SectionHeader eyebrow="Backend readiness pack" title="Returned readiness fields" description="Raw fields are shown as operational evidence, not an inspection judgement." />
        <DataTable
          headers={['Field', 'Value', 'Status']}
          rows={objectRows(readiness.data.raw)}
          empty={<EmptyState title="No readiness pack returned" description="The backend readiness route did not return a pack for this session, or access is restricted." />}
        />
      </Card>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Evidence gaps" title="Gaps and review-required evidence" />
          <DataTable
            headers={['Item', 'Status', 'Why it matters']}
            rows={[
              ...readiness.data.evidenceGaps.map((gap) => [gap.title, <StatusBadge key={gap.id} value={gap.status || 'possible gap'} />, gap.summary]),
              ...evidenceReview.map((item) => [<Link key={item.id} href={`/evidence/${encodeURIComponent(item.id)}`} className="font-black text-slate-950 hover:text-blue-700">{item.title}</Link>, <StatusBadge key={item.id} value={item.quality.replaceAll('_', ' ')} />, item.description || item.linkedRegulation || 'Evidence needs review before reliance.'])
            ]}
            empty={<EmptyState title="No evidence gaps returned" description="No backend evidence gaps or review-required evidence were returned." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Actions" title="Inspection-related follow-up" />
          <DataTable
            headers={['Action', 'Status', 'Evidence required']}
            rows={command.data.actions.filter((action) => action.status !== 'completed').slice(0, 10).map((action) => [
              <Link key={action.id} href={`/actions/${encodeURIComponent(action.id)}`} className="font-black text-slate-950 hover:text-blue-700">{action.title}</Link>,
              <StatusBadge key={action.id} value={action.status} />,
              action.evidenceRequired.join(', ') || action.description || 'Review source record.'
            ])}
            empty={<EmptyState title="No open actions returned" description="The backend did not return open inspection or evidence actions." />}
          />
        </Card>
      </section>
      <Card>
        <OperationalLifecyclePanel
          title="Inspection evidence lifecycle"
          description="Evidence gaps, review-required documents and open inspection actions are shown as traceable operational states."
          items={traceabilityLifecycle}
          hrefForItem={(item) => item.entityType.includes('document') ? `/documents/${encodeURIComponent(item.id)}` : item.entityType.includes('evidence') ? `/evidence/${encodeURIComponent(item.id)}` : undefined}
        />
      </Card>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Regulatory mapping" title="Framework areas" description="Routes exist for SCCIF, Quality Standards, Children’s Homes Regulations, Reg 44, Reg 45, Reg 40 and Annex A readiness; typed backend DTOs remain the next step." />
          <div className="grid gap-3 md:grid-cols-2">
            {['SCCIF', 'Quality Standards', 'Children’s Homes Regulations', 'Annex A', 'Reg 44', 'Reg 45', 'Reg 40', 'Leadership and management'].map((label) => (
              <Link key={label} href="/regulatory" className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-700 hover:bg-blue-50">{label}</Link>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Report readiness" title="Evidence relationship shortcuts" />
          <div className="grid gap-3">
            {[
              ['Reg 44 documents', reg44Evidence.length, '/documents/regulatory'],
              ['Reg 45 documents', reg45Evidence.length, '/reports'],
              ['Safeguarding-linked chronology', safeguardingEvidence.length, '/safeguarding'],
              ['Child voice evidence markers', childVoiceMarkers.length, '/chronology'],
              ['Evidence review queue', evidenceReview.length, '/evidence'],
              ['Documents awaiting review', documentReview.length, '/documents']
            ].map(([label, value, href]) => (
              <Link key={label} href={href as string} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                <span>{label}</span>
                <span>{value}</span>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
