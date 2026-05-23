import Link from 'next/link'

import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'
import type { ChildJourneyData } from '@/lib/child-journey/data'
import {
  CHILD_JOURNEY_AREA_LINKS,
  childJourneyPromptHref,
  childJourneySummaryHref
} from '@/lib/child-journey/child-journey-routes'

function countPattern(items: Array<{ title?: string; summary?: string }>, pattern: RegExp) {
  return items.filter((item) => pattern.test(`${item.title || ''} ${item.summary || ''}`.toLowerCase())).length
}

export function ChildJourneyJourneyPicture({ childId, data }: { childId: string; data: ChildJourneyData }) {
  const events = [...data.timeline, ...data.dailyNotes]
  const chronologyCount = data.timeline.length
  const incidents = countPattern(events, /incident|restraint|harm/)
  const missing = countPattern(events, /missing|unauthorised absence/)
  const family = countPattern(events, /family|contact|visit/)
  const education = countPattern(events, /education|school/)
  const health = countPattern(events, /health|medication|wellbeing/)
  const evidenceGaps = data.evidence.length === 0 && chronologyCount > 0

  const metrics = [
    { label: 'Chronology events', value: chronologyCount, href: `/young-people/${encodeURIComponent(childId)}/chronology` },
    { label: 'Incident markers', value: incidents, href: `/young-people/${encodeURIComponent(childId)}/incidents/new` },
    { label: 'Missing markers', value: missing, href: `/young-people/${encodeURIComponent(childId)}/missing/new` },
    { label: 'Family / contact', value: family, href: `/young-people/${encodeURIComponent(childId)}/family-contact/new` },
    { label: 'Education', value: education, href: `/young-people/${encodeURIComponent(childId)}/education-update/new` },
    { label: 'Health / wellbeing', value: health, href: `/young-people/${encodeURIComponent(childId)}/health/new` }
  ]

  const recentThemes = data.story.progressHighlights.length
    ? data.story.progressHighlights
    : data.timeline.slice(0, 3).map((item) => item.title)

  return (
    <section data-testid="child-journey-picture" className="min-w-0 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <div className="os-section-heading">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Continuity</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">Journey picture</h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{data.story.whatChanged}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className="os-review-card rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-blue-200 hover:bg-white"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{metric.label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{metric.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">Recent themes</p>
        {recentThemes.length ? (
          <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-blue-950">
            {recentThemes.slice(0, 4).map((theme) => (
              <li key={theme}>- {theme}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm font-semibold leading-6 text-blue-900/80">No themes returned yet from visible chronology.</p>
        )}
      </div>

      {evidenceGaps ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-amber-800">
          Evidence gaps may exist — chronology is visible but linked evidence is light. ORB can help identify what is missing.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <OrbInlineHint label="Ask ORB to summarise the last 7 days" href={childJourneySummaryHref(childId)} tone="cyan" />
        <OrbInlineHint
          label="Ask ORB what has changed"
          href={childJourneyPromptHref(childId, 'What has changed recently for this child?')}
          tone="blue"
        />
        <OrbInlineHint
          label="Ask ORB what evidence is missing"
          href={childJourneyPromptHref(childId, 'What evidence might be missing from this child journey?')}
          tone="muted"
        />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-5" data-testid="child-lived-experience-view">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Care, voice, chronology, plans and evidence</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {CHILD_JOURNEY_AREA_LINKS.map((area) => (
            <Link
              key={area.label}
              href={area.href(childId)}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-900 transition hover:border-blue-200 hover:bg-white"
            >
              {area.label}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
          Live evidence is not yet available for an area when no linked records are returned.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {['What changed for the child?', 'What helped them feel safe?', 'What did adults do?'].map((question) => (
            <div key={question} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">
              {question}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
