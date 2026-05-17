import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, RiskBadge, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function RiskAssessmentsPage() {
  const riskResult = await getOsChronology({ sourceType: 'risk_assessment' })
  const risks = riskResult.data

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Risk" title="Risk assessments" description="Risk overview grouped by young person, category, risk level, control measures, review date and overdue review status." />
      <LiveDataStatus result={riskResult} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Assessments" value={risks.length} />
        <StatCard label="Critical" value={risks.filter((risk) => risk.severity === 'critical').length} />
        <StatCard label="High" value={risks.filter((risk) => risk.severity === 'high').length} />
        <StatCard label="Actions linked" value={risks.filter((risk) => risk.actionIds.length).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Register" title="Risks by young person" />
        <DataTable
          headers={['Young person', 'Category', 'Risk', 'Summary', 'Evidence', 'Actions', 'Status']}
          rows={risks.map((risk) => [
            risk.youngPersonIds[0] ? <Link key={risk.id} href={`/young-people/${risk.youngPersonIds[0]}`} className="font-bold text-blue-700">Child {risk.youngPersonIds[0]}</Link> : 'Home-wide',
            risk.category,
            <RiskBadge key="risk" value={risk.severity} />,
            risk.summary,
            risk.evidenceIds.length,
            risk.actionIds.length,
            <StatusBadge key="status" value={risk.tags.includes('manager-review') ? 'review' : 'recorded'} />
          ])}
          empty={<EmptyState title="No risk assessments" description="No risk assessments are recorded." />}
        />
      </Card>
    </div>
  )
}
