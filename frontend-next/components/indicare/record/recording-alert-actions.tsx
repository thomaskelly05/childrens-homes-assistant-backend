'use client'

import { useState } from 'react'

import type { RecordingAlertRecord } from '@/lib/os-api/recording-alerts'
import { applyRecordingAlertAction } from '@/lib/os-api/recording-alerts'

export function RecordingAlertActions({
  alert,
  onUpdated
}: {
  alert: RecordingAlertRecord
  onUpdated: (alert: RecordingAlertRecord) => void
}) {
  const [note, setNote] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | undefined>()

  async function run(
    action: 'acknowledge' | 'assign' | 'resolve' | 'archive' | 'reopen' | 'create_intelligence_action'
  ) {
    setBusy(true)
    setMessage(undefined)
    const result = await applyRecordingAlertAction(alert.id, {
      action,
      note: note || undefined,
      owner_name: ownerName || undefined,
      create_action: action === 'create_intelligence_action'
    })
    setBusy(false)
    if (result.ok && result.data.alert) {
      onUpdated(result.data.alert)
      setMessage(result.data.warning || result.data.message)
    } else {
      setMessage(result.error || 'Action failed')
    }
  }

  return (
    <section data-testid="recording-alert-actions" className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-600">
        Manager actions — alerts do not replace professional judgement.
      </p>
      <textarea
        data-testid="recording-alert-action-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for acknowledge, assign or resolve"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
        rows={2}
      />
      <input
        data-testid="recording-alert-assign-name"
        value={ownerName}
        onChange={(e) => setOwnerName(e.target.value)}
        placeholder="Assign to (name or role label)"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
      />
      <div className="flex flex-wrap gap-2">
        <ActionButton testId="recording-alert-acknowledge" disabled={busy} onClick={() => void run('acknowledge')}>
          Acknowledge
        </ActionButton>
        <ActionButton testId="recording-alert-assign" disabled={busy} onClick={() => void run('assign')}>
          Assign
        </ActionButton>
        <ActionButton testId="recording-alert-resolve" disabled={busy} onClick={() => void run('resolve')}>
          Resolve
        </ActionButton>
        <ActionButton testId="recording-alert-archive" disabled={busy} onClick={() => void run('archive')}>
          Archive
        </ActionButton>
        <ActionButton
          testId="recording-alert-create-action"
          disabled={busy}
          onClick={() => void run('create_intelligence_action')}
        >
          Link intelligence action
        </ActionButton>
      </div>
      {message ? (
        <p className="text-xs font-semibold text-slate-600" data-testid="recording-alert-action-message">
          {message}
        </p>
      ) : null}
    </section>
  )
}

function ActionButton({
  children,
  testId,
  disabled,
  onClick
}: {
  children: React.ReactNode
  testId: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="min-h-9 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-800 disabled:opacity-50"
    >
      {children}
    </button>
  )
}
