'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mic2, Sparkles } from 'lucide-react'

import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'
import { Card, PageHeader, SectionHeader } from '@/components/indicare/ui'
import { RecordChildPicker, mapYoungPeopleToPickerOptions, type RecordChildPickerOption } from '@/components/indicare/record/record-child-picker'
import { RecordingDraftList } from '@/components/indicare/record/recording-draft-list'
import { RecordingCataloguePanel } from '@/components/indicare/record/recording-catalogue-panel'
import { RecordingWorkspace } from '@/components/indicare/record/recording-workspace'
import {
  RECORDING_OS_ORB_HREF,
  RECORDING_STANDALONE_ORB_HREF
} from '@/lib/record/recording-quality-coach'
import { resolveRecordingTypeFromQuery } from '@/lib/record/recording-types'
import { useActiveChild } from '@/lib/context/active-child-context'
import { getOsYoungPeople } from '@/lib/os-api/workspaces'
import type { OsPersonSummary } from '@/lib/os-api/workspaces'
import {
  RECORD_ABOUT_OPTIONS,
  RECORD_CARD_SECTIONS,
  type RecordAboutContext,
  type RecordCardDefinition,
  type RecordRecommendedItem,
  cardsForSection,
  recordCardAvailableForContext,
  recordCardById,
  recordCardDeemphasised,
  recordCardHref,
  recordCardNeedsChild,
  recordCardOperationalOrbHref,
  recordCardOrbHref,
  recordHubQueryString,
  recordOperationalOrbPromptHref,
  recordOrbPromptHref,
  recordOrbPromptsForContext,
  recordRecommendedForContext,
  resolveRecordAboutContext
} from '@/lib/record/recording-hub'

