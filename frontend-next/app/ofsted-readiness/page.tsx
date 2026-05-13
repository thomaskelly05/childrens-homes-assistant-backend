import Link from 'next/link'

import { Card, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { EvidenceGapCard } from '@/components/indicare/workflows/evidence-gap-card'
import { ManagementOversightPanel } from '@/components/indicare/workflows/management-oversight-panel'
import { NextBestActions } from '@/components/indicare/workflows/next-best-actions'
import { SccifCoveragePanel } from '@/components/indicare/workflows/sccif-coverage-panel'
import { getChronologyEvents } from '@/lib/chronology/selectors'
import { getCareActions, getEvidenceGaps, getEvidenceItems } from '@/lib/evidence/selectors'
import { getRegulatoryCoverage, getSccifCoverage, getQualityStandardCoverage } from '@/lib/regulatory-framework/mapping'

export default function OfstedReadinessPage() {
  const events = getChronologyEvents()
  const evidence = getEvidenceItems()
  const actions = getCareActions()
  const gaps = getEvidenceGaps()
  const regulatoryCoverage = getRegulatoryCoverage(events, evidence, actions)
  const sccifCoverage = getSccifCoverage(events, evidence, actions)
  const qualityCoverage = getQualityStandardCoverage(events, evidence, actions)
  const childrenHomesCoverage = regulatoryCoverage.items.filter((item) => item.reference.framework === 'children_homes_regulations_2015')
  const evidenceGapItems = regulatoryCoverage.evidenceGaps.slice(0, 8)
  const needsReviewItems = regulatoryCoverage.needsReview.slice(0, 6)
  const reg44Actions = actions.filter((action) => action.regulation?.includes('44'))
  const reg45Items = regulatoryCoverage.items.filter((item) => item.reference.framework === 'reg45' || item.reference.code.includes('45'))
  const lacItems = regulatoryCoverage.items.filter((item) => item.reference.framework === 'lac_review')
  const safeguardingItems = regulatoryCoverage.items.filter((item) => item.reference.title.toLowerCase().includes('safeguarding') || item.reference.title.toLowerCase().includes('protection'))
  const childVoiceItems = regulatoryCoverage.items.filter((item) => item.reference.title.toLowerCase().includes('voice') || item.reference.title.toLowerCase().includes('views'))
  const educationItems = regulatoryCoverage.items.filter((item) => item.reference.title.toLowerCase().includes('education'))
  const healthItems = regulatoryCoverage.items.filter((item) => item.reference.title.toLowerCase().includes('health'))
  const leadershipItems = regulatoryCoverage.items.filter((item) => item.reference.title.toLowerCase().includes('leadership') || item.reference.title.toLowerCase().includes('management'))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ofsted readiness"
        title="SCCIF and regulatory evidence readiness"
        description="Readiness indicators based on current demo records. This is not a final compliance judgement; it highlights source evidence, gaps, overdue actions and management oversight needs."
        action={<Link href="/regulatory" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open framework</Link>}
      />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="SCCIF areas" value={sccifCoverage.items.length} detail="Judgement area coverage" href="/regulatory" />
        <StatCard label="Quality Standards" value={qualityCoverage.items.length} detail="Operational quality links" href="/regulatory" />
        <StatCard label="Regulation references" value={childrenHomesCoverage.length} detail="Children's Homes Regulations" href="/regulatory" />
        <StatCard label="Evidence gaps" value={evidenceGapItems.length} detail="Needs action or review" href="/evidence" />
      </section>
      <section className="grid gap-4 md:grid-cols-5">
        <StatCard label="Strong evidence" value={regulatoryCoverage.strongEvidence.length} detail="Readiness indicator" href="/evidence" />
        <StatCard label="Needs review" value={needsReviewItems.length} detail="Review before reliance" href="/actions" />
        <StatCard label="Action overdue" value={actions.filter((action) => action.status === 'overdue').length} detail="Open action register" href="/actions" />
        <StatCard label="Reg 44 actions" value={reg44Actions.length} detail="Independent visitor follow-up" href="/documents/regulatory" />
        <StatCard label="Reg 45 readiness" value={reg45Items.filter((item) => item.evidenceStrength !== 'gap').length} detail="Draft review evidence" href="/reports" />
      </section>
      <Card>
        <SectionHeader eyebrow="Next best actions" title="Operational priorities" />
        <NextBestActions actions={actions} gaps={gaps} coverageItems={regulatoryCoverage.items} />
      </Card>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="SCCIF" title="Judgement area coverage" />
          <SccifCoveragePanel items={sccifCoverage.items} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Management oversight" title="Oversight and review checks" />
          <ManagementOversightPanel events={events} actions={actions} />
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Evidence gaps" title="Clickable gap list" />
          <div className="grid gap-3 md:grid-cols-2">
            {evidenceGapItems.map((item) => <EvidenceGapCard key={item.reference.id} item={item} />)}
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Report readiness" title="Reg 45, LAC review and Ofsted pack" />
          <div className="grid gap-3">
            {[
              ['Reg 44 action status', reg44Actions.length, '/documents/regulatory'],
              ['Reg 45 readiness', reg45Items.filter((item) => item.evidenceStrength !== 'gap').length, '/reports'],
              ['LAC review readiness', lacItems.filter((item) => item.evidenceStrength !== 'gap').length, '/reports'],
              ['Safeguarding evidence strength', safeguardingItems.filter((item) => ['strong', 'adequate'].includes(item.evidenceStrength)).length, '/chronology'],
              ['Children voice evidence', childVoiceItems.filter((item) => item.evidence.length || item.events.length).length, '/evidence'],
              ['Education evidence', educationItems.filter((item) => item.evidence.length || item.events.length).length, '/evidence'],
              ['Health evidence', healthItems.filter((item) => item.evidence.length || item.events.length).length, '/evidence'],
              ['Leadership and management evidence', leadershipItems.filter((item) => item.evidence.length || item.events.length).length, '/regulatory'],
              ['Protection of children evidence', safeguardingItems.filter((item) => item.events.length).length, '/regulatory/chr-reg-12']
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
