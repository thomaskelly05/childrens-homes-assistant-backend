'use client'

type RecordingAutosaveIndicatorProps = {
  lastSavedAt?: string
  isSaving?: boolean
  privacyNotice: string
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

export function RecordingAutosaveIndicator({ lastSavedAt, isSaving, privacyNotice }: RecordingAutosaveIndicatorProps) {
  const savedLabel = formatSavedAt(lastSavedAt)

  return (
    <div data-testid="recording-autosave-indicator" className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
      <p className="font-black uppercase tracking-[0.16em] text-slate-500">Autosave</p>
      <p className="mt-1 text-slate-700">
        {isSaving ? 'Saving draft in this browser…' : savedLabel ? `Last saved ${savedLabel}` : 'Draft not saved yet'}
      </p>
      <p className="mt-2 text-slate-500">{privacyNotice}</p>
      <p className="mt-2 text-slate-500">
        Draft is saved in this browser until submitted to the correct record workflow.
      </p>
    </div>
  )
}
