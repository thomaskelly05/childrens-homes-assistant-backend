'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { RecordingAutosaveIndicator, type RecordingSaveMode } from '@/components/indicare/record/recording-autosave-indicator'
import { RecordingDraftRecoveryBanner } from '@/components/indicare/record/recording-draft-recovery-banner'
import { RecordingFormLifecycleOutcome } from '@/components/indicare/record/recording-form-lifecycle-outcome'
import { RecordingFormShell } from '@/components/indicare/record/recording-form-shell'
import { StructuredRecordingForm } from '@/components/indicare/record/structured-recording-form'
import {
  RECORDING_DRAFT_PRIVACY_NOTICE,
  clearRecordingDraft,
  countWords,
  loadRecordingDraft,
  saveRecordingDraft
} from '@/lib/record/recording-draft-store'
import { RecordingSubmissionResultCard } from '@/components/indicare/record/recording-submission-result'
import {
  autosaveRecordingDraft,
  createRecordingDraft,
  getRecordingDraft,
  getRecordingDraftHealth,
  getRecordingSubmissionTarget,
  markRecordingDraftReadyForReview,
  submissionTargetStatusCopy,
  submitRecordingDraft,
  type RecordingDraftRecord,
  type RecordingSubmissionResult
} from '@/lib/os-api/recording-drafts'
import type { RecordAboutContext } from '@/lib/record/recording-hub'
import { resolveActiveRecordingForm } from '@/lib/record/recording-form-registry'
import {
  buildDefaultFormRecordMetadata,
  mergeFormRecordMetadataPatch,
  parseFormRecordMetadata,
  todayIsoDate,
  type RecordingFormRecordMetadata
} from '@/lib/record/recording-form-metadata'
import {
  analyseRecordingQuality,
  buildReviewChecklist,
  detectPrivacyIdentifiers,
  detectSafeguardingReviewTerms
} from '@/lib/record/recording-quality-coach'
import { recordingBodyPlaceholder, type RecordingWorkspaceType } from '@/lib/record/recording-types'

type RecordingEditorProps = {
  recordingType: RecordingWorkspaceType
  formId?: string
  about: RecordAboutContext
  childId?: string
  childName?: string
  draftIdFromUrl?: string
  onTitleChange?: (title: string) => void
  onBodyChange?: (body: string) => void
  onBackendDraftChange?: (draft: RecordingDraftRecord | null) => void
  onDraftListRefresh?: () => void
  onStructuredCompletionChange?: (payload: {
    requiredMissing: string[]
    reviewTriggers: string[]
    completionSummary: string[]
  } | null) => void
  onAutosaveStateChange?: (state: {
    isSaving: boolean
    saveMode: RecordingSaveMode
    lastSavedAt?: string
    saveError: boolean
    eventDate?: string
    planImpactChecked?: boolean
  }) => void
  onAcceptSuggestion?: (text: string) => void
}

function hasMeaningfulContent(title: string, body: string) {
  return Boolean(title.trim() || body.trim())
}

