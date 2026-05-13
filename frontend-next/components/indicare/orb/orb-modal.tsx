'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, FileText, Lock, X } from 'lucide-react'

import { OrbControls } from './orb-controls'
import { OrbModeSwitcher } from './orb-mode-switcher'
import { OrbTranscript } from './orb-transcript'
import { orbStateLabel, OrbVisual } from './orb-visual'
import { OrbRuntimeController, type OrbRuntimeSnapshot } from '@/lib/orb/state'
import type { OrbContext, OrbSelectedMode, OrbVoiceDraft } from '@/lib/orb/types'

function DraftPreview({ draft, onClose }: { draft: OrbVoiceDraft; onClose: () => void }) {
  return (
    <div className="rounded-[24px] border border-purple-200 bg-purple-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-700">Pending write confirmation</p>
          <h3 className="mt-2 text-lg font-black text-purple-950">{draft.title}</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-white p-2 text-purple-700">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 max-h-44 overflow-auto rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
        {draft.content}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button className="rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white">
          <Check className="mr-2 inline h-4 w-4" aria-hidden />
          Save after review
        </button>
        <button className="rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-black text-purple-800">
          Edit draft
        </button>
        <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
          Cancel
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-purple-900">
        Safety foundation: save/edit/cancel controls are present, but this sprint does not silently write records. The backend audit marks this as pending confirmation.
      </p>
    </div>
  )
}

export function OrbModal({
  open,
  onClose,
  context,
  role
}: {
  open: boolean
  onClose: () => void
  context: OrbContext
  role?: string | null
}) {
  const controller = useMemo(() => new OrbRuntimeController({ context, role }), [context, role])
  const [snapshot, setSnapshot] = useState<OrbRuntimeSnapshot>(controller.getSnapshot())
  const [input, setInput] = useState('')
  const [draftDismissed, setDraftDismissed] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => controller.subscribe(setSnapshot), [controller])

  useEffect(() => {
    if (open && !snapshot.sessionId && !snapshot.loading) {
      void controller.start(context, role)
    }
  }, [controller, context, open, role, snapshot.loading, snapshot.sessionId])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const pendingDraft = draftDismissed ? null : snapshot.pendingDraft

  async function send() {
    const text = input.trim()
    if (!text) return
    setInput('')
    setDraftDismissed(false)
    await controller.sendText(text, context)
  }

  function setMode(mode: OrbSelectedMode) {
    controller.updateMode(mode, context, role)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true" aria-labelledby="orb-modal-title">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-[#f8fafc] shadow-2xl shadow-slate-950/30">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <OrbVisual state={snapshot.state} size="small" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Orb powered by IndiCare</p>
              <h2 id="orb-modal-title" className="text-2xl font-black tracking-[-0.04em] text-slate-950">Voice and conversational care assistant</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Status: {orbStateLabel(snapshot.state)} - Wake phrase foundation: &quot;Hey IndiCare&quot;.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-3 text-slate-600 hover:bg-slate-200" aria-label="Close Orb">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="grid max-h-[calc(94vh-92px)] gap-5 overflow-auto p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[28px] border border-white/70 bg-white p-6 text-center shadow-sm">
              <OrbVisual state={snapshot.state} />
              <p className="mt-5 text-sm font-black text-slate-950">{snapshot.modeDecision.brain === 'inspector' ? 'Inspector Brain' : 'Care Assistant Brain'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{snapshot.modeDecision.tone}</p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                <Lock className="h-4 w-4" aria-hidden />
                Privacy
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>Raw audio is not stored by default.</li>
                <li>Transcripts can be disabled with private/do-not-store preferences.</li>
                <li>Record-specific answers use RBAC-scoped citations.</li>
              </ul>
            </div>

            {snapshot.error ? (
              <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                <AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden />
                {snapshot.error}
              </div>
            ) : null}
          </aside>

          <main className="space-y-4">
            <OrbModeSwitcher value={snapshot.selectedMode} decision={snapshot.modeDecision} onChange={setMode} />
            <OrbControls
              state={snapshot.state}
              microphone={snapshot.microphone}
              input={input}
              loading={snapshot.loading}
              privateMode={snapshot.preferences.private_mode}
              muted={snapshot.state === 'muted'}
              onInputChange={setInput}
              onSend={send}
              onRequestMicrophone={() => void controller.requestMicrophone()}
              onInterrupt={() => void controller.interrupt()}
              onMute={(value) => void controller.setMuted(value)}
              onPrivateMode={(value) => void controller.setPrivateMode(value)}
              onEnd={() => void controller.end()}
            />
            {pendingDraft ? <DraftPreview draft={pendingDraft} onClose={() => setDraftDismissed(true)} /> : null}
            <OrbTranscript transcript={snapshot.transcript} partialTranscript={snapshot.partialTranscript} />
            <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              <FileText className="mr-2 inline h-4 w-4" aria-hidden />
              Try: &quot;Start my shift&quot;, &quot;What would Ofsted challenge here?&quot;, &quot;Create a daily note for Jamie&quot;, or &quot;What Reg 44 actions remain open?&quot;
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

