import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, RecordTimeline, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceStaffProfile } from '@/lib/os-api/workforce'

function count(value: unknown[] | undefined) {
  return Array.isArray(value) ? value.length : 0
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profileResult = await getWorkforceStaffProfile(id)
  const profile = profileResult.data
  if (!profile) notFound()
  const member = profile.staff
  const intelligence = profile.intelligence
  const quality = intelligence?.recording_quality?.home_trends
  const risk = intelligence?.risk?.staff_risks?.[0]
  const timelineItems = (intelligence?.chronology?.events ?? []).slice(0, 8).map((event) => ({
    id: String(event.id),
    title: String(event.title || event.event_type || 'Workforce event'),
    date: String(event.event_at || 'Date not returned'),
    body: String(event.summary || event.severity || 'No summary returned.'),
    href: event.route ? String(event.route) : undefined
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Staff profile hub"
        title={member.title}
        description="One central adult/workforce journey profile for employment, safer recruitment, training, supervision, probation, wellbeing, evidence, documents and practice quality."
        action={<Link href="/staff" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Staff dashboard</Link>}
      />
      <LiveDataStatus result={profileResult} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Training issues" value={(profile.training.summary.due || 0) + (profile.training.summary.expired || 0) + (profile.training.summary.missing || 0)} detail="Due, expired or missing" href={`/staff/training-matrix?staff_id=${encodeURIComponent(id)}`} />
        <StatCard label="Supervision records" value={profile.supervision.records.length} detail="Draft to archive workflow" href={`/staff/supervision?staff_id=${encodeURIComponent(id)}`} />
        <StatCard label="Probation reviews" value={profile.probation.reviews.length} detail="1, 3 and 6 month support" href={`/staff/probation?staff_id=${encodeURIComponent(id)}`} />
        <StatCard label="Evidence links" value={profile.evidence.length} detail="Reg 13 / SCCIF" href="/staff/evidence" />
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Risk score" value={risk?.score ?? 'n/a'} detail={risk?.level ? `Current level: ${risk.level}` : 'No risk score returned'} href={`/staff/risk?staff_id=${encodeURIComponent(id)}`} />
        <StatCard label="Recording quality" value={quality?.average_score ?? 'n/a'} detail={`${quality?.records_reviewed ?? 0} records scored`} href={`/staff/recording-quality?staff_id=${encodeURIComponent(id)}`} />
        <StatCard label="Chronology events" value={intelligence?.chronology?.summary?.total ?? 0} detail="Evidence-aware timeline" href={`/staff/${encodeURIComponent(id)}/chronology`} />
      </section>
      <Card>
        <SectionHeader eyebrow="Workforce chronology" title="Evidence-aware staff timeline" description="Aggregates supervision, training, probation, wellbeing, practice concerns, incidents, recognition and lifecycle events." />
        <RecordTimeline items={timelineItems} />
      </Card>
      <Card>
        <SectionHeader eyebrow="Overview" title="Employment and safer recruitment" description="Protected data only appears when the backend returns it for the current role." />
        <DataTable
          headers={['Section', 'Current evidence']}
          rows={[
            ['Employment', `${profile.employment.employment_status || profile.overview.status || 'active'} · ${profile.employment.role || 'role not returned'}`],
            ['Home', String(profile.employment.home_id || 'not returned')],
            ['DBS', profile.dbs ? 'DBS evidence returned' : 'No DBS evidence returned'],
            ['Right to work', profile.right_to_work ? 'Right to work evidence returned' : 'No right to work evidence returned'],
            ['References', `${count(profile.references)} reference records`],
            ['Qualifications', `${count(profile.qualifications)} qualification records`],
            ['Documents', `${count(profile.documents)} staff documents`]
          ]}
          empty={<EmptyState title="No overview returned" description="The profile route returned no overview sections." />}
        />
      </Card>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Supervision" title="Reflective practice and actions" />
          {profile.supervision.records.length ? (
            <div className="space-y-3">
              {profile.supervision.records.slice(0, 5).map((record) => (
                <article key={String(record.id)} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm text-slate-950">{record.title || 'Supervision record'}</strong>
                    <StatusBadge value={String(record.status || 'recorded')} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{record.notes || record.reflection || record.journal_summary || 'No summary returned.'}</p>
                </article>
              ))}
            </div>
          ) : <EmptyState title="No supervision returned" description="Create a draft supervision or submit staff journal evidence." />}
        </Card>
        <Card>
          <SectionHeader eyebrow="Inspection readiness" title="Evidence, tasks and quality signals" />
          <div className="grid gap-3">
            {[
              ['Tasks', profile.tasks.length],
              ['Wellbeing flags', profile.wellbeing.length],
              ['Practice concerns', profile.concerns.length],
              ['Recording history', profile.recording_history.length],
              ['Shift history', profile.shift_history.length],
              ['Appraisals', profile.appraisals.length]
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-bold text-slate-600">{label}</span>
                <span className="font-black text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
