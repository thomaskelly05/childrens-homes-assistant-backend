'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { RecordingAutosaveIndicator, type RecordingSaveMode } from '@/components/indicare/record/recording-autosave-indicator'
import { RecordingDraftRecoveryBanner } from '@/components/indicare/record/recording-draft-recovery-banner'
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
  onDraftListRefresh
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPersisted = useRef({ title: '', body: '' })

  const form = useMemo(() => resolveActiveRecordingForm(recordingType, formId), [recordingType, formId])
  const placeholder = recordingBodyPlaceholder(recordingType, form)
  const wordCount = useMemo(() => countWords(body), [body])

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
    (nextTitle: string, nextBody: string, updatedAt?: string) => {
      setTitle(nextTitle)
      setBody(nextBody)
      setLastSavedAt(updatedAt)
      lastPersisted.current = { title: nextTitle, body: nextBody }
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
          setSaveMode('secure')
          return
        }
      }

      const local = loadRecordingDraft({
        recording_type: recordingType,
        context_type: about,
        child_id: childId
      })
      if (local) {
        applyDraftToEditor(local.title, local.body, local.updated_at)
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
    (nextTitle: string, nextBody: string) => {
      const saved = saveRecordingDraft({
        recording_type: recordingType,
        context_type: about,
        child_id: childId,
        child_name: childName,
        title: nextTitle,
        body: nextBody,
        metadata: backendDraftId ? { backend_draft_id: backendDraftId } : undefined
      })
      setLastSavedAt(saved?.updated_at)
      return saved
    },
    [about, backendDraftId, childId, childName, recordingType]
  )

  const persistBackend = useCallback(
    async (nextTitle: string, nextBody: string, forceCreate = false) => {
      if (!backendAvailable) return null
      const meta = draftMetadata(nextTitle, nextBody)
      const payload = {
        title: nextTitle,
        body: nextBody,
        recording_type: recordingType,
        form_id: form?.id,
        category: form?.category,
        context_type: about,
        child_id: childId ? Number(childId) : undefined,
        child_name: childName,
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
      backendDraftId,
      childId,
      childName,
      draftMetadata,
      form?.category,
      form?.id,
      onBackendDraftChange,
      onDraftListRefresh,
      recordingType
    ]
  )

  const persistDraft = useCallback(
    async (nextTitle: string, nextBody: string, options?: { forceCreate?: boolean }) => {
      if (
        !options?.forceCreate &&
        nextTitle === lastPersisted.current.title &&
        nextBody === lastPersisted.current.body
      ) {
        return backendDraftId
      }

      setIsSaving(true)
      persistLocal(nextTitle, nextBody)

      let secure = false
      let resolvedId = backendDraftId
      if (backendAvailable && (hasMeaningfulContent(nextTitle, nextBody) || options?.forceCreate)) {
        const saved = await persistBackend(nextTitle, nextBody, options?.forceCreate)
        secure = Boolean(saved?.id)
        if (saved) {
          resolvedId = saved.id
          setLastSavedAt(saved.updated_at)
          lastPersisted.current = { title: nextTitle, body: nextBody }
        }
      } else {
        lastPersisted.current = { title: nextTitle, body: nextBody }
      }

      setSaveMode(secure ? 'secure' : 'local')
      setIsSaving(false)
      setShowRecoveryBanner(false)
      return resolvedId
    },
    [backendAvailable, backendDraftId, persistBackend, persistLocal]
  )

  const scheduleSave = useCallback(
    (nextTitle: string, nextBody: string) => {
      if (!hasMeaningfulContent(nextTitle, nextBody)) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void persistDraft(nextTitle, nextBody)
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
    setSubmitWarning(undefined)
    lastPersisted.current = { title: '', body: '' }
    onTitleChange?.('')
    onBodyChange?.('')
    onBackendDraftChange?.(null)
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

  return (
    <section data-testid="recording-editor" className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <div className="space-y-4">
        {showRecoveryBanner ? (
          <RecordingDraftRecoveryBanner
            onRestore={handleRestoreLocal}
            onDismiss={() => setShowRecoveryBanner(false)}
          />
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

        {managerReviewNotice ? (
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

        <label className="block">
          <span className="text-sm font-black text-slate-950">Title / summary</span>
          <input
            type="text"
            data-testid="recording-editor-title"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="Short summary for this record"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-950">Record body</span>
          <textarea
            data-testid="recording-editor-body"
            spellCheck
            value={body}
            onChange={(event) => handleBodyChange(event.target.value)}
            placeholder={placeholder}
            rows={14}
            className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
        />

        {submissionResult ? (
          <RecordingSubmissionResultCard result={submissionResult} childId={childId} />
        ) : null}

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
            Mark ready for review
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
      </div>
    </section>
  )
}
