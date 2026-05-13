import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, RiskBadge, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { getStaffById, getYoungPersonById, isOverdue } from '@/lib/indicare/selectors'

export default function RiskAssessmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Risk" title="Risk assessments" description="Risk overview grouped by young person, category, risk level, control measures, review date and overdue review status." />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Assessments" value={indicareData.riskAssessments.length} />
        <StatCard label="Critical" value={indicareData.riskAssessments.filter((risk) => risk.riskLevel === 'critical').length} />
        <StatCard label="High" value={indicareData.riskAssessments.filter((risk) => risk.riskLevel === 'high').length} />
        <StatCard label="Overdue reviews" value={indicareData.riskAssessments.filter((risk) => risk.status === 'overdue' || isOverdue(risk.reviewDate)).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Register" title="Risks by young person" />
        <DataTable
          headers={['Young person', 'Category', 'Risk', 'Description', 'Controls', 'Review date', 'Reviewed by', 'Status']}
          rows={indicareData.riskAssessments.map((risk) => {
            const person = getYoungPersonById(risk.youngPersonId)
            const reviewer = getStaffById(risk.reviewedBy)
            return [
              person ? <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{person.preferredName}</Link> : risk.youngPersonId,
              risk.category,
              <RiskBadge key="risk" value={risk.riskLevel} />,
              risk.description,
              risk.controlMeasures.join(', '),
              risk.reviewDate,
              reviewer?.firstName || risk.reviewedBy,
              <StatusBadge key="status" value={risk.status} />
            ]
          })}
          empty={<EmptyState title="No risk assessments" description="No risk assessments are recorded." />}
        />
      </Card>
    </div>
  )
}
