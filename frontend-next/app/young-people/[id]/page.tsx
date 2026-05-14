import Link from 'next/link'
import { notFound } from 'next/navigation'

import { RecordQuestionPanel } from '@/components/indicare/record-question-panel'
import { AlertCard, Card, DataTable, EmptyState, PageHeader, RecordTimeline, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { buildOfstedEvidenceOutline, buildRiskReview, buildSafeguardingChronology, buildWeeklyCareSummary } from '@/lib/indicare/reports'
import { fullName, getStaffById, getYoungPersonSummary } from '@/lib/indicare/selectors'

export default async function YoungPersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const summary = getYoungPersonSummary(id)
  if (!summary) notFound()

  const person = summary.youngPerson
  const tabs = ['Overview', 'Chronology', 'Daily Logs', 'Incidents', 'Risk', 'Safeguarding', 'Medication', 'Keywork', 'Appointments', 'Documents', 'Reports', 'Audit']
  const weekly = buildWeeklyCareSummary(id)
  const risk = buildRiskReview(id)
  const safeguarding = buildSafeguardingChronology(id)
  const ofsted = buildOfstedEvidenceOutline(id)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Young person record"
        title={`${person.preferredName} ${person.lastName}`}
        description={`${person.legalStatus}. ${person.communicationNeeds}`}
        action={<Link href="/assistant" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Ask assistant</Link>}
      />

      <div className="flex gap-2 overflow-auto rounded-[24px] border border-white/70 bg-white/80 p-2 shadow-sm">
        {tabs.map((tab, index) => (
          <Link key={tab} href={tab === 'Chronology' ? `/young-people/${id}/chronology` : `#${tab.toLowerCase().replace(/\s+/g, '-')}`} className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-black ${index === 0 ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>{tab}</Link>
        ))}
      </div>

      <section id="overview" className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Profile" title="Overview" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
              <RiskBadge value={person.riskLevel} />
              <StatusBadge value={person.safeguardingStatus} />
              <h2 className="mt-4 text-2xl font-black text-slate-950">{fullName(person)}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">Age {person.age} · {person.gender} · {person.educationStatus}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{person.healthSummary}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
              <h3 className="text-lg font-black text-slate-950">Placement</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{summary.placement?.placementType} with {summary.placement?.localAuthority}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Social worker: {summary.placement?.socialWorkerName} · {summary.placement?.socialWorkerContact}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {summary.placement?.placementGoals.map((goal) => <li key={goal}>{goal}</li>)}
              </ul>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
              <h3 className="text-lg font-black text-slate-950">Key contacts</h3>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <p>Key worker: {summary.keyWorker ? fullName(summary.keyWorker) : 'Unallocated'}</p>
                {person.importantContacts.map((contact) => <p key={contact.name}>{contact.name} · {contact.relationship} · {contact.phone}</p>)}
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
              <h3 className="text-lg font-black text-slate-950">Likes, dislikes and needs</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">Likes: {person.likes.join(', ')}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Dislikes: {person.dislikes.join(', ')}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Allergies: {person.allergies.join(', ')}</p>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Assistant actions" title="Contextual care actions" />
          <div className="space-y-3">
            {['Summarise this young person', 'Draft weekly care summary', 'Identify missing evidence', 'Prepare handover', 'Create risk review outline', 'Summarise recent incidents'].map((action) => (
              <Link key={action} href="/assistant" className="block rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-black text-slate-700 hover:bg-slate-100">{action}</Link>
            ))}
          </div>
        </Card>
      </section>

      <RecordQuestionPanel scope={{ youngPersonIds: [id], dateFrom: '2026-05-07', dateTo: '2026-05-13' }} title={`Ask IndiCare about ${person.preferredName}'s records`} defaultQuestion={`What has changed for ${person.preferredName} this week?`} />

      <Card>
        <SectionHeader eyebrow="Timeline" title="Recent joined-up timeline" description="Open the full chronology for source citations, evidence gaps, actions and report-ready filtering." />
        <Link href={`/young-people/${id}/chronology`} className="mb-5 inline-flex rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open full chronology</Link>
        <RecordTimeline
          items={[
            ...summary.dailyLogs.map((log) => ({ id: log.id, title: `${log.shift} daily log`, date: log.date, body: log.presentation })),
            ...summary.incidents.map((incident) => ({ id: incident.id, title: incident.type, date: new Date(incident.dateTime).toLocaleDateString('en-GB'), body: incident.outcome, href: `/incidents/${incident.id}` })),
            ...summary.safeguarding.map((event) => ({ id: event.id, title: event.concernType, date: event.date, body: event.actionTaken }))
          ].slice(0, 9)}
        />
      </Card>

      <section id="daily-logs" className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Daily logs" title="Recent daily recording" />
          <DataTable
            headers={['Date', 'Shift', 'Mood', 'Staff', 'Actions']}
            rows={summary.dailyLogs.map((log) => [log.date, log.shift, log.mood, getStaffById(log.staffId)?.firstName || 'Staff', log.followUpActions.join(', ') || 'None'])}
            empty={<EmptyState title="No daily logs" description="No daily logs are linked to this young person yet." />}
          />
        </Card>

        <Card id="incidents">
          <SectionHeader eyebrow="Incidents" title="Incident history" />
          <DataTable
            headers={['Date', 'Type', 'Severity', 'Status', 'Follow-up']}
            rows={summary.incidents.map((incident) => [new Date(incident.dateTime).toLocaleDateString('en-GB'), <Link key={incident.id} href={`/incidents/${incident.id}`} className="font-bold text-blue-700">{incident.type}</Link>, <RiskBadge key="severity" value={incident.severity} />, <StatusBadge key="status" value={incident.status} />, incident.followUpActions.join(', ')])}
            empty={<EmptyState title="No incidents" description="No incidents match this young person's record." />}
          />
        </Card>
      </section>

      <section id="risk" className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Risk" title="Risk assessments" />
          <DataTable
            headers={['Category', 'Risk', 'Review', 'Controls']}
            rows={summary.risks.map((item) => [item.category, <RiskBadge key="risk" value={item.riskLevel} />, item.reviewDate, item.controlMeasures.join(', ')])}
            empty={<EmptyState title="No risk assessments" description="No risk assessments are linked yet." />}
          />
        </Card>
        <Card id="safeguarding">
          <SectionHeader eyebrow="Safeguarding" title="Chronology" />
          <DataTable
            headers={['Date', 'Concern', 'Action', 'Status']}
            rows={summary.safeguarding.map((item) => [item.date, item.concernType, item.actionTaken, <StatusBadge key="status" value={item.status} />])}
            empty={<EmptyState title="No safeguarding entries" description="No safeguarding records are linked yet." />}
          />
        </Card>
      </section>

      <section id="medication" className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Medication" title="Medication and allergies" />
          <DataTable
            headers={['Medication', 'Dosage', 'Frequency', 'Alert']}
            rows={summary.medication.map((med) => [med.medicationName, med.dosage, med.frequency, med.administrationHistory.some((entry) => ['missed', 'overdue'].includes(entry.status)) ? 'Check administration history' : 'No alert'])}
            empty={<EmptyState title="No medication" description="No medication records are linked yet." />}
          />
        </Card>
        <Card id="keywork">
          <SectionHeader eyebrow="Keywork" title="Voice and direct work" />
          <DataTable
            headers={['Date', 'Topic', 'Young person voice', 'Next']}
            rows={summary.keywork.map((session) => [session.date, session.topic, session.youngPersonVoice, session.nextSessionDate])}
            empty={<EmptyState title="No keywork sessions" description="No keywork sessions are linked yet." />}
          />
        </Card>
      </section>

      <section id="appointments" className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Appointments" title="Appointments" />
          <DataTable
            headers={['Date', 'Type', 'Professional', 'Outcome']}
            rows={summary.appointments.map((appointment) => [new Date(appointment.dateTime).toLocaleString('en-GB'), appointment.type, appointment.professional, appointment.outcome])}
            empty={<EmptyState title="No appointments" description="No appointments are linked yet." />}
          />
        </Card>
        <Card id="documents">
          <SectionHeader eyebrow="Documents" title="Documents and reports" />
          <DataTable
            headers={['Title', 'Category/type', 'Review/status']}
            rows={[
              ...summary.documents.map((doc) => [doc.title, doc.category, doc.reviewDate]),
              ...summary.reports.map((report) => [<Link key={report.id} href={`/reports/${report.id}`} className="font-bold text-blue-700">{report.title}</Link>, report.type, <StatusBadge key="status" value={report.status} />])
            ]}
            empty={<EmptyState title="No documents or reports" description="No documents or reports are linked yet." />}
          />
        </Card>
      </section>

      <section id="reports" className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Report drafts" title="Structured generated sections" description="Preview of report generation foundations from connected records." />
          <div className="space-y-4">
            {[weekly[0], weekly[1], risk[0], safeguarding[0], ofsted[8]].map((section) => (
              <AlertCard key={section.title} title={section.title} body={section.body} />
            ))}
          </div>
        </Card>
        <Card id="audit">
          <SectionHeader eyebrow="Audit" title="Audit trail foundations" />
          <DataTable
            headers={['When', 'Actor', 'Action']}
            rows={summary.audit.map((event) => [new Date(event.timestamp).toLocaleString('en-GB'), getStaffById(event.actorId)?.firstName || event.actorId, event.action])}
            empty={<EmptyState title="No audit events" description="No audit events are linked to this record yet." />}
          />
        </Card>
      </section>
    </div>
  )
}
