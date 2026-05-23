'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { RecordingAutosaveIndicator } from '@/components/indicare/record/recording-autosave-indicator'
import {
  RECORDING_DRAFT_PRIVACY_NOTICE,
  clearRecordingDraft,
  countWords,
  loadRecordingDraft,
  saveRecordingDraft
} from '@/lib/record/recording-draft-store'
import type { RecordAboutContext } from '@/lib/record/recording-hub'
import { RECORDING_BODY_PLACEHOLDERS, type RecordingWorkspaceType } from '@/lib/record/recording-types'

type RecordingEditorProps = {
  recordingType: RecordingWorkspaceType
  about: RecordAboutContext
  childId?: string
  childName?: string
  onTitleChange?: (title: string) => void
  onBodyChange?: (body: string) => void
}

export function RecordingEditor({
  recordingType,
  about,
  childId,
  childName,
  onTitleChange,
  onBodyChange
}: RecordingEditorProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const placeholder = RECORDING_BODY_PLACEHOLDERS[recordingType]
  const wordCount = useMemo(() => countWords(body), [body])

  useEffect(() => {
    const draft = loadRecordingDraft({
      recording_type: recordingType,
      context_type: about,
      child_id: childId
    })
    if (!draft) return
    setTitle(draft.title)
    setBody(draft.body)
    setLastSavedAt(draft.updated_at)
    onTitleChange?.(draft.title)
    onBodyChange?.(draft.body)
  }, [about, childId, onBodyChange, onTitleChange, recordingType])

  const persistDraft = useCallback(
    (nextTitle: string, nextBody: string) => {
      setIsSaving(true)
      const saved = saveRecordingDraft({
        recording_type: recordingType,
        context_type: about,
        child_id: childId,
        child_name: childName,
        title: nextTitle,
        body: nextBody
      })
      setLastSavedAt(saved?.updated_at)
      setIsSaving(false)
    },
    [about, childId, childName, recordingType]
  )

  const scheduleSave = useCallback(
    (nextTitle: string, nextBody: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => persistDraft(nextTitle, nextBody), 600)
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
    onTitleChange?.('')
    onBodyChange?.('')
  }

  const handleCopy = async () => {
    const text = [title.trim(), body.trim()].filter(Boolean).join('\n\n')
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(text)
  }

  return (
    <section data-testid="recording-editor" className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <div className="space-y-4">
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
          privacyNotice={RECORDING_DRAFT_PRIVACY_NOTICE}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => persistDraft(title, body)}
            className="inline-flex min-h-10 items-center rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
          >
            Save draft
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
