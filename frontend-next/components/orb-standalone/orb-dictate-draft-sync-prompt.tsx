'use client'

import { useMemo } from 'react'
import { CloudUpload } from 'lucide-react'

import {
  dismissOrbDictateDraftSync,
  draftsNeedingSync,
  type OrbDictateDraftSyncRow
} from '@/lib/orb/dictate/orb-dictate-draft-sync'
import { saveOrbDictateNote } from '@/lib/orb/dictate/orb-dictate-client'
import { markOrbDictateDraftSynced } from '@/lib/orb/dictate/orb-dictate-draft-sync'

export function OrbDictateDraftSyncPrompt({
  backendAvailable,
  onStatusMessage
}: {
  backendAvailable: boolean
  onStatusMessage: (msg: string | null) => void
}) {
  const pending = useMemo(() => (backendAvailable ? draftsNeedingSync() : []), [backendAvailable])

  if (!pending.length) return null

  async function syncDraft(row: OrbDictateDraftSyncRow) {
    try {
      const saved = await saveOrbDictateNote({
        note_id: row.note_id,
        title: row.title,
        note_type: row.note_type,
        professional_note: row.current_text,
        summary: row.summary,
        transcript: row.transcript
      })
      markOrbDictateDraftSynced(row.sync.local_id, saved.note_id)
      onStatusMessage('Draft synced to ORB.')
    } catch {
      onStatusMessage('Could not sync — kept locally.')
    }
  }

  return (
    <div
      className="mb-3 rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2.5"
      data-orb-dictate-draft-sync-prompt
    >
      <div className="flex items-center gap-2 text-xs font-medium text-sky-100">
        <CloudUpload className="h-3.5 w-3.5" />
        Sync local drafts to ORB
      </div>
      <p className="mt-1 text-[11px] text-sky-100/80">
        You have {pending.length} local draft{pending.length === 1 ? '' : 's'}. Choose what to upload — nothing
        is sent without your confirmation.
      </p>
      <ul className="mt-2 space-y-1.5">
        {pending.slice(0, 5).map((row) => (
          <li
            key={row.sync.local_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5"
            data-orb-dictate-draft-sync-row={row.sync.local_id}
          >
            <span className="text-[11px] text-slate-200">
              {row.title}{' '}
              <span className="text-slate-500">
                · {new Date(row.updated_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-100"
                onClick={() => void syncDraft(row)}
              >
                Sync
              </button>
              <button
                type="button"
                className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-slate-400"
                onClick={() => {
                  dismissOrbDictateDraftSync(row.sync.local_id)
                  onStatusMessage('Kept local only.')
                }}
              >
                Keep local
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
