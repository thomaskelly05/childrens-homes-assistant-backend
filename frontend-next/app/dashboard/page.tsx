import Link from 'next/link'

import { Card, PageHeader, RecordTimeline, SectionHeader, StatCard, StatusBadge, RiskBadge, AlertCard } from '@/components/indicare/ui'
import { getChronologyEvents, getRegulationLinkedEvents } from '@/lib/chronology/selectors'
import type { ChronologyEvent } from '@/lib/chronology/types'
import { getDocumentsNeedingReview } from '@/lib/documents/selectors'
import { getEvidenceGaps, getOpenCareActions } from '@/lib/evidence/selectors'
import { indicareData } from '@/lib/indicare/demo-data'
import { dashboardMetrics, fullName, getStaffById, getYoungPersonById, sortByDateDesc } from '@/lib/indicare/selectors'
import { getEntityRoute } from '@/lib/navigation/entity-resolver'
import { currentHandover, proactiveAssistantSupport } from '@/lib/operations/shift-data'

function childVoiceCount(events: ChronologyEvent[]) {
  return events.filter((event) => event.tags.includes('child-voice') || /child voice|said|told staff|wishes|wanted/i.test(event.fullText)).length
}

function childVoiceGapLabel(count: number) {
  return count ? `${count} chronology events include visible child voice` : 'No visible child voice markers in current chronology'
}

