'use client'

export type RecordingSaveMode = 'idle' | 'local' | 'secure' | 'saving'

type RecordingAutosaveIndicatorProps = {
  lastSavedAt?: string
  isSaving?: boolean
  saveMode?: RecordingSaveMode
  draftStatus?: string
  privacyNotice: string
  submitWarning?: string
}

function formatSavedAt(iso?: string) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function saveModeLabel(saveMode: RecordingSaveMode, draftStatus?: string) {
  if (draftStatus === 'ready_for_review') return 'Ready for review'
  if (draftStatus === 'submitted') return 'Submitted'
  if (saveMode === 'secure') return 'Saved securely'
  if (saveMode === 'local') return 'Saved in this browser'
  if (saveMode === 'saving') return 'Saving…'
  return 'Draft'
}

export function RecordingAutosaveIndicator({
  lastSavedAt,
  isSaving,
  saveMode = 'idle',
  draftStatus,
  privacyNotice,
  submitWarning
}: RecordingAutosaveIndicatorProps) {
  const savedLabel = formatSavedAt(lastSavedAt)
  const mode = isSaving ? 'saving' : saveMode
  const statusLabel = saveModeLabel(mode, draftStatus)

  return (
    <div data-testid="recording-autosave-indicator" className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
      <p className="font-black uppercase tracking-[0.16em] text-slate-500">Autosave</p>
      <p className="mt-1 text-slate-700" data-testid="recording-save-status">
        {isSaving
          ? saveMode === 'secure'
            ? 'Saving securely…'
            : 'Saving draft in this browser…'
          : savedLabel
            ? `${statusLabel} · last saved ${savedLabel}`
            : statusLabel}
      </p>
      <p className="mt-2 text-slate-500">{privacyNotice}</p>
      <p className="mt-2 text-slate-500">
        {saveMode === 'secure'
          ? 'Draft is stored securely on the server for signed-in adults. Local browser copy remains as fallback.'
          : 'Draft is saved in this browser until submitted to the correct record workflow.'}
      </p>
      {submitWarning ? (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950" data-testid="recording-submit-warning">
          {submitWarning}
        </p>
      ) : null}
    </div>
  )
}
