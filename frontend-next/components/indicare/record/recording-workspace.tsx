'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'

import { RecordingContextPanel } from '@/components/indicare/record/recording-context-panel'
import { RecordingEditor } from '@/components/indicare/record/recording-editor'
import { RecordingLanguageSuggestions } from '@/components/indicare/record/recording-language-suggestions'
import { RecordingOrbRail } from '@/components/indicare/record/recording-orb-rail'
import { RecordingQualityCoach } from '@/components/indicare/record/recording-quality-coach'
import { RecordingReviewChecklist } from '@/components/indicare/record/recording-review-checklist'
import { RecordingTherapeuticPrompts } from '@/components/indicare/record/recording-therapeutic-prompts'
import { RecordingTypeSelector } from '@/components/indicare/record/recording-type-selector'
import {
  RECORDING_OS_ORB_HREF,
  RECORDING_STANDALONE_ORB_HREF
} from '@/lib/record/recording-quality-coach'
import type { RecordAboutContext } from '@/lib/record/recording-hub'
import { recordCardById, recordCardHref } from '@/lib/record/recording-hub'
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
  const [structuredCompletion, setStructuredCompletion] = useState<{
    requiredMissing: string[]
    reviewTriggers: string[]
    completionSummary: string[]
  } | null>(null)

  const handleStructuredCompletionChange = useCallback(
    (payload: { requiredMissing: string[]; reviewTriggers: string[]; completionSummary: string[] } | null) => {
      setStructuredCompletion(payload)
    },
    []
  )

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

  return (
    <section data-testid="recording-workspace" className="space-y-6">
      <header className="rounded-[28px] border border-blue-100 bg-gradient-to-r from-blue-50/90 via-white to-cyan-50/70 p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Recording workspace</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Record with care</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Write clear, child-centred records. ORB can help with wording, reflection and review.
        </p>
      </header>

      <RecordingTypeSelector value={recordingType} onChange={setRecordingType} about={about} />

      {activeForm ? (
        <section
          data-testid="recording-workflow-status"
          className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3"
        >
          <p className="text-xs font-black text-slate-950">
            {activeForm.title} · {workflowStatusLabel(activeForm.workflowStatus)}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
            {workflowStatusMicrocopy(activeForm.workflowStatus, activeForm.routeKind)}
          </p>
          {activeForm.requiresManagerReview ? (
            <p className="mt-2 text-xs font-black text-amber-900" data-testid="recording-manager-review-copy">
              Manager/safeguarding review likely required before this is treated as a completed formal record. Follow local
              safeguarding procedures.
            </p>
          ) : null}
          {activeForm.safeguardingSensitive || activeForm.requiresManagerReview ? (
            <p className="mt-2 text-xs font-black text-rose-900" data-testid="recording-high-risk-safety-banner">
              High-risk record — use structured fields where shown. Follow your home&apos;s safeguarding, medication and
              manager notification procedures. Manager judgement remains required.
            </p>
          ) : null}
          {activeForm.workflowStatus === 'formal_submit_supported' ? (
            <p className="mt-1 text-xs font-semibold text-emerald-900">
              Formal submit supported when a child is selected and review rules are met.
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
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
          />
          <RecordingTherapeuticPrompts recordingType={recordingType} formId={formIdFromUrl || activeForm?.id} />
          <RecordingContextPanel body={body} title={title} />
        </div>

        <div className="space-y-4">
          <RecordingOrbRail recordingType={recordingType} formId={formIdFromUrl || activeForm?.id} />
          <RecordingQualityCoach body={body} title={title} recordingType={recordingType} structuredRequiredMissing={structuredCompletion?.requiredMissing} structuredReviewTriggers={structuredCompletion?.reviewTriggers} />
          <RecordingLanguageSuggestions body={body} title={title} />
          <RecordingReviewChecklist body={body} title={title} recordingType={recordingType} structuredRequiredMissing={structuredCompletion?.requiredMissing} />
        </div>
      </div>

      <section
        data-testid="recording-workspace-actions"
        className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5"
      >
        <p className="text-sm font-black text-slate-950">Review before saving</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          Submit through the correct formal workflow when ready. Secure drafts are stored on the server when available; local browser autosave remains as fallback.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={RECORDING_OS_ORB_HREF}
            className="inline-flex min-h-11 items-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
          >
            Open OS ORB
          </Link>
          <Link
            href={RECORDING_STANDALONE_ORB_HREF}
            className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
          >
            Standalone wording helper
          </Link>
          <Link
            href={continueHref}
            className="inline-flex min-h-11 items-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
          >
            Continue to full record route
          </Link>
        </div>
      </section>
    </section>
  )
}
