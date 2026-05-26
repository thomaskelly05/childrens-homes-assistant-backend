'use client'

export type RecordingSaveMode = 'idle' | 'local' | 'secure' | 'saving'

type RecordingAutosaveIndicatorProps = {
  lastSavedAt?: string
  isSaving?: boolean
  saveMode?: RecordingSaveMode
  draftStatus?: string
  privacyNotice: string
  submitWarning?: string
  saveError?: boolean
  onRetrySave?: () => void
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

function saveModeLabel(saveMode: RecordingSaveMode, draftStatus?: string, saveError?: boolean) {
  if (saveError) return 'Unable to autosave — retry'
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
  submitWarning,
  saveError,
  onRetrySave
}: RecordingAutosaveIndicatorProps) {
  const savedLabel = formatSavedAt(lastSavedAt)
  const mode = isSaving ? 'saving' : saveMode
  const statusLabel = saveModeLabel(mode, draftStatus, saveError)

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
      {saveError ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-rose-800" data-testid="recording-autosave-error">
            Unable to autosave — your work is saved in this browser.
          </p>
          {onRetrySave ? (
            <button
              type="button"
              data-testid="recording-autosave-retry"
              onClick={onRetrySave}
              className="rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-black text-white"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {submitWarning ? (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950" data-testid="recording-submit-warning">
          {submitWarning}
        </p>
      ) : null}
    </div>
  )
}