export function RecordingEditor({
  recordingType,
  formId,
  about,
  childId,
  childName,
  draftIdFromUrl,
  onTitleChange,
  onBodyChange,
  onBackendDraftChange,
  onDraftListRefresh,
  onStructuredCompletionChange,
  onAutosaveStateChange,
  onAcceptSuggestion
}: RecordingEditorProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [saveMode, setSaveMode] = useState<RecordingSaveMode>('idle')
  const [backendDraftId, setBackendDraftId] = useState<string | undefined>(draftIdFromUrl)
  const [backendDraft, setBackendDraft] = useState<RecordingDraftRecord | null>(null)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false)
  const [submitWarning, setSubmitWarning] = useState<string | undefined>()
  const [submissionTargetHint, setSubmissionTargetHint] = useState<string | undefined>()
  const [submissionResult, setSubmissionResult] = useState<RecordingSubmissionResult | null>(null)
  const [confirmReviewed, setConfirmReviewed] = useState(false)
  const [eventDate, setEventDate] = useState(todayIsoDate())
  const [planImpactChecked, setPlanImpactChecked] = useState(false)
  const [structuredData, setStructuredData] = useState<Record<string, unknown>>({})
  const [saveError, setSaveError] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPersisted = useRef({
    title: '',
    body: '',
    eventDate: todayIsoDate(),
    structuredJson: ''
  })
  const hasUnsavedLocal = useRef(false)

  const form = useMemo(() => resolveActiveRecordingForm(recordingType, formId), [recordingType, formId])
  const isReadOnly = backendDraft?.status === 'submitted' || backendDraft?.status === 'archived'

  const formMetadata = useMemo((): RecordingFormRecordMetadata => {
    const fromDraft = parseFormRecordMetadata(backendDraft?.metadata)
    if (fromDraft) {
      return {
        ...fromDraft,
        event_date: eventDate,
        written_by_name: fromDraft.written_by_name || backendDraft?.created_by_name || undefined,
        written_by_role: fromDraft.written_by_role || backendDraft?.created_by_role || undefined,
        review_status: backendDraft?.review_status || fromDraft.review_status,
        is_editable: !isReadOnly,
        is_signed_off: isReadOnly
      }
    }
    if (!form) {
      return buildDefaultFormRecordMetadata(
        {
          id: formId || recordingType,
          title: recordingType.replace(/-/g, ' '),
          category: 'daily_life',
          description: '',
          route: '/record',
          requiresChild: true,
          requiresManagerReview: false,
          safeguardingSensitive: false,
          privacySensitive: false,
          therapeuticPrompt: '',
          qualityChecklist: [],
          orbSuggestedPrompts: [],
          tags: [],
          status: 'partial',
          priority: 'P2',
          routeKind: 'draft_workspace',
          workflowStatus: 'draft_workspace',
          relatedQualityStandards: [],
          relatedEvidenceAreas: []
        },
        {
          childId: childId ? Number(childId) : undefined,
          eventDate,
          writtenByName: backendDraft?.created_by_name || undefined,
          writtenByRole: backendDraft?.created_by_role || undefined,
          isSignedOff: isReadOnly
        }
      )
    }
    return buildDefaultFormRecordMetadata(form, {
      childId: childId ? Number(childId) : undefined,
      eventDate,
      writtenByName: backendDraft?.created_by_name || undefined,
      writtenByRole: backendDraft?.created_by_role || undefined,
      isSignedOff: isReadOnly
    })
  }, [backendDraft, childId, eventDate, form, formId, isReadOnly, recordingType])
  const placeholder = recordingBodyPlaceholder(recordingType, form)
  const wordCount = useMemo(() => countWords(body), [body])
  const structuredJson = useMemo(() => JSON.stringify(structuredData), [structuredData])

  useEffect(() => {
    onAutosaveStateChange?.({ isSaving, saveMode, lastSavedAt, saveError, eventDate, planImpactChecked })
  }, [eventDate, isSaving, lastSavedAt, onAutosaveStateChange, planImpactChecked, saveError, saveMode])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedLocal.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const draftMetadata = useCallback(
    (nextTitle: string, nextBody: string) => {
      const quality = analyseRecordingQuality(nextBody, nextTitle, recordingType)
      const checklist = buildReviewChecklist(nextBody, nextTitle, recordingType)
      const privacyHits = detectPrivacyIdentifiers(`${nextTitle}\n${nextBody}`)
      const safeguardingTerms = detectSafeguardingReviewTerms(`${nextTitle}\n${nextBody}`)
      return {
        manager_review_required: form?.requiresManagerReview ?? false,
        safeguarding_review_required:
          (form?.safeguardingSensitive ?? false) || safeguardingTerms.length > 0,
        privacy_sensitive: (form?.privacySensitive ?? false) || privacyHits.length > 0,
        safeguarding_sensitive: form?.safeguardingSensitive ?? false,
        quality_flags: quality.suggestions,
        language_flags: quality.flaggedPhrases,
        privacy_flags: privacyHits.map((hit) => hit.label),
        checklist_status: Object.fromEntries(checklist.map((item) => [item.id, item.status]))
      }
    },
    [form, recordingType]
  )

  const applyDraftToEditor = useCallback(
    (nextTitle: string, nextBody: string, updatedAt?: string, nextEventDate?: string, nextStructured?: Record<string, unknown>) => {
      setTitle(nextTitle)
      setBody(nextBody)
      setLastSavedAt(updatedAt)
      if (nextEventDate) {
        setEventDate(nextEventDate)
        lastPersisted.current.eventDate = nextEventDate
      }
      if (nextStructured) {
        setStructuredData(nextStructured)
        lastPersisted.current.structuredJson = JSON.stringify(nextStructured)
      }
      lastPersisted.current = {
        ...lastPersisted.current,
        title: nextTitle,
        body: nextBody
      }
      hasUnsavedLocal.current = false
      onTitleChange?.(nextTitle)
      onBodyChange?.(nextBody)
    },
    [onBodyChange, onTitleChange]
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const health = await getRecordingDraftHealth()
      if (cancelled) return
      setBackendAvailable(health.ok && health.data.persistence_available)

      if (draftIdFromUrl) {
        const loaded = await getRecordingDraft(draftIdFromUrl)
        if (!cancelled && loaded.ok && loaded.data?.id) {
          setBackendDraftId(loaded.data.id)
          setBackendDraft(loaded.data)
          onBackendDraftChange?.(loaded.data)
          applyDraftToEditor(loaded.data.title, loaded.data.body, loaded.data.updated_at)
          const loadedEvent =
            loaded.data.event_date ||
            parseFormRecordMetadata(loaded.data.metadata)?.event_date ||
            todayIsoDate()
          setEventDate(loadedEvent)
          lastPersisted.current.eventDate = loadedEvent
          if (loaded.data.structured_data) {
            setStructuredData(loaded.data.structured_data)
            lastPersisted.current.structuredJson = JSON.stringify(loaded.data.structured_data)
          }
          const loadedMeta = parseFormRecordMetadata(loaded.data.metadata)
          if (loadedMeta?.actions_required) {
            setPlanImpactChecked(true)
          }
          setSaveMode('secure')
          setSaveError(false)
          return
        }
      }

      const local = loadRecordingDraft({
        recording_type: recordingType,
        context_type: about,
        child_id: childId
      })
      if (local) {
        applyDraftToEditor(
          local.title,
          local.body,
          local.updated_at,
          local.event_date,
          local.structured_data
        )
        if (!draftIdFromUrl && !backendDraftId) {
          setShowRecoveryBanner(true)
          setSaveMode('local')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    about,
    applyDraftToEditor,
    backendDraftId,
    childId,
    draftIdFromUrl,
    onBackendDraftChange,
    recordingType
  ])

  const persistLocal = useCallback(
    (nextTitle: string, nextBody: string, nextStructured?: Record<string, unknown>) => {
      const saved = saveRecordingDraft({
        recording_type: recordingType,
        context_type: about,
        child_id: childId,
        child_name: childName,
        title: nextTitle,
        body: nextBody,
        event_date: eventDate,
        structured_data: nextStructured ?? structuredData,
        metadata: backendDraftId ? { backend_draft_id: backendDraftId } : undefined
      })
      setLastSavedAt(saved?.updated_at)
      return saved
    },
    [about, backendDraftId, childId, childName, eventDate, recordingType, structuredData]
  )

  const persistBackend = useCallback(
    async (
      nextTitle: string,
      nextBody: string,
      forceCreate = false,
      structuredOverride?: Record<string, unknown>
    ) => {
      if (!backendAvailable) return null
      const meta = draftMetadata(nextTitle, nextBody)
      const quality = analyseRecordingQuality(nextBody, nextTitle, recordingType)
      const payload = {
        title: nextTitle,
        body: nextBody,
        recording_type: recordingType,
        form_id: form?.id,
        category: form?.category,
        context_type: about,
        child_id: childId ? Number(childId) : undefined,
        child_name: childName,
        event_date: eventDate,
        record_date: todayIsoDate(),
        structured_data: structuredOverride ?? structuredData,
        metadata: mergeFormRecordMetadataPatch(backendDraft?.metadata, {
          event_date: eventDate,
          actions_required: planImpactChecked,
          child_voice_present: quality.checks.some((c) => c.id === 'child-voice' && c.passed),
          adult_response_present: quality.checks.some((c) => c.id === 'adult-response' && c.passed)
        }),
        ...meta
      }

      if (!backendDraftId || forceCreate) {
        if (!hasMeaningfulContent(nextTitle, nextBody) && !forceCreate) return null
        const created = await createRecordingDraft(payload)
        if (!created.ok || !created.data.id) return null
        setBackendDraftId(created.data.id)
        setBackendDraft(created.data)
        onBackendDraftChange?.(created.data)
        onDraftListRefresh?.()
        return created.data
      }

      const updated = await autosaveRecordingDraft(backendDraftId, payload)
      if (!updated.ok) return null
      setBackendDraft(updated.data)
      onBackendDraftChange?.(updated.data)
      return updated.data
    },
    [
      about,
      backendAvailable,
      backendDraft?.metadata,
      backendDraftId,
      childId,
      childName,
      draftMetadata,
      eventDate,
      form?.category,
      form?.id,
      onBackendDraftChange,
      onDraftListRefresh,
      planImpactChecked,
      recordingType,
      structuredData
    ]
  )

  const persistDraft = useCallback(
    async (nextTitle: string, nextBody: string, options?: { forceCreate?: boolean; structured?: Record<string, unknown> }) => {
      const nextStructured = options?.structured ?? structuredData
      const nextStructuredJson = JSON.stringify(nextStructured)
      if (
        !options?.forceCreate &&
        nextTitle === lastPersisted.current.title &&
        nextBody === lastPersisted.current.body &&
        eventDate === lastPersisted.current.eventDate &&
        nextStructuredJson === lastPersisted.current.structuredJson
      ) {
        return backendDraftId
      }

      setIsSaving(true)
      setSaveError(false)
      persistLocal(nextTitle, nextBody, nextStructured)

      let secure = false
      let resolvedId = backendDraftId
      if (backendAvailable && (hasMeaningfulContent(nextTitle, nextBody) || options?.forceCreate || Object.keys(nextStructured).length)) {
        const saved = await persistBackend(nextTitle, nextBody, options?.forceCreate, nextStructured)
        secure = Boolean(saved?.id)
        if (saved) {
          resolvedId = saved.id
          setLastSavedAt(saved.updated_at)
          lastPersisted.current = {
            title: nextTitle,
            body: nextBody,
            eventDate,
            structuredJson: nextStructuredJson
          }
          hasUnsavedLocal.current = false
        } else if (backendAvailable) {
          setSaveError(true)
          hasUnsavedLocal.current = true
        }
      } else {
        lastPersisted.current = {
          title: nextTitle,
          body: nextBody,
          eventDate,
          structuredJson: nextStructuredJson
        }
        hasUnsavedLocal.current = true
      }

      setSaveMode(secure ? 'secure' : 'local')
      setIsSaving(false)
      setShowRecoveryBanner(false)
      return resolvedId
    },
    [backendAvailable, backendDraftId, eventDate, persistBackend, persistLocal, structuredData]
  )

  const handleEventDateChange = (value: string) => {
    setEventDate(value)
    scheduleSave(title, body)
  }

  const handleStructuredValuesChange = (values: Record<string, unknown>) => {
    setStructuredData(values)
    scheduleSave(title, body, values)
  }

  const scheduleSave = useCallback(
    (nextTitle: string, nextBody: string, structured?: Record<string, unknown>) => {
      if (!hasMeaningfulContent(nextTitle, nextBody) && !(structured && Object.keys(structured).length)) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void persistDraft(nextTitle, nextBody, { structured })
      }, 1200)
    },
    [persistDraft]
  )

  const handleTitleChange = (value: string) => {
    setTitle(value)
    onTitleChange?.(value)
    scheduleSave(value, body)
  }

  const handleBodyChange = (value: string) => {
    setBody(value)
    onBodyChange?.(value)
    scheduleSave(title, value)
  }

  const handleClearDraft = () => {
    clearRecordingDraft({ recording_type: recordingType, context_type: about, child_id: childId })
    setTitle('')
    setBody('')
    setLastSavedAt(undefined)
    setBackendDraftId(undefined)
    setBackendDraft(null)
    setSaveMode('idle')
    setSaveError(false)
    setSubmitWarning(undefined)
    setStructuredData({})
    setEventDate(todayIsoDate())
    lastPersisted.current = { title: '', body: '', eventDate: todayIsoDate(), structuredJson: '{}' }
    hasUnsavedLocal.current = false
    onTitleChange?.('')
    onBodyChange?.('')
    onBackendDraftChange?.(null)
  }

  const handleRetrySave = () => {
    void persistDraft(title, body, { structured: structuredData })
  }

  const handleCopy = async () => {
    const text = [title.trim(), body.trim()].filter(Boolean).join('\n\n')
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(text)
  }

  const handleReadyForReview = async () => {
    const draftId = await persistDraft(title, body, { forceCreate: true })
    if (!draftId) return
    const result = await markRecordingDraftReadyForReview(draftId)
    if (result.ok) {
      setBackendDraft(result.data)
      onBackendDraftChange?.(result.data)
      onDraftListRefresh?.()
    }
  }

  const handleSubmit = async () => {
    const draftId = await persistDraft(title, body, { forceCreate: true })
    if (!draftId) return
    const result = await submitRecordingDraft(draftId, {
      submitted_to: 'formal_record',
      confirm_reviewed: confirmReviewed,
      create_chronology_link: true
    })
    if (!result.ok) return
    setBackendDraft(result.data.draft)
    onBackendDraftChange?.(result.data.draft)
    setSubmitWarning(result.data.warning)
    if (result.data.submission) {
      setSubmissionResult(result.data.submission)
    }
    onDraftListRefresh?.()
  }

  const handleRestoreLocal = () => {
    const local = loadRecordingDraft({
      recording_type: recordingType,
      context_type: about,
      child_id: childId
    })
    if (!local) return
    applyDraftToEditor(local.title, local.body, local.updated_at)
    setShowRecoveryBanner(false)
    setSaveMode('local')
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!backendDraftId) {
        const status = form?.requiresManagerReview
          ? 'Manager review is required before formal submission.'
          : form?.routeKind === 'existing_workflow'
            ? submissionTargetStatusCopy('route_to_existing_workflow', form?.title)
            : submissionTargetStatusCopy('unsupported')
        if (!cancelled) setSubmissionTargetHint(status)
        return
      }
      const target = await getRecordingSubmissionTarget(backendDraftId)
      if (cancelled) return
      if (target.ok && target.data) {
        const hint =
          target.data.route_hint ||
          submissionTargetStatusCopy(
            target.data.target.target_status,
            target.data.target.target_record_type
          )
        setSubmissionTargetHint(hint)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [backendDraftId, form])

  const managerReviewNotice =
    backendDraft?.manager_review_required ||
    backendDraft?.safeguarding_review_required ||
    form?.requiresManagerReview
      ? 'Manager review is required before formal submission.'
      : undefined

  const lifecycleLinks = childId
    ? {
        archiveHref: `/young-people/${childId}/archive`,
        chronologyHref: `/young-people/${childId}/chronology`,
        planImpactsHref: `/young-people/${childId}/plan-impacts`,
        lifeechoHref: `/young-people/${childId}/lifeecho`,
        formalRecordId: submissionResult?.linked_record_id || backendDraft?.linked_record_id || undefined
      }
    : undefined

  const editorBody = (
    <>
      {showRecoveryBanner ? (
        <RecordingDraftRecoveryBanner onRestore={handleRestoreLocal} onDismiss={() => setShowRecoveryBanner(false)} />
      ) : null}

      {backendDraftId && !draftIdFromUrl ? (
        <p className="text-xs font-black text-blue-900" data-testid="recording-resume-draft">
          Resume draft — continue editing below.
        </p>
      ) : null}

      {managerReviewNotice ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-950">
          {managerReviewNotice}
        </p>
      ) : null}

      {submissionTargetHint ? (
        <p
          className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-950"
          data-testid="recording-submission-target-hint"
        >
          {submissionTargetHint}
        </p>
      ) : null}

      {managerReviewNotice && !isReadOnly ? (
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={confirmReviewed}
            onChange={(event) => setConfirmReviewed(event.target.checked)}
            data-testid="recording-confirm-reviewed"
          />
          I confirm manager or safeguarding review is complete
        </label>
      ) : null}

      {form?.hasStructuredTemplate ? (
        <StructuredRecordingForm
          formId={form.id}
          initialValues={structuredData}
          onValuesChange={handleStructuredValuesChange}
          onCompletionChange={onStructuredCompletionChange}
        />
      ) : null}

      <label className="block">
        <span className="text-sm font-black text-slate-950">Title / summary</span>
        <input
          type="text"
          data-testid="recording-editor-title"
          value={title}
          disabled={isReadOnly}
          onChange={(event) => handleTitleChange(event.target.value)}
          placeholder="Short summary for this record"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
        />
      </label>

      <label className="block">
        <span className="text-sm font-black text-slate-950">Record body</span>
        <textarea
          data-testid="recording-editor-body"
          spellCheck
          value={body}
          disabled={isReadOnly}
          onChange={(event) => handleBodyChange(event.target.value)}
          placeholder={placeholder}
          rows={14}
          className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
        <span data-testid="recording-word-count">{wordCount} words</span>
        <span>Spellcheck enabled in supported browsers</span>
      </div>

      <RecordingAutosaveIndicator
        lastSavedAt={lastSavedAt}
        isSaving={isSaving}
        saveMode={saveMode}
        draftStatus={backendDraft?.status}
        privacyNotice={RECORDING_DRAFT_PRIVACY_NOTICE}
        submitWarning={submitWarning}
        saveError={saveError}
        onRetrySave={handleRetrySave}
      />

      {submissionResult ? (
        <RecordingSubmissionResultCard result={submissionResult} childId={childId} />
      ) : null}

      {form && submissionResult?.formal_record_created ? (
        <RecordingFormLifecycleOutcome
          lifecycle={formMetadata.lifecycle}
          links={lifecycleLinks}
          signOffSummary={submissionResult?.warnings?.[0]}
        />
      ) : null}
    </>
  )

  const editorActions = !isReadOnly ? (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        data-testid="recording-save-draft"
        onClick={() => void persistDraft(title, body, { forceCreate: true })}
        className="inline-flex min-h-10 items-center rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
      >
        Save draft
      </button>
      <button
        type="button"
        data-testid="recording-ready-for-review"
        onClick={() => void handleReadyForReview()}
        className="inline-flex min-h-10 items-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-950"
      >
        Send to review queue
      </button>
      <button
        type="button"
        data-testid="recording-submit-draft"
        onClick={() => void handleSubmit()}
        className="inline-flex min-h-10 items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-950"
      >
        Submit draft
      </button>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
      >
        Copy wording
      </button>
      <button
        type="button"
        onClick={handleClearDraft}
        className="inline-flex min-h-10 items-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-950"
      >
        Clear draft
      </button>
    </div>
  ) : (
    <p className="text-xs font-black text-amber-950" data-testid="recording-addendum-hint">
      This record is signed off and cannot be edited directly. Create an addendum via the correction workflow when
      available.
    </p>
  )

  return (
    <section data-testid="recording-editor" className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      {form ? (
        <RecordingFormShell
          form={form}
          formMetadata={formMetadata}
          childName={childName}
          lastSavedAt={lastSavedAt}
          onEventDateChange={isReadOnly ? undefined : handleEventDateChange}
          planImpactChecked={planImpactChecked}
          onPlanImpactChange={isReadOnly ? undefined : setPlanImpactChecked}
          readOnly={isReadOnly}
          actions={editorActions}
        >
          {editorBody}
        </RecordingFormShell>
      ) : (
        <div className="space-y-4">
          {editorBody}
          {editorActions}
        </div>
      )}
    </section>
  )
}
