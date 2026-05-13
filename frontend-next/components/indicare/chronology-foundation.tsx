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
import { routeToChronologyEvent, routeToSourceRecord } from '@/lib/routes/os-routes'

const savedViews: Array<{ label: string; filters: ChronologyFilter }> = [
  { label: 'All chronology', filters: {} },
  { label: 'Safeguarding', filters: { safeguardingOnly: true } },
  { label: 'Incidents', filters: { eventTypes: ['incident', 'missing_episode'] } },
  { label: 'Education', filters: { searchText: 'education' } },
  { label: 'Health', filters: { eventTypes: ['health', 'medication'] } },
  { label: 'Regulation evidence', filters: { regulation: 'Regulation' } },
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
                {view.label}
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
        <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Connected care chronology</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{filteredEvents.length} events</h2>
            </div>
            <Link href="/reports" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">Use filtered set in report</Link>
          </div>
        </div>

        <div className="relative space-y-5 before:absolute before:left-5 before:top-4 before:h-[calc(100%-32px)] before:w-px before:bg-slate-200">
          {filteredEvents.map((event) => {
            const references = mapEventToRegulatoryReferences(event)
            return (
              <article key={event.id} className="relative pl-12">
                <button type="button" onClick={() => setSelectedEventId(event.id)} className={`absolute left-0 top-7 h-10 w-10 rounded-full border ${selectedEvent?.id === event.id ? 'border-blue-300 bg-blue-100' : 'border-slate-200 bg-white'}`} aria-label={`Select ${event.title}`} />
                <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">{event.eventType.replaceAll('_', ' ')}</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{event.severity}</span>
                  <span className="text-xs font-bold text-slate-400">{formatDate(event.dateTime)}</span>
                </div>
                <Link href={routeToChronologyEvent(event.id)} className="mt-4 block text-2xl font-black tracking-[-0.04em] text-slate-950 hover:text-blue-700">{event.title}</Link>
                <p className="mt-3 text-sm leading-7 text-slate-600">{event.summary}</p>
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
                  <SourceCitationChip label={event.citationLabel} href={routeToChronologyEvent(event.id)} sourceDate={formatDate(event.dateTime)} confidence={event.regulationLinks.some((link) => link.confidence === 'direct') ? 'direct' : 'supporting'} reviewRequired={event.tags.includes('manager-review') || event.tags.includes('overdue-manager-review')} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedEventId(event.id)} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Ask IndiCare about this</button>
                  <Link href="/reports" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Use in report</Link>
                  <Link href={routeToChronologyEvent(event.id)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Open detail</Link>
                  <Link href={routeToSourceRecord(event.sourceType, event.sourceId)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Open source record</Link>
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
          defaultQuestion={selectedEvent ? `Summarise "${selectedEvent.title}" with citations.` : 'Summarise safeguarding concerns in the last 30 days.'}
          prompts={selectedEvent ? ['What actions are linked?', 'What evidence is attached?', 'What would Ofsted want to see here?'] : undefined}
        />
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
