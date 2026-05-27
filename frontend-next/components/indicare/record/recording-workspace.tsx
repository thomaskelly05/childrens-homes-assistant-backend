'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'

import { OrbLiveRecordingCoach } from '@/components/indicare/record/orb-live-recording-coach'
import { RecordingContextPanel } from '@/components/indicare/record/recording-context-panel'
import { RecordingEditor } from '@/components/indicare/record/recording-editor'
import { RecordingFormLifecycleOutcome } from '@/components/indicare/record/recording-form-lifecycle-outcome'
import type { RecordingSaveMode } from '@/components/indicare/record/recording-autosave-indicator'
import { RecordingLanguageSuggestions } from '@/components/indicare/record/recording-language-suggestions'
import { RecordingReviewChecklist } from '@/components/indicare/record/recording-review-checklist'
import { RecordingTherapeuticPrompts } from '@/components/indicare/record/recording-therapeutic-prompts'
import type { RecordAboutContext } from '@/lib/record/recording-hub'
import { recordCardById, recordCardHref } from '@/lib/record/recording-hub'
import { lifecycleForForm } from '@/lib/record/recording-form-lifecycle'
import {
  resolveActiveRecordingForm,
  workflowStatusLabel,
  workflowStatusMicrocopy
} from '@/lib/record/recording-form-registry'
import { resolveRecordingFormFromQuery, resolveRecordingTypeFromQuery, type RecordingWorkspaceType } from '@/lib/record/recording-types'

