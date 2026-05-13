import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AlertCard, Card, PageHeader, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { buildIncidentSummary } from '@/lib/indicare/reports'
import { fullName, getStaffById, getYoungPersonById } from '@/lib/indicare/selectors'

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const incident = indicareData.incidents.find((item) => item.id === id)
  if (!incident) notFound()
  const person = getYoungPersonById(incident.youngPersonId)
  const sections = buildIncidentSummary(incident.id)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Incident detail" title={incident.type} description={`${person?.preferredName || 'Young person'} · ${incident.location} · ${new Date(incident.dateTime).toLocaleString('en-GB')}`} action={<Link href="/assistant" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Assistant summary</Link>} />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <Card>
          <SectionHeader eyebrow="Record" title="What happened" />
          <div className="flex flex-wrap gap-3">
            <RiskBadge value={incident.severity} />
            <StatusBadge value={incident.status} />
            {incident.safeguardingRequired ? <StatusBadge value="Safeguarding required" /> : null}
          </div>
          <div className="mt-6 space-y-5 text-sm leading-7 text-slate-600">
            <p><strong className="text-slate-950">Description:</strong> {incident.description}</p>
            <p><strong className="text-slate-950">Trigger:</strong> {incident.trigger}</p>
            <p><strong className="text-slate-950">De-escalation:</strong> {incident.deEscalationUsed.join(', ')}</p>
            <p><strong className="text-slate-950">Outcome:</strong> {incident.outcome}</p>
            <p><strong className="text-slate-950">Injuries:</strong> {incident.injuries}</p>
            <p><strong className="text-slate-950">Agencies:</strong> Police {incident.policeInvolved ? 'involved' : 'not involved'}, ambulance {incident.ambulanceInvolved ? 'involved' : 'not involved'}.</p>
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Oversight" title="Follow-up and review" />
          <div className="space-y-3">
            {incident.followUpActions.map((action) => <AlertCard key={action} title="Follow-up action" body={action} />)}
            <AlertCard title="Manager review" body={incident.managerReview} />
          </div>
          <div className="mt-5 rounded-[22px] border border-slate-100 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
            Staff involved: {incident.staffIds.map((staffId) => getStaffById(staffId)).filter(Boolean).map((staff) => staff ? fullName(staff) : '').join(', ')}
          </div>
        </Card>
      </section>
      <Card>
        <SectionHeader eyebrow="Assistant-ready draft" title="Structured incident summary" />
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => <AlertCard key={section.title} title={section.title} body={section.body} />)}
        </div>
      </Card>
    </div>
  )
}
