'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { ActionsPanel, EvidenceGapsPanel, EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { SourceCitationChip } from '@/components/indicare/citations/source-citation-chip'
import { QualityStandardBadges } from '@/components/indicare/workflows/quality-standard-badges'
import { RecordQuestionPanel } from '@/components/indicare/record-question-panel'
import { getActionsFromChronology, getEvidenceGapsFromChronology, filterChronology } from '@/lib/chronology/selectors'
import { ChronologyEvent, ChronologyFilter } from '@/lib/chronology/types'
import { getEvidenceItems } from '@/lib/evidence/selectors'
import { getStaffById, getYoungPersonById } from '@/lib/indicare/selectors'
import { mapEventToRegulatoryReferences } from '@/lib/regulatory-framework/mapping'
import { routeToAction, routeToChronologyEvent, routeToEvidence, routeToSourceRecord } from '@/lib/routes/os-routes'

const savedViews: Array<{ label: string; filters: ChronologyFilter; story?: string }> = [
  { label: 'Tell the story', filters: {}, story: 'A balanced child-centred story across care, progress, risk and relationships.' },
  { label: 'Emotional wellbeing', filters: { searchText: 'wellbeing' }, story: 'Mood, presentation, regulation and emotional support.' },
  { label: 'Placement stability', filters: { eventTypes: ['placement_update', 'risk_review', 'manager_review'] }, story: 'Placement journey, stability, risks and adult oversight.' },
  { label: 'Safeguarding chronology', filters: { safeguardingOnly: true }, story: 'Safeguarding chain with threshold, actions and evidence.' },
  { label: 'Education journey', filters: { searchText: 'education' }, story: 'Attendance, refusal, virtual school, homework and progress.' },
  { label: 'Positive progress', filters: { searchText: 'positive progress achievement independence' }, story: 'Achievements, milestones and progress from starting points.' },
  { label: 'Incidents', filters: { eventTypes: ['incident', 'missing_episode', 'restraint'] } },
  { label: 'Family time', filters: { eventTypes: ['family_contact'], searchText: 'family contact' } },
  { label: 'Health', filters: { eventTypes: ['health', 'medication', 'appointment'] } },
  { label: 'Keywork', filters: { eventTypes: ['keywork', 'direct_work'] } },
  { label: 'Relationships', filters: { searchText: 'relationship contact trusted adult peer' } },
  { label: 'Missing episodes', filters: { eventTypes: ['missing_episode'] } },
  { label: 'Actions required', filters: { actionsRequiredOnly: true } },
  { label: 'Reg 44/Reg 45 evidence', filters: { regulation: 'Reg' } }
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function peopleLabels(ids: string[]) {
  return ids.map((id) => getYoungPersonById(id)?.preferredName || id).join(', ')
}

function staffLabels(ids: string[]) {
  return ids.map((id) => getStaffById(id)?.firstName || id).join(', ')
}

function markerForEvent(event: ChronologyEvent) {
  const text = `${event.title} ${event.summary} ${event.category} ${event.tags.join(' ')}`.toLowerCase()
  if (event.safeguardingFlags.length || event.category.toLowerCase().includes('safeguarding')) {
    return { label: 'Safeguarding chain', className: 'border-red-100 bg-red-50 text-red-700' }
  }
  if (text.includes('positive') || text.includes('achievement') || text.includes('progress') || text.includes('independence')) {
    return { label: 'Positive progress', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' }
  }
  if (text.includes('education') || text.includes('school') || text.includes('homework')) {
    return { label: 'Education journey', className: 'border-blue-100 bg-blue-50 text-blue-700' }
  }
  if (text.includes('family') || text.includes('contact') || text.includes('relationship') || text.includes('peer')) {
    return { label: 'Relationship timeline', className: 'border-purple-100 bg-purple-50 text-purple-700' }
  }
  if (text.includes('health') || text.includes('medication') || text.includes('camhs')) {
    return { label: 'Health timeline', className: 'border-cyan-100 bg-cyan-50 text-cyan-700' }
  }
  return { label: 'Daily life', className: 'border-slate-200 bg-slate-50 text-slate-600' }
}

function emotionalIndicator(event: ChronologyEvent) {
  const text = `${event.title} ${event.summary} ${event.fullText}`.toLowerCase()
  if (event.severity === 'critical' || text.includes('missing') || text.includes('unsafe')) return 'High concern'
  if (event.severity === 'high' || text.includes('anxious') || text.includes('low') || text.includes('worry')) return 'Needs support'
  if (text.includes('settled') || text.includes('positive') || text.includes('completed')) return 'Settled/progress'
  return 'Neutral'
}

export function ChronologyFoundation({
  events,
  initialYoungPersonId
}: {
  events: ChronologyEvent[]
  initialYoungPersonId?: string
}) {
  const [filters, setFilters] = useState<ChronologyFilter>(initialYoungPersonId ? { youngPersonIds: [initialYoungPersonId] } : {})
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined)
  const [searchText, setSearchText] = useState('')

  const mergedFilters = useMemo(() => ({ ...filters, searchText: searchText || filters.searchText }), [filters, searchText])
  const filteredEvents = useMemo(() => filterChronology(events, mergedFilters), [events, mergedFilters])
  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId) || filteredEvents[0]
  const panelEvents = selectedEvent ? [selectedEvent] : filteredEvents
  const panelActions = getActionsFromChronology(panelEvents.length ? panelEvents : filteredEvents)
  const panelGaps = getEvidenceGapsFromChronology(panelEvents.length ? panelEvents : filteredEvents)
  const evidenceIds = new Set((panelEvents.length ? panelEvents : filteredEvents).flatMap((event) => event.evidenceIds))
  const panelEvidence = getEvidenceItems().filter((item) => evidenceIds.has(item.id))
  const categories = Array.from(new Set(events.map((event) => event.category))).sort()
  const staffIds = Array.from(new Set(events.flatMap((event) => event.staffIds))).sort()
  const youngPersonIds = Array.from(new Set(events.flatMap((event) => event.youngPersonIds))).sort()
  const wellbeingCount = events.filter((event) => `${event.category} ${event.tags.join(' ')}`.toLowerCase().includes('wellbeing')).length
  const progressCount = events.filter((event) => markerForEvent(event).label === 'Positive progress').length
  const childVoiceCount = events.filter((event) => event.tags.includes('child-voice') || /child voice|said|told staff|wanted|wishes/i.test(event.fullText)).length

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-black text-slate-950">Saved views</h2>
          <div className="mt-4 space-y-2">
            {savedViews.map((view) => (
              <button
                key={view.label}
                type="button"
                onClick={() => {
                  setFilters(initialYoungPersonId ? { ...view.filters, youngPersonIds: [initialYoungPersonId] } : view.filters)
                  setSearchText(view.filters.searchText || '')
                }}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-slate-100"
              >
                <span className="block">{view.label}</span>
                {view.story ? <span className="mt-1 block text-xs font-bold leading-5 text-slate-400">{view.story}</span> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-black text-slate-950">Filters</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-bold text-slate-600">
              Search
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="risk, Reg 44, contact..." />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Young person
              <select value={filters.youngPersonIds?.[0] || ''} onChange={(event) => setFilters((current) => ({ ...current, youngPersonIds: event.target.value ? [event.target.value] : undefined }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <option value="">All</option>
                {youngPersonIds.map((id) => <option key={id} value={id}>{getYoungPersonById(id)?.preferredName || id}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Staff member
              <select value={filters.staffIds?.[0] || ''} onChange={(event) => setFilters((current) => ({ ...current, staffIds: event.target.value ? [event.target.value] : undefined }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <option value="">All</option>
                {staffIds.map((id) => <option key={id} value={id}>{getStaffById(id)?.firstName || id}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Category
              <select value={filters.categories?.[0] || ''} onChange={(event) => setFilters((current) => ({ ...current, categories: event.target.value ? [event.target.value] : undefined }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <option value="">All</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Regulation
              <input value={filters.regulation || ''} onChange={(event) => setFilters((current) => ({ ...current, regulation: event.target.value || undefined }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" placeholder="Regulation 44" />
            </label>
            <div className="space-y-2">
              {[
                ['safeguardingOnly', 'Safeguarding only'],
                ['evidenceOnly', 'Evidence attached'],
                ['actionsRequiredOnly', 'Actions required']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  <input type="checkbox" checked={Boolean(filters[key as keyof ChronologyFilter])} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.checked || undefined }))} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </section>
      </aside>

      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-purple-100 bg-purple-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-700">Child voice</p>
            <p className="mt-2 text-2xl font-black text-purple-950">{childVoiceCount}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-purple-800">Visible wishes, feelings, words or participation markers.</p>
          </div>
          <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Positive progress</p>
            <p className="mt-2 text-2xl font-black text-emerald-950">{progressCount}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">Achievements, milestones and progress from starting points.</p>
          </div>
          <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Wellbeing story</p>
            <p className="mt-2 text-2xl font-black text-blue-950">{wellbeingCount}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-blue-800">Emotional wellbeing indicators and support themes.</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Connected care chronology</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{filteredEvents.length} events</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">A living story with source records, actions, evidence, child voice and regulatory context kept together.</p>
            </div>
            <Link href="/reports" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">Use filtered set in report</Link>
          </div>
        </div>

        <div className="relative space-y-5 before:absolute before:left-5 before:top-4 before:h-[calc(100%-32px)] before:w-px before:bg-slate-200">
          {filteredEvents.map((event) => {
            const references = mapEventToRegulatoryReferences(event)
            const marker = markerForEvent(event)
            const emotion = emotionalIndicator(event)
            const hasChildVoice = event.tags.includes('child-voice') || /child voice|said|told staff|wanted|wishes/i.test(event.fullText)
            return (
              <article key={event.id} className="relative pl-12">
                <button type="button" onClick={() => setSelectedEventId(event.id)} className={`absolute left-0 top-7 h-10 w-10 rounded-full border ${selectedEvent?.id === event.id ? 'border-blue-300 bg-blue-100' : 'border-slate-200 bg-white'}`} aria-label={`Select ${event.title}`} />
                <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">{event.eventType.replaceAll('_', ' ')}</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{event.severity}</span>
                  <span className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${marker.className}`}>{marker.label}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">{emotion}</span>
                  {hasChildVoice ? <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-purple-700">Child voice</span> : null}
                  <span className="text-xs font-bold text-slate-400">{formatDate(event.dateTime)}</span>
                </div>
                <Link href={routeToChronologyEvent(event.id)} className="mt-4 block text-2xl font-black tracking-[-0.04em] text-slate-950 hover:text-blue-700">{event.title}</Link>
                <p className="mt-3 text-sm leading-7 text-slate-600">{event.summary}</p>
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Living story thread</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {marker.label} - {emotion}. Linked records: {event.linkedRecordIds.length || 1}; actions: {event.actionIds.length}; evidence: {event.evidenceIds.length}.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{event.category}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Child: {peopleLabels(event.youngPersonIds)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Staff: {staffLabels(event.staffIds)}</span>
                  {event.evidenceIds.length ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{event.evidenceIds.length} evidence</span> : null}
                  {event.actionIds.length ? <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">{event.actionIds.length} actions</span> : null}
                </div>
                <div className="mt-4">
                  <QualityStandardBadges references={references} limit={5} />
                </div>
                <div className="mt-4">
                  <SourceCitationChip label={event.citationLabel} href={routeToChronologyEvent(event.id)} sourceType={event.sourceType} sourceId={event.sourceId} sourceDate={formatDate(event.dateTime)} confidence={event.regulationLinks.some((link) => link.confidence === 'direct') ? 'direct' : 'supporting'} reviewRequired={event.tags.includes('manager-review') || event.tags.includes('overdue-manager-review')} excerpt={event.summary} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedEventId(event.id)} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Ask Orb about this</button>
                  <Link href="/reports" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Use in report</Link>
                  <Link href={routeToChronologyEvent(event.id)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Open detail</Link>
                  <Link href={routeToSourceRecord(event.sourceType, event.sourceId)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Open source record</Link>
                  <Link href={`/chronology?cluster=${encodeURIComponent(event.id)}`} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Show surrounding events</Link>
                  {event.actionIds[0] ? <Link href={routeToAction(event.actionIds[0])} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Open linked action</Link> : null}
                  {event.evidenceIds[0] ? <Link href={routeToEvidence(event.evidenceIds[0])} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Open linked evidence</Link> : null}
                </div>
              </div>
            </article>
            )
          })}
        </div>
      </section>

      <aside className="space-y-5">
        <RecordQuestionPanel
          key={selectedEvent?.id || 'all'}
          scope={selectedEvent ? { eventIds: [selectedEvent.id] } : { youngPersonIds: initialYoungPersonId ? [initialYoungPersonId] : undefined }}
          title={selectedEvent ? 'Ask about selected event' : 'Ask about this chronology'}
          defaultQuestion={selectedEvent ? `Summarise "${selectedEvent.title}" with citations.` : initialYoungPersonId ? 'Tell this child’s story across wellbeing, safety, relationships and progress.' : 'Summarise safeguarding concerns in the last 30 days.'}
          prompts={selectedEvent ? ['What actions are linked?', 'What evidence is attached?', 'What would Ofsted want to see here?'] : ['Tell the child story', 'Show emotional wellbeing', 'Show placement stability', 'Show education journey', 'Show positive progress']}
        />
        <section className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-black text-slate-950">Relationship graph</h2>
          <div className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">Chronology breadcrumbs: child - source record - evidence - actions - regulatory references.</div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">Drilldowns: show linked records, inspection relevance and surrounding events from the selected event.</div>
          </div>
        </section>
        <section className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-black text-slate-950">Actions required</h2>
          <div className="mt-4"><ActionsPanel actions={panelActions} /></div>
        </section>
        <section className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-black text-slate-950">Evidence gaps</h2>
          <div className="mt-4"><EvidenceGapsPanel gaps={panelGaps} /></div>
        </section>
        <section className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-black text-slate-950">Evidence attached</h2>
          <div className="mt-4"><EvidenceItemsPanel evidence={panelEvidence} /></div>
        </section>
      </aside>
    </div>
  )
}
