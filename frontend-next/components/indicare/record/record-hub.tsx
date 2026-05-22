import Link from 'next/link'
import { Mic2 } from 'lucide-react'

import { Card, PageHeader, SectionHeader } from '@/components/indicare/ui'
import {
  RECORD_CARD_SECTIONS,
  RECORD_ORB_PROMPTS,
  type RecordCardDefinition,
  cardsForSection,
  recordCardHref,
  recordCardOrbHref,
  recordOrbPromptHref
} from '@/lib/record/recording-hub'

function RecordCard({
  card,
  childId,
  highlighted
}: {
  card: RecordCardDefinition
  childId?: string
  highlighted?: boolean
}) {
  const Icon = card.icon
  const href = recordCardHref(card, childId)
  const orbHref = recordCardOrbHref(card, childId)

  return (
    <article
      id={`record-${card.id}`}
      data-testid={`record-card-${card.id}`}
      className={`rounded-[28px] border bg-slate-50/80 p-5 transition hover:border-blue-100 hover:bg-blue-50/40 ${highlighted ? 'border-blue-300 ring-2 ring-blue-200' : 'border-slate-100'}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-100">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">{card.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{card.description}</p>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
            <span className="text-slate-400">When to use: </span>
            {card.whenToUse}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={href}
          className="inline-flex min-h-11 items-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {card.buttonText}
        </Link>
        {card.id !== 'ask-orb' ? (
          <Link
            href={orbHref}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-blue-100 hover:text-blue-700"
          >
            <Mic2 className="h-3.5 w-3.5 text-blue-600" aria-hidden />
            Ask ORB about this
          </Link>
        ) : null}
      </div>
    </article>
  )
}

export function RecordHub({
  childId,
  childDisplayName,
  highlightType
}: {
  childId?: string
  childDisplayName?: string
  highlightType?: string
}) {
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Recording"
        title="Record something"
        description="Choose what you need to record. ORB can help you write clearly and calmly."
        action={
          childId ? (
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/journey`}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm"
            >
              Child journey
            </Link>
          ) : (
            <Link href="/young-people" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">
              Choose child
            </Link>
          )
        }
      />

      {childId ? (
        <section
          data-testid="record-child-selected"
          className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-semibold leading-6 text-emerald-950"
        >
          Recording for <span className="font-black">{childDisplayName || `Young person ${childId}`}</span>. Records will open on this child&apos;s journey where possible.
        </section>
      ) : (
        <section
          data-testid="record-child-guidance"
          className="rounded-[28px] border border-amber-100 bg-amber-50/90 p-5 text-sm font-semibold leading-6 text-amber-950"
        >
          <p>Recording about a child? Choose the child first so IndiCare can link it to the right journey.</p>
          <Link
            href="/young-people"
            className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Choose child
          </Link>
          <p className="mt-3 text-xs font-bold text-amber-800/90">Choose a child first where needed — general list pages open when no child is selected.</p>
        </section>
      )}

      <Card className="bg-slate-950 text-white ring-slate-800">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">Not sure what to record?</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">ORB recording help</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          ORB can help with wording and reflection. It does not replace safeguarding procedures or manager decisions.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {RECORD_ORB_PROMPTS.map((prompt) => (
            <Link
              key={prompt.label}
              href={recordOrbPromptHref(prompt.query, childId)}
              className="inline-flex min-h-11 items-center rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
            >
              {prompt.label}
            </Link>
          ))}
        </div>
        <Link
          href={recordOrbPromptHref('Help me choose the right record type for what I need to document.', childId)}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-cyan-200 px-4 py-3 text-sm font-black text-slate-950"
        >
          Open ORB
        </Link>
      </Card>

      {RECORD_CARD_SECTIONS.map((section) => (
        <Card key={section.id} data-testid={`record-section-${section.id}`}>
          <SectionHeader eyebrow="Recording" title={section.title} description={section.description} />
          <div className="grid gap-4 md:grid-cols-2">
            {cardsForSection(section.id).map((card) => (
              <RecordCard key={card.id} card={card} childId={childId} highlighted={highlightType === card.id} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