function RecordAboutSelector({
  value,
  onChange
}: {
  value: RecordAboutContext
  onChange: (next: RecordAboutContext) => void
}) {
  return (
    <fieldset data-testid="record-about-selector" className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <legend className="px-1 text-lg font-black tracking-[-0.03em] text-slate-950">Who or what is this record about?</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {RECORD_ABOUT_OPTIONS.map((option) => {
          const selected = value === option.id
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer flex-col rounded-2xl border px-4 py-4 transition focus-within:ring-2 focus-within:ring-blue-200 ${selected ? 'border-blue-300 bg-blue-50/70 ring-1 ring-blue-200' : 'border-slate-100 bg-slate-50/60 hover:border-blue-100'}`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="record-about"
                  value={option.id}
                  checked={selected}
                  onChange={() => onChange(option.id)}
                  className="mt-1 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  aria-label={option.label}
                />
                <span>
                  <span className="block text-sm font-black text-slate-950">{option.label}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{option.description}</span>
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function RecommendedRecordTile({
  item,
  childId,
  onNeedsChild
}: {
  item: RecordRecommendedItem
  childId?: string
  onNeedsChild: () => void
}) {
  if (item.kind === 'link') {
    return (
      <article className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.description}</p>
        <Link
          href={item.href}
          className="mt-3 inline-flex min-h-10 items-center rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
        >
          {item.buttonText}
        </Link>
      </article>
    )
  }

  const card = recordCardById(item.cardId)
  if (!card) return null
  const needsChild = recordCardNeedsChild(card) && !childId

  return (
    <article className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <h3 className="text-sm font-black text-slate-950">{card.title}</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{card.description}</p>
      {needsChild ? (
        <button
          type="button"
          onClick={onNeedsChild}
          className="mt-3 inline-flex min-h-10 items-center rounded-2xl border border-amber-200 bg-white px-4 py-2 text-xs font-black text-amber-950"
        >
          Choose child first
        </button>
      ) : (
        <Link href={recordCardHref(card, childId)} className="mt-3 inline-flex min-h-10 items-center rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black text-white">
          {card.buttonText}
        </Link>
      )}
    </article>
  )
}

function RecordCard({
  card,
  childId,
  childDisplayName,
  highlighted,
  about,
  onNeedsChild
}: {
  card: RecordCardDefinition
  childId?: string
  childDisplayName?: string
  highlighted?: boolean
  about: RecordAboutContext
  onNeedsChild: () => void
}) {
  const Icon = card.icon
  const needsChild = recordCardNeedsChild(card) && !childId
  const deemphasised = recordCardDeemphasised(card, about)
  const href = needsChild ? undefined : recordCardHref(card, childId)
  const orbHref = recordCardOrbHref(card, childId)
  const operationalOrbHref = recordCardOperationalOrbHref(card)

  return (
    <article
      id={`record-${card.id}`}
      data-testid={`record-card-${card.id}`}
      className={`rounded-[28px] border bg-slate-50/80 p-5 transition hover:border-blue-100 hover:bg-blue-50/40 ${highlighted ? 'border-blue-300 ring-2 ring-blue-200' : 'border-slate-100'} ${deemphasised ? 'opacity-55' : ''} ${needsChild ? 'border-amber-100/80' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-100">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">{card.title}</h3>
            {needsChild ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900">
                Choose child first
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{card.description}</p>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
            <span className="text-slate-400">When to use: </span>
            {card.whenToUse}
          </p>
          {childId && recordCardNeedsChild(card) ? (
            <p className="mt-2 text-xs font-bold text-emerald-800">Opens on {childDisplayName || `young person ${childId}`}&apos;s journey.</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {needsChild ? (
          <button
            type="button"
            onClick={onNeedsChild}
            className="inline-flex min-h-11 items-center rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            aria-label={`Choose a child before ${card.title}`}
          >
            Choose child first
          </button>
        ) : (
          <Link
            href={href!}
            className="inline-flex min-h-11 items-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {card.buttonText}
          </Link>
        )}
        {card.id !== 'ask-orb' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={operationalOrbHref}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-800 transition hover:bg-blue-100"
              aria-label={`Ask operational ORB about ${card.title}`}
            >
              <Mic2 className="h-3.5 w-3.5 text-blue-600" aria-hidden />
              Ask ORB before recording
            </Link>
          </div>
        ) : null}
      </div>
      {card.id !== 'ask-orb' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <OrbInlineHint
            label="ORB can help draft child-centred wording"
            href={orbHref}
            tone="muted"
          />
          <OrbInlineHint label="Check recording quality" href={operationalOrbHref} tone="cyan" />
        </div>
      ) : null}
    </article>
  )
}

export function RecordHub({
  initialChildId,
  initialChildDisplayName,
  highlightType,
  initialAbout,
  initialYoungPeople
}: {
  initialChildId?: string
  initialChildDisplayName?: string
  highlightType?: string
  initialAbout?: RecordAboutContext
  initialYoungPeople?: OsPersonSummary[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectChild, activeChild } = useActiveChild()

  const [about, setAbout] = useState<RecordAboutContext>(initialAbout || 'child')
  const [childId, setChildId] = useState<string | undefined>(initialChildId)
  const [childDisplayName, setChildDisplayName] = useState<string | undefined>(initialChildDisplayName)
  const [pickerOptions, setPickerOptions] = useState<RecordChildPickerOption[]>(
    initialYoungPeople?.length ? mapYoungPeopleToPickerOptions(initialYoungPeople) : []
  )
  const [childrenLoading, setChildrenLoading] = useState(!initialYoungPeople?.length)
  const [childrenLoadFailed, setChildrenLoadFailed] = useState(false)
  const [childrenWarning, setChildrenWarning] = useState<string | undefined>()
  const [draftListRefreshKey, setDraftListRefreshKey] = useState(0)

  const syncFromUrl = useCallback(() => {
    const urlChildId = searchParams.get('child_id') || searchParams.get('young_person_id') || undefined
    const urlChildName = searchParams.get('child_name') || undefined
    const urlAbout = resolveRecordAboutContext(searchParams.get('about') || undefined)
    if (urlChildId) {
      setChildId(urlChildId.trim())
      if (urlChildName) setChildDisplayName(urlChildName.trim())
    }
    setAbout(urlAbout)
  }, [searchParams])

  useEffect(() => {
    syncFromUrl()
  }, [syncFromUrl])

  useEffect(() => {
    if (!activeChild?.id || childId) return
    if (about !== 'child') return
    setChildId(activeChild.id)
    setChildDisplayName(activeChild.preferredName || activeChild.displayName)
  }, [activeChild, about, childId])

  const loadChildren = useCallback(async () => {
    setChildrenLoading(true)
    setChildrenLoadFailed(false)
    const result = await getOsYoungPeople()
    if (result.source !== 'live') {
      setChildrenLoadFailed(true)
      setChildrenWarning(result.warning)
      setPickerOptions([])
    } else {
      setPickerOptions(mapYoungPeopleToPickerOptions(result.data))
      setChildrenWarning(undefined)
    }
    setChildrenLoading(false)
  }, [])

  useEffect(() => {
    if (initialYoungPeople?.length) return
    void loadChildren()
  }, [initialYoungPeople?.length, loadChildren])

  const updateRoute = useCallback(
    (next: { about?: RecordAboutContext; childId?: string; childName?: string; type?: string }) => {
      const href = `/record${recordHubQueryString({
        about: next.about ?? about,
        childId: next.childId ?? childId,
        childName: next.childName ?? childDisplayName,
        type: next.type ?? searchParams.get('type') ?? undefined
      })}`
      router.replace(href, { scroll: false })
    },
    [about, childDisplayName, childId, router, searchParams]
  )

  const handleAboutChange = (next: RecordAboutContext) => {
    setAbout(next)
    if (next !== 'child') {
      updateRoute({ about: next, childId: undefined, childName: undefined })
      setChildId(undefined)
      setChildDisplayName(undefined)
      return
    }
    updateRoute({ about: next, childId, childName: childDisplayName })
  }

  const handleChildSelect = (option: RecordChildPickerOption) => {
    setChildId(option.id)
    setChildDisplayName(option.name)
    setAbout('child')
    selectChild({ id: option.id, displayName: option.name, preferredName: option.name }, 'manual')
    updateRoute({ about: 'child', childId: option.id, childName: option.name })
  }

  const focusChildPicker = () => {
    setAbout('child')
    updateRoute({ about: 'child', childId, childName: childDisplayName, type: highlightType || searchParams.get('type') || undefined })
    if (typeof window !== 'undefined') {
      window.location.hash = 'choose-child'
      document.getElementById('choose-child')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const select = document.querySelector<HTMLSelectElement>('[data-testid="record-child-select"]')
      select?.focus()
    }
  }

  const effectiveChildLabel = childDisplayName || (childId ? `Young person ${childId}` : undefined)
  const orbPrompts = useMemo(
    () => recordOrbPromptsForContext(about === 'child' ? 'child' : about, childId, effectiveChildLabel),
    [about, childId, effectiveChildLabel]
  )
  const recommended = useMemo(
    () => recordRecommendedForContext(about, childId, effectiveChildLabel),
    [about, childId, effectiveChildLabel]
  )

  const showChildPicker = about === 'child'
  const showStaffPanel = about === 'staff'
  const initialRecordingType = resolveRecordingTypeFromQuery(
    highlightType || searchParams.get('type'),
    searchParams.get('form')
  )
  const draftIdFromUrl = searchParams.get('draft_id') || undefined
  const formIdFromUrl = searchParams.get('form') || undefined

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Recording"
        title="Record with care"
        description="Write clear, child-centred records. ORB can help with wording, reflection and review."
        action={
          childId ? (
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/journey`}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm"
            >
              Child journey
            </Link>
          ) : (
            <Link href="/young-people" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
              All children
            </Link>
          )
        }
      />

      <section
        data-testid="record-orb-recording-support"
        className="rounded-[24px] border border-cyan-100 bg-gradient-to-r from-cyan-50/90 via-white to-blue-50/80 p-4 shadow-sm ring-1 ring-cyan-100/60"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-800">ORB recording support</p>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-700">
          Connected to Care Hub and operational ORB. ORB can help with wording and recording quality — it does not replace safeguarding or manager decisions.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={RECORDING_OS_ORB_HREF}
            className="inline-flex min-h-10 items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"
          >
            Open operational ORB
          </Link>
          <Link
            href={RECORDING_STANDALONE_ORB_HREF}
            className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
          >
            ORB wording help (standalone)
          </Link>
          <Link href="/command-centre" className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600">
            Back to Care Hub
          </Link>
          <Link
            href="/record/reviews"
            data-testid="record-hub-review-queue-link"
            className="inline-flex min-h-10 items-center rounded-2xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs font-black text-purple-950"
          >
            Recording review queue
          </Link>
          <Link
            href="/record/governance"
            data-testid="record-hub-governance-link"
            className="inline-flex min-h-10 items-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-950"
          >
            Recording governance
          </Link>
        </div>
      </section>

      <RecordAboutSelector value={about} onChange={handleAboutChange} />

      {showChildPicker ? (
        <RecordChildPicker
          options={pickerOptions}
          selectedId={childId}
          onSelect={handleChildSelect}
          loadError={childrenLoadFailed}
          loadWarning={childrenWarning}
          isLoading={childrenLoading}
          onRetry={() => void loadChildren()}
        />
      ) : null}

      {childId && about === 'child' ? (
        <section
          data-testid="record-child-selected"
          className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-semibold leading-6 text-emerald-950"
        >
          Recording for <span className="font-black">{effectiveChildLabel}</span>. Records will open on this child&apos;s journey where possible.
        </section>
      ) : null}

      {showStaffPanel ? (
        <section
          data-testid="record-staff-guidance"
          className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5 text-sm font-semibold leading-6 text-slate-700"
        >
          <p>Staff records are managed through Workforce.</p>
          <Link href="/staff" className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Open Workforce
          </Link>
        </section>
      ) : null}

      <RecordingDraftList refreshKey={draftListRefreshKey} />

      <RecordingCataloguePanel about={about} childId={childId} />

      <RecordingWorkspace
        about={about}
        childId={childId}
        childDisplayName={effectiveChildLabel}
        initialRecordingType={initialRecordingType}
        highlightType={highlightType}
        draftIdFromUrl={draftIdFromUrl}
        formIdFromUrl={formIdFromUrl}
        onDraftListRefresh={() => setDraftListRefreshKey((value) => value + 1)}
      />

      <Card data-testid="record-recommended">
        <SectionHeader eyebrow="Suggested" title="Recommended records" description="Based on who or what you selected above." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recommended.map((item, index) => (
            <RecommendedRecordTile key={item.kind === 'card' ? item.cardId : `${item.title}-${index}`} item={item} childId={childId} onNeedsChild={focusChildPicker} />
          ))}
        </div>
      </Card>

      <Card className="bg-slate-950 text-white ring-slate-800" data-testid="record-orb-prompts-panel">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">Not sure what to record?</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">ORB recording help</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          ORB can help with wording and reflection. It does not replace safeguarding procedures or manager decisions.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {orbPrompts.map((prompt) => (
            <Link
              key={prompt.label}
              href={recordOrbPromptHref(prompt.query, childId)}
              className="inline-flex min-h-11 items-center rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
              aria-label={prompt.label}
            >
              {prompt.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href={recordOperationalOrbPromptHref('Help me choose the right record type for what I need to document.')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-cyan-200 px-4 py-3 text-sm font-black text-slate-950"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Open operational ORB
          </Link>
          <Link
            href={recordOrbPromptHref('Help me choose the right record type for what I need to document.', childId)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white"
          >
            Standalone wording help
          </Link>
        </div>
      </Card>

      {about === 'home-shift' ? (
        <p className="text-sm font-semibold text-slate-600">Home and shift records are shown prominently. Child-specific cards remain below if you need them later.</p>
      ) : null}

      <Card data-testid="record-more-routes">
        <SectionHeader
          eyebrow="Routes"
          title="More recording routes"
          description="Open the formal workflow when you are ready to submit a record to the system."
        />
      </Card>

      {RECORD_CARD_SECTIONS.map((section) => {
        const sectionCards = cardsForSection(section.id).filter((card) => {
          if (about === 'staff') return card.id === 'ask-orb'
          return true
        })
        if (!sectionCards.length) return null

        return (
          <Card key={section.id} data-testid={`record-section-${section.id}`}>
            <SectionHeader eyebrow="Recording" title={section.title} description={section.description} />
            <div className="grid gap-4 md:grid-cols-2">
              {sectionCards.map((card) => {
                if (!recordCardAvailableForContext(card, about)) return null
                return (
                  <RecordCard
                    key={card.id}
                    card={card}
                    childId={childId}
                    childDisplayName={childDisplayName}
                    highlighted={highlightType === card.id}
                    about={about}
                    onNeedsChild={focusChildPicker}
                  />
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
