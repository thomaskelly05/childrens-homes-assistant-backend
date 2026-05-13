import Link from 'next/link'

import { Card, PageHeader, RecordTimeline, SectionHeader, StatCard, StatusBadge, RiskBadge, AlertCard } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { dashboardMetrics, fullName, getStaffById, getYoungPersonById, sortByDateDesc } from '@/lib/indicare/selectors'

export default function DashboardPage() {
  const metrics = dashboardMetrics()
  const recentIncidents = sortByDateDesc(indicareData.incidents, (incident) => incident.dateTime).slice(0, 4)
  const recentLogs = sortByDateDesc(indicareData.dailyLogs, (log) => log.createdAt).slice(0, 4)
  const safeguardingTimeline = sortByDateDesc(indicareData.safeguardingEvents, (event) => event.date).slice(0, 4)
  const priorityActions = [
    { title: 'Review Noah critical risk controls', body: 'Missing/exploitation risk review is overdue and linked to a new safeguarding concern.', href: '/young-people/yp-noah' },
    { title: 'Record strategy discussion outcome', body: 'Appointment outcome is pending and should update safeguarding chronology.', href: '/appointments' },
    { title: 'Confirm Jamie medication prompt', body: 'Evening administration history contains an overdue entry for review.', href: '/young-people/yp-jamie' }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command centre"
        title="IndiCare OS dashboard"
        description="One joined-up operating picture for placements, safeguarding, incidents, daily records, medication, appointments, evidence and assistant insight."
        action={<Link href="/daily-logs" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">+ New daily log</Link>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current young people" value={metrics.currentYoungPeople} detail="Active care records" href="/young-people" />
        <StatCard label="Available beds" value={metrics.availableBeds} detail="Based on demo capacity of 7" href="/placements" />
        <StatCard label="High-risk young people" value={metrics.highRisk} detail="High or critical risk" href="/risk-assessments" />
        <StatCard label="Open incidents" value={metrics.openIncidents} detail="Active or review status" href="/incidents" />
        <StatCard label="Overdue reports" value={metrics.overdueReports} detail="Need manager action" href="/reports" />
        <StatCard label="Upcoming appointments" value={metrics.upcomingAppointments} detail="Open or review appointments" href="/appointments" />
        <StatCard label="Medication alerts" value={metrics.medicationAlerts} detail="Missed or overdue administration" href="/medication" />
        <StatCard label="Safeguarding concerns" value={metrics.safeguardingConcerns} detail="Active or monitoring" href="/safeguarding" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Today" title="Shift overview" description="Operational records that need handover awareness today." />
          <div className="grid gap-4 md:grid-cols-2">
            {indicareData.youngPeople.map((person) => (
              <Link key={person.id} href={`/young-people/${person.id}`} className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">{person.preferredName}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{person.educationStatus}</p>
                  </div>
                  <RiskBadge value={person.riskLevel} />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{person.healthSummary}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Priority" title="Actions required" />
          <div className="space-y-3">
            {priorityActions.map((action) => <AlertCard key={action.title} {...action} />)}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Incidents" title="Recent incidents" />
          <div className="space-y-4">
            {recentIncidents.map((incident) => {
              const person = getYoungPersonById(incident.youngPersonId)
              return (
                <Link key={incident.id} href={`/incidents/${incident.id}`} className="block rounded-[22px] border border-slate-100 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <RiskBadge value={incident.severity} />
                    <StatusBadge value={incident.status} />
                    <span className="text-xs font-bold text-slate-400">{new Date(incident.dateTime).toLocaleString('en-GB')}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{incident.type}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{person?.preferredName}: {incident.outcome}</p>
                </Link>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Appointments" title="Upcoming appointments" />
          <div className="space-y-4">
            {indicareData.appointments.filter((appointment) => appointment.status !== 'closed').map((appointment) => {
              const person = getYoungPersonById(appointment.youngPersonId)
              const staff = getStaffById(appointment.staffId)
              return (
                <Link key={appointment.id} href="/appointments" className="block rounded-[22px] border border-slate-100 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge value={appointment.status} />
                    <span className="text-xs font-bold text-slate-400">{new Date(appointment.dateTime).toLocaleString('en-GB')}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{appointment.type}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{person?.preferredName} · {appointment.professional} · Staff: {staff ? fullName(staff) : 'Not assigned'}</p>
                </Link>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionHeader eyebrow="Daily logs" title="Recent recording" />
          <RecordTimeline
            items={recentLogs.map((log) => ({
              id: log.id,
              title: `${getYoungPersonById(log.youngPersonId)?.preferredName} · ${log.shift} shift`,
              date: log.date,
              body: `${log.presentation} Actions: ${log.followUpActions.join(', ') || 'none'}.`,
              href: `/young-people/${log.youngPersonId}`
            }))}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Safeguarding" title="Chronology" />
          <RecordTimeline
            items={safeguardingTimeline.map((event) => ({
              id: event.id,
              title: `${getYoungPersonById(event.youngPersonId)?.preferredName} · ${event.concernType}`,
              date: event.date,
              body: event.actionTaken,
              href: `/young-people/${event.youngPersonId}`
            }))}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Reports" title="Deadlines" />
          <div className="space-y-4">
            {indicareData.reports.map((report) => (
              <Link key={report.id} href={`/reports/${report.id}`} className="block rounded-[22px] border border-slate-100 bg-slate-50/70 p-5">
                <StatusBadge value={report.status} />
                <h3 className="mt-3 text-lg font-black text-slate-950">{report.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{report.type} · {report.dateRangeStart} to {report.dateRangeEnd}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