export function RecordingWorkspace({
  about,
  childId,
  childDisplayName,
  initialRecordingType,
  highlightType,
  draftIdFromUrl,
  formIdFromUrl,
  onDraftListRefresh
}: {
  about: RecordAboutContext
  childId?: string
  childDisplayName?: string
  initialRecordingType?: RecordingWorkspaceType
  highlightType?: string
  draftIdFromUrl?: string
  formIdFromUrl?: string
  onDraftListRefresh?: () => void
}) {
  const defaultType =
    initialRecordingType ||
    resolveRecordingTypeFromQuery(highlightType, formIdFromUrl) ||
    (about === 'home-shift' ? 'handover' : about === 'staff' ? 'staff-reflection' : 'daily-note')

  const [recordingType, setRecordingType] = useState<RecordingWorkspaceType>(defaultType)
  const activeForm = resolveRecordingFormFromQuery(recordingType, formIdFromUrl) || resolveActiveRecordingForm(recordingType, formIdFromUrl)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [planImpactChecked, setPlanImpactChecked] = useState(false)
  const [structuredCompletion, setStructuredCompletion] = useState<{
    requiredMissing: string[]
    reviewTriggers: string[]
    completionSummary: string[]
  } | null>(null)
  const [autosaveState, setAutosaveState] = useState<{
    isSaving: boolean
    saveMode: RecordingSaveMode
    lastSavedAt?: string
    saveError: boolean
    eventDate?: string
    planImpactChecked?: boolean
  }>({ isSaving: false, saveMode: 'idle', saveError: false })

  const handleStructuredCompletionChange = useCallback(
    (payload: { requiredMissing: string[]; reviewTriggers: string[]; completionSummary: string[] } | null) => {
      setStructuredCompletion(payload)
    },
    []
  )

  const handleAutosaveStateChange = useCallback(
    (state: {
      isSaving: boolean
      saveMode: RecordingSaveMode
      lastSavedAt?: string
      saveError: boolean
      eventDate?: string
      planImpactChecked?: boolean
    }) => {
      setAutosaveState(state)
      if (state.eventDate) setEventDate(state.eventDate)
      if (state.planImpactChecked != null) setPlanImpactChecked(state.planImpactChecked)
    },
    []
  )

  const handleAcceptSuggestion = useCallback(
    (text: string) => {
      setBody((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text))
    },
    []
  )

  const handleInsertHeading = useCallback((heading: string) => {
    setBody((prev) => (prev.trim() ? `${prev.trim()}\n\n${heading}\n` : `${heading}\n`))
  }, [])

  const continueHref = useMemo(() => {
    const cardIdMap: Partial<Record<RecordingWorkspaceType, string>> = {
      incident: 'incidents',
      'family-time': 'family-contact',
      'health-medication': 'medication-health',
      'medication-note-error': 'medication-health',
      handover: 'shift-handover',
      'evidence-document': 'documents',
      'staff-reflection': 'ask-orb',
      'safeguarding-concern': 'safeguarding',
      missing: 'missing',
      'return-conversation': 'return-conversation',
      'physical-intervention': 'physical-intervention',
      'injury-body-map': 'injury-body-map',
      'education-note': 'education-update',
      'reg44-evidence': 'reg44-evidence',
      'reg45-evidence': 'reg45-evidence',
      'manager-review': 'manager-review',
      'daily-note': 'daily-note',
      'child-voice': 'child-voice',
      keywork: 'keywork'
    }
    const cardId = cardIdMap[recordingType] || recordingType
    const card = recordCardById(cardId)
    if (!card) {
      const params = new URLSearchParams({ type: recordingType })
      if (childId) {
        params.set('child_id', childId)
        params.set('about', 'child')
      }
      return `/record?${params.toString()}`
    }
    return recordCardHref(card, childId)
  }, [childId, recordingType])

  const activeFormId = formIdFromUrl || activeForm?.id || recordingType
  const lifecycle = lifecycleForForm(activeFormId, activeForm?.category)
  const childLifecycleLinks = childId ? {
    archiveHref: `/young-people/${encodeURIComponent(childId)}/archive`,
    chronologyHref: `/young-people/${encodeURIComponent(childId)}/chronology`,
    planImpactsHref: `/young-people/${encodeURIComponent(childId)}/plan-impacts`,
    lifeechoHref: `/young-people/${encodeURIComponent(childId)}/lifeecho`
  } : undefined

  return (
    <section data-testid="recording-workspace" className="space-y-6">
      <header className="rounded-[28px] border border-blue-100 bg-gradient-to-r from-blue-50/90 via-white to-cyan-50/70 p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Record with care</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Write once. Link it properly.</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Write clear, child-centred records. ORB supports you live while you write; manager review, chronology, archive, plan impacts and LifeEcho use the existing lifecycle flow after sign-off.
        </p>
      </header>

      {activeForm ? (
        <section data-testid="recording-workflow-status" className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
          <p className="text-xs font-black text-slate-950">
            {activeForm.title} · {workflowStatusLabel(activeForm.workflowStatus)}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
            {workflowStatusMicrocopy(activeForm.workflowStatus, activeForm.routeKind)}
          </p>
          {activeForm.requiresManagerReview ? (
            <p className="mt-2 text-xs font-black text-amber-900" data-testid="recording-manager-review-copy">
              Manager/safeguarding review likely required before this is treated as a completed formal record.
            </p>
          ) : null}
          {activeForm.safeguardingSensitive || activeForm.requiresManagerReview ? (
            <p className="mt-2 text-xs font-black text-rose-900" data-testid="recording-high-risk-safety-banner">
              High-risk record — use structured fields where shown. Manager judgement remains required.
            </p>
          ) : null}
        </section>
      ) : null}

      <RecordingFormLifecycleOutcome
        lifecycle={lifecycle}
        links={childLifecycleLinks}
        signOffSummary="After manager review, this record can connect into archive, chronology, plan impacts and LifeEcho where the form lifecycle allows it."
      />

      <div className="mobile-recording-workspace grid gap-6 pb-[calc(120px+env(safe-area-inset-bottom))] xl:grid-cols-[minmax(0,1fr)_320px] xl:pb-0">
        <div className="space-y-4">
          <RecordingEditor
            recordingType={recordingType}
            formId={formIdFromUrl || activeForm?.id}
            about={about}
            childId={childId}
            childName={childDisplayName}
            draftIdFromUrl={draftIdFromUrl}
            onTitleChange={setTitle}
            onBodyChange={setBody}
            onDraftListRefresh={onDraftListRefresh}
            onStructuredCompletionChange={handleStructuredCompletionChange}
            onAutosaveStateChange={handleAutosaveStateChange}
            onAcceptSuggestion={handleAcceptSuggestion}
          />
          <RecordingTherapeuticPrompts recordingType={recordingType} formId={formIdFromUrl || activeForm?.id} />
          <RecordingContextPanel body={body} title={title} />
        </div>

        <div className="space-y-4">
          <OrbLiveRecordingCoach
            formId={activeFormId}
            recordingType={recordingType}
            title={title}
            body={body}
            eventDate={autosaveState.eventDate || eventDate || undefined}
            childId={childId}
            structuredRequiredMissing={structuredCompletion?.requiredMissing}
            planImpactChecked={autosaveState.planImpactChecked ?? planImpactChecked}
            saveMode={autosaveState.saveMode}
            isSaving={autosaveState.isSaving}
            lastSavedAt={autosaveState.lastSavedAt}
            saveError={autosaveState.saveError}
            onAcceptSuggestion={handleAcceptSuggestion}
            onInsertHeadingPrompt={handleInsertHeading}
          />
          <RecordingLanguageSuggestions body={body} title={title} />
          <RecordingReviewChecklist body={body} title={title} recordingType={recordingType} structuredRequiredMissing={structuredCompletion?.requiredMissing} />
        </div>
      </div>

      <section data-testid="recording-workspace-actions" className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
        <p className="text-sm font-black text-slate-950">Submit through the existing review workflow</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          Continue to the formal route to submit, manager review, comments, sign-off and plan-impact suggestions. This keeps the record in the existing lifecycle rather than creating a duplicate review path.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={continueHref} className="inline-flex min-h-11 items-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">
            Continue to submit / review
          </Link>
          {childId ? (
            <Link href={`/record/reviews?child_id=${encodeURIComponent(childId)}`} className="inline-flex min-h-11 items-center rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-black text-purple-950">
              Manager review queue
            </Link>
          ) : null}
          {childId ? (
            <Link href={`/young-people/${encodeURIComponent(childId)}/plan-impacts`} className="inline-flex min-h-11 items-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-950">
              Plan impacts
            </Link>
          ) : null}
        </div>
      </section>
    </section>
  )
}