export default function DashboardPage() {
  const metrics = dashboardMetrics()
  const youngPeople = indicareData.youngPeople ?? []
  const appointments = indicareData.appointments ?? []
  const reports = indicareData.reports ?? []
  const recentIncidents = sortByDateDesc(indicareData.incidents, (incident) => incident.dateTime).slice(0, 4)
  const recentLogs = sortByDateDesc(indicareData.dailyLogs, (log) => log.createdAt).slice(0, 4)
  const safeguardingTimeline = sortByDateDesc(indicareData.safeguardingEvents, (event) => event.date).slice(0, 4)
  const chronologyEvents = getChronologyEvents()
  const openCareActions = getOpenCareActions()
  const evidenceGaps = getEvidenceGaps()
  const reviewDocuments = getDocumentsNeedingReview()
  const reg44Actions = openCareActions.filter((action) => action.regulation?.includes('44'))
  const overdueManagerReviews = chronologyEvents.filter((event) => event.tags.includes('overdue-manager-review'))
  const lacReviewsDue = chronologyEvents.filter((event) => event.eventType === 'lac_review' && event.actionIds.length)
  const reg45Prep = getRegulationLinkedEvents(chronologyEvents, 'Regulation 45')
  const handover = currentHandover()
  const assistant = proactiveAssistantSupport()
  const priorityActions = [
    { title: 'Review Noah critical risk controls', body: 'Missing/exploitation risk review is overdue and linked to a new safeguarding concern.', entity: { entity_type: 'young_person', entity_id: 'yp-noah' } },
    { title: 'Record strategy discussion outcome', body: 'Appointment outcome is pending and should update safeguarding chronology.', entity: { entity_type: 'appointment', entity_id: 'appt-strategy-noah', linked_child_id: 'yp-noah' } },
    { title: 'Confirm Jamie medication prompt', body: 'Evening administration history contains an overdue entry for review.', entity: { entity_type: 'medication_record', entity_id: 'med-jamie-evening', linked_child_id: 'yp-jamie' } }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command centre"
        title="Operational command centre"
        description="Today-first operating picture: attention, safeguarding, actions, recording gaps, reviews, wellbeing and inspection readiness without generic analytics clutter."
        action={<Link href="/young-people" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Choose child / record</Link>}
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          {
            question: 'What needs attention?',
            value: handover.childrenRequiringAttention.length,
            body: 'Children with active safeguarding, critical risk or unresolved operational concern.',
            href: '/shifts/current'
          },
          {
            question: 'What is missing?',
            value: evidenceGaps.length + handover.recordingGaps.length,
            body: 'Evidence gaps and recording follow-up that could weaken the story.',
            href: '/evidence'
          },
          {
            question: 'What changed?',
            value: handover.keyEventsToday.length,
            body: 'Key daily notes, incidents and safeguarding changes for handover.',
            href: '/handover/current'
          },
          {
            question: 'What needs review?',
            value: overdueManagerReviews.length + metrics.openIncidents,
            body: 'Manager reviews, incident sign-off and QA attention.',
            href: '/management'
          }
        ].map((item) => (
          <Link key={item.question} href={item.href} className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">{item.question}</p>
            <p className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">{item.value}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="High-risk children" value={metrics.highRisk} detail="High or critical risk" href="/risk-assessments" entity={{ entity_type: 'risk_assessment' }} />
        <StatCard label="Open incidents" value={metrics.openIncidents} detail="Active or review status" href="/incidents" entity={{ entity_type: 'incident' }} />
        <StatCard label="Medication alerts" value={metrics.medicationAlerts} detail="Missed or overdue administration" href="/medication" entity={{ entity_type: 'medication_record' }} />
        <StatCard label="Safeguarding concerns" value={metrics.safeguardingConcerns} detail="Active or monitoring" href="/safeguarding" entity={{ entity_type: 'safeguarding_concern' }} />
        <StatCard label="Chronology activity" value={chronologyEvents.length} detail="Connected events ready for filtering" href="/chronology" entity={{ entity_type: 'chronology_event' }} />
        <StatCard label="Evidence gaps" value={evidenceGaps.length} detail="Evidence still required" href="/evidence" entity={{ entity_type: 'evidence_gap' }} />
        <StatCard label="Overdue manager reviews" value={overdueManagerReviews.length} detail="Manager oversight required" href="/chronology" entity={{ entity_type: 'handover', entity_id: 'manager-reviews' }} />
        <StatCard label="Inspection readiness" value={reg44Actions.length + reg45Prep.length + lacReviewsDue.length + reviewDocuments.length} detail="Reg 44, Reg 45, LAC and document review work" href="/ofsted-readiness" entity={{ entity_type: 'ofsted_concern' }} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Today" title="Shift overview" description="Operational records that need handover awareness today." />
          <div className="grid gap-4 md:grid-cols-2">
            {youngPeople.map((person) => (
              <Link key={person.id} href={getEntityRoute({ entity_type: 'young_person', entity_id: person.id })} className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-lg">
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
          <SectionHeader eyebrow="Priority" title="Actions required" description="Operational priorities with source routes, not disconnected dashboard metrics." />
          <div className="space-y-3">
            {priorityActions.map((action) => <AlertCard key={action.title} {...action} href={getEntityRoute(action.entity)} />)}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionHeader eyebrow="Recording health" title="Gaps and weak-record indicators" description="Helps managers spot duplicated, missing or weak records before inspection pressure." />
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Weak records needing child voice', childVoiceGapLabel(childVoiceCount(chronologyEvents)), '/chronology'],
              ['Evidence gaps', `${evidenceGaps.length} gaps need source evidence`, '/evidence'],
              ['Recording gaps', `${handover.recordingGaps.length} daily recording follow-ups`, '/daily-logs'],
              ['Reviews overdue', `${overdueManagerReviews.length} manager reviews overdue`, '/management']
            ].map(([title, body, href]) => (
              <Link key={title} href={href} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                <p className="text-sm font-black text-slate-950">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Orb copilot" title="Operational prompts" description="Draft-only support for recording, review and handover." />
          <div className="space-y-2">
            {assistant.prompts.slice(1).map((prompt) => (
              <Link key={prompt} href={`/assistant?prompt=${encodeURIComponent(prompt)}`} className="block rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm font-black text-purple-800 transition hover:bg-purple-100">
                {prompt}
              </Link>
            ))}
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
                <Link key={incident.id} href={getEntityRoute({ entity_type: 'incident', entity_id: incident.id, linked_child_id: incident.youngPersonId })} className="block rounded-[22px] border border-slate-100 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-lg">
                  <div className="flex flex-wrap items-center gap-3">
                    <RiskBadge value={incident.severity} />
                    <StatusBadge value={incident.status} />
                    <span className="text-xs font-bold text-slate-400">{new Date(incident.dateTime).toLocaleString('en-GB')}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{incident.type}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{person?.preferredName || 'Unknown young person'}: {incident.outcome}</p>
                </Link>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Appointments" title="Upcoming appointments" />
          <div className="space-y-4">
            {appointments.filter((appointment) => appointment.status !== 'closed').map((appointment) => {
              const person = getYoungPersonById(appointment.youngPersonId)
              const staff = getStaffById(appointment.staffId)
              return (
                <Link key={appointment.id} href={getEntityRoute({ entity_type: 'appointment', entity_id: appointment.id, linked_child_id: appointment.youngPersonId })} className="block rounded-[22px] border border-slate-100 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-lg">
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
              title: `${getYoungPersonById(log.youngPersonId)?.preferredName || 'Unknown young person'} · ${log.shift} shift`,
              date: log.date,
              body: `${log.presentation} Actions: ${log.followUpActions?.join(', ') || 'none'}.`,
              href: getEntityRoute({ entity_type: 'daily_record', entity_id: log.id, linked_child_id: log.youngPersonId })
            }))}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Safeguarding" title="Chronology" />
          <RecordTimeline
            items={safeguardingTimeline.map((event) => ({
              id: event.id,
              title: `${getYoungPersonById(event.youngPersonId)?.preferredName || 'Unknown young person'} · ${event.concernType}`,
              date: event.date,
              body: event.actionTaken,
              href: getEntityRoute({ entity_type: 'safeguarding_concern', entity_id: event.id, linked_child_id: event.youngPersonId })
            }))}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Reports" title="Deadlines" />
          <div className="space-y-4">
            {reports.map((report) => (
              <Link key={report.id} href={getEntityRoute({ entity_type: report.type.toLowerCase().includes('lac') ? 'lac_review' : 'report', entity_id: report.id, linked_child_id: report.youngPersonId })} className="block rounded-[22px] border border-slate-100 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-lg">
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
