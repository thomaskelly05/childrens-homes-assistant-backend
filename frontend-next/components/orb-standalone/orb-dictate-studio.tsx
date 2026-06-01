'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ClipboardCopy,
  Download,
  FileText,
  History,
  MessageSquare,
  Mic,
  RotateCcw,
  Save,
  Shield
} from 'lucide-react'

import { OrbDictateDraftSyncPrompt } from '@/components/orb-standalone/orb-dictate-draft-sync-prompt'
import { OrbDictateFindReplacePanel } from '@/components/orb-standalone/orb-dictate-find-replace-panel'
import { OrbDictateStudioAssistant } from '@/components/orb-standalone/orb-dictate-studio-assistant'
import { OrbDictateStudioQuality } from '@/components/orb-standalone/orb-dictate-studio-quality'
import { useOrbSessionGate } from '@/hooks/use-orb-session-gate'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import {
  buildLocalDictateEditFallback,
  editOrbDictateDocument,
  exportOrbDictateNote,
  patchOrbDictateNote,
  saveOrbDictateNote,
  withDictateExportDraftNotice
} from '@/lib/orb/dictate/orb-dictate-client'
import {
  loadOrbDictateDraft,
  pushOrbDictateVersion,
  saveOrbDictateDraftLocal,
  type OrbDictateDraft
} from '@/lib/orb/dictate/orb-dictate-drafts'
import {
  buildAnonymisePreview,
  type OrbDictateAnonymisePreset
} from '@/lib/orb/dictate/orb-dictate-anonymise-preview'
import {
  calculateOrbDictateReadiness,
  orbDictateReadinessDisclaimer
} from '@/lib/orb/dictate/orb-dictate-readiness'
import {
  ORB_DICTATE_TONE_LABELS,
  ORB_DICTATE_TONE_OPTIONS,
  toneInstructionForLock,
  type OrbDictateToneLock
} from '@/lib/orb/dictate/orb-dictate-tone-lock'
import { upsertOrbLocalSavedOutput } from '@/lib/orb/orb-saved-outputs-local'
import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'
import type { OrbDictateEditResult } from '@/lib/orb/dictate/orb-dictate-client'
import type { OrbDictateGenerateResult, OrbDictateQualityChecks } from '@/lib/orb/dictate/orb-dictate-types'
import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'

type StudioTab = 'document' | 'assistant' | 'transcript' | 'quality' | 'export'

type AutosaveStatus = 'idle' | 'saving' | 'saved_orb' | 'saved_local' | 'reconnect' | 'error'

export function OrbDictateStudio({
  output,
  participants,
  segments,
  onBack,
  onSendToChat,
  onOpenOrbVoice,
  onStatusMessage
}: {
  output: OrbDictateGenerateResult
  participants: OrbDictateParticipant[]
  segments: OrbDictateTranscriptSegment[]
  onBack: () => void
  onSendToChat: (text: string) => void | Promise<void>
  onOpenOrbVoice?: () => void
  onStatusMessage: (msg: string | null) => void
}) {
  const [documentText, setDocumentText] = useState(output.professional_note)
  const [qualityChecks, setQualityChecks] = useState(output.quality_checks)
  const [mobileTab, setMobileTab] = useState<StudioTab>('document')
  const [pendingEdit, setPendingEdit] = useState<OrbDictateEditResult | null>(null)
  const [editing, setEditing] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [noteId, setNoteId] = useState<string | null>(output.note_id ?? null)
  const [toneLock, setToneLock] = useState<OrbDictateToneLock>('professional')
  const [anonymisePreview, setAnonymisePreview] = useState<string | null>(null)
  const [anonymisePreset, setAnonymisePreset] = useState<OrbDictateAnonymisePreset>('staff_role')
  const [versions, setVersions] = useState<OrbDictateDraft['versions']>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const sessionGate = useOrbSessionGate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef(documentText)

  const wordCount = useMemo(() => documentText.trim().split(/\s+/).filter(Boolean).length, [documentText])
  const charCount = documentText.length
  const readiness = useMemo(
    () => calculateOrbDictateReadiness(documentText, qualityChecks),
    [documentText, qualityChecks]
  )
  const backendAvailable =
    sessionGate.backendSyncState === 'ready' || sessionGate.backendSyncState === 'unknown'

  useEffect(() => {
    const existing = loadOrbDictateDraft(noteId)
    if (existing?.tone_lock) setToneLock(existing.tone_lock)
    if (existing?.versions?.length) {
      setVersions(existing.versions)
    } else {
      setVersions([
        {
          id: 'v_generated',
          label: 'Generated',
          text: output.professional_note,
          created_at: new Date().toISOString(),
          event: 'generated'
        }
      ])
    }
  }, [noteId, output.professional_note])

  const persistDraft = useCallback(
    (text: string, event: OrbDictateDraft['versions'][0]['event'], label: string) => {
      const draft: OrbDictateDraft = {
        note_id: noteId,
        title: output.title,
        note_type: output.note_type,
        current_text: text,
        summary: output.summary,
        transcript: output.transcript,
        participants,
        segments,
        quality_checks: qualityChecks,
        updated_at: new Date().toISOString(),
        versions,
        is_draft: true,
        tone_lock: toneLock,
        readiness_label: readiness.title
      }
      const withVersion = pushOrbDictateVersion(draft, { label, text, event })
      setVersions(withVersion.versions)
      saveOrbDictateDraftLocal(withVersion)
      lastSavedRef.current = text
    },
    [noteId, output, participants, segments, qualityChecks, versions, toneLock, readiness.title]
  )

  const runAutosave = useCallback(
    async (text: string) => {
      if (text === lastSavedRef.current) return
      setAutosaveStatus('saving')
      const draftPayload: OrbDictateDraft = {
        note_id: noteId,
        title: output.title,
        note_type: output.note_type,
        current_text: text,
        summary: output.summary,
        transcript: output.transcript,
        participants,
        segments,
        quality_checks: qualityChecks,
        updated_at: new Date().toISOString(),
        versions,
        is_draft: true,
        tone_lock: toneLock,
        readiness_label: readiness.title
      }
      saveOrbDictateDraftLocal(draftPayload)

      if (noteId && /^\d+$/.test(noteId)) {
        try {
          await patchOrbDictateNote(noteId, {
            professional_note: text,
            title: output.title,
            create_version: false
          })
          setAutosaveStatus('saved_orb')
          setLastSavedAt(new Date().toISOString())
          lastSavedRef.current = text
          return
        } catch {
          setAutosaveStatus(sessionGate.shouldSkipAuthenticatedFetch ? 'reconnect' : 'saved_local')
          setLastSavedAt(new Date().toISOString())
          return
        }
      }
      setAutosaveStatus('saved_local')
      setLastSavedAt(new Date().toISOString())
      lastSavedRef.current = text
    },
    [noteId, output, participants, segments, qualityChecks, versions, toneLock, readiness.title, sessionGate.shouldSkipAuthenticatedFetch]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void runAutosave(documentText)
    }, 7000)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [documentText, runAutosave])

  async function handleRunEdit(mode: OrbDictateEditMode | undefined, instruction: string) {
    setEditing(true)
    setPendingEdit(null)
    onStatusMessage(null)
    try {
      const toneHint = toneInstructionForLock(toneLock)
      const result = await editOrbDictateDocument({
        document_text: documentText,
        instruction: instruction.trim() ? `${instruction}\n\n${toneHint}` : toneHint,
        note_type: output.note_type,
        mode
      })
      setPendingEdit(result)
      setQualityChecks(result.quality_checks)
    } catch {
      const fallback = buildLocalDictateEditFallback(
        documentText,
        mode ?? 'professional_language',
        instruction
      )
      setPendingEdit(fallback)
      setQualityChecks(fallback.quality_checks)
      onStatusMessage('Applied offline edit — reconnect for full ORB intelligence.')
    } finally {
      setEditing(false)
    }
  }

  function handleApplyEdit() {
    if (!pendingEdit) return
    setDocumentText(pendingEdit.revised_text)
    setQualityChecks(pendingEdit.quality_checks)
    persistDraft(pendingEdit.revised_text, 'ai_edit', pendingEdit.version_label)
    setPendingEdit(null)
    onStatusMessage('Changes applied — review before saving.')
  }

  function handleRestoreVersion(versionId: string) {
    const v = versions.find((x) => x.id === versionId)
    if (!v) return
    setDocumentText(v.text)
    setSelectedVersionId(versionId)
    persistDraft(v.text, 'restored', `Restored: ${v.label}`)
    onStatusMessage(`Restored version: ${v.label}`)
  }

  function undoLastVersion() {
    if (versions.length < 2) return
    const prev = versions[1]
    handleRestoreVersion(prev.id)
  }

  async function handleCopy() {
    const ok = await copyTextToClipboard(documentText)
    onStatusMessage(ok ? 'Copied to clipboard.' : 'Copy failed.')
  }

  async function handleSave() {
    setAutosaveStatus('saving')
    try {
      if (backendAvailable) {
        const saved = await saveOrbDictateNote({
          note_id: noteId,
          title: output.title,
          note_type: output.note_type,
          professional_note: documentText,
          summary: output.summary,
          transcript: output.transcript,
          actions: output.actions
        })
        setNoteId(saved.note_id)
        persistDraft(documentText, 'saved', 'Saved')
        setAutosaveStatus('saved_orb')
        setLastSavedAt(new Date().toISOString())
        onStatusMessage('Saved to ORB.')
        return
      }
      throw new Error('offline')
    } catch {
      upsertOrbLocalSavedOutput({
        id: noteId || undefined,
        title: output.title,
        type: 'intelligence_note',
        summary: output.summary,
        content_markdown: documentText,
        tags: ['orb-dictate', 'local']
      })
      persistDraft(documentText, 'saved', 'Saved locally')
      setAutosaveStatus(sessionGate.shouldSkipAuthenticatedFetch ? 'reconnect' : 'saved_local')
      setLastSavedAt(new Date().toISOString())
      onStatusMessage('Saved locally — reconnect to sync.')
    }
  }

  async function handleExport(format: 'pdf' | 'docx' | 'markdown') {
    const body = withDictateExportDraftNotice(output.title, documentText, output.note_type, {
      readiness: readiness.title,
      tone: ORB_DICTATE_TONE_LABELS[toneLock]
    })
    try {
      if (format === 'markdown') {
        const result = await exportOrbDictateNote({
          title: output.title,
          professional_note: body,
          format: 'markdown',
          note_type: output.note_type
        })
        if ('content' in result) {
          await copyTextToClipboard(result.content)
          onStatusMessage('Markdown copied.')
        }
        return
      }
      const blob = await exportOrbDictateNote({
        title: output.title,
        professional_note: body,
        format,
        note_type: output.note_type
      })
      if ('content' in blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${output.title}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      persistDraft(documentText, 'exported', `Exported ${format}`)
      onStatusMessage(`Exported ${format.toUpperCase()}.`)
    } catch {
      onStatusMessage('Export unavailable — use copy instead.')
    }
  }

  function handleAnonymisePreview() {
    const preview = buildAnonymisePreview(documentText, participants, anonymisePreset)
    setAnonymisePreview(preview.previewText)
    onStatusMessage('Preview ready — apply when you are satisfied.')
  }

  function handleApplyAnonymise() {
    if (!anonymisePreview) return
    setDocumentText(anonymisePreview)
    persistDraft(anonymisePreview, 'manual_edit', 'Anonymised')
    setAnonymisePreview(null)
    onStatusMessage('Anonymisation applied.')
  }

  const autosaveLabel =
    autosaveStatus === 'saving'
      ? 'Saving…'
      : autosaveStatus === 'saved_orb'
        ? 'Saved to ORB'
        : autosaveStatus === 'saved_local'
          ? 'Saved locally'
          : autosaveStatus === 'reconnect'
            ? 'Reconnect to sync'
            : autosaveStatus === 'error'
              ? 'Save failed'
              : 'Autosaved'

  const documentPanel = (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <OrbDictateFindReplacePanel
        documentText={documentText}
        onApplyText={(text, label) => {
          setDocumentText(text)
          persistDraft(text, 'manual_edit', label)
          onStatusMessage(label)
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--orb-muted)]" data-orb-dictate-autosave-status>
            {autosaveLabel}
          </span>
          {lastSavedAt ? (
            <span className="text-[10px] text-slate-500" data-orb-dictate-last-saved>
              {new Date(lastSavedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
          <button
            type="button"
            data-orb-dictate-save-now
            className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300"
            onClick={() => void handleSave()}
          >
            Save now
          </button>
          <span className="text-[10px] text-[var(--orb-muted)]">
            {wordCount} words · {charCount} chars
          </span>
          <span className="rounded-md border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-200">Draft</span>
          <span
            className="rounded-md border border-emerald-500/25 px-1.5 py-0.5 text-[10px] text-emerald-200"
            data-orb-dictate-readiness-status
          >
            {readiness.title}
          </span>
        </div>
        <label className="flex items-center gap-1 text-[10px] text-slate-400">
          Tone lock
          <select
            data-orb-dictate-tone-lock
            value={toneLock}
            onChange={(e) => setToneLock(e.target.value as OrbDictateToneLock)}
            className="rounded-md border border-[var(--orb-line)]/50 bg-black/20 px-1 py-0.5 text-[10px] text-slate-200"
          >
            {ORB_DICTATE_TONE_OPTIONS.map((tone) => (
              <option key={tone} value={tone}>
                {ORB_DICTATE_TONE_LABELS[tone]}
              </option>
            ))}
          </select>
        </label>
        {versions.length > 1 ? (
          <div className="flex items-center gap-1">
            <History className="h-3.5 w-3.5 text-[var(--orb-muted)]" />
            <select
              data-orb-dictate-version-select
              className="max-w-[10rem] rounded-lg border border-[var(--orb-line)]/50 bg-black/20 px-2 py-0.5 text-[10px] text-slate-200"
              value={selectedVersionId ?? ''}
              onChange={(e) => handleRestoreVersion(e.target.value)}
            >
              <option value="">Version history</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-lg p-1 hover:bg-white/5"
              aria-label="Restore previous"
              onClick={undoLastVersion}
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        ) : null}
      </div>
      <textarea
        data-orb-dictate-studio-editor
        value={documentText}
        onChange={(e) => {
          setDocumentText(e.target.value)
          setAutosaveStatus('idle')
        }}
        className="min-h-[14rem] flex-1 resize-none rounded-xl border border-[var(--orb-line)]/50 bg-black/20 p-3 text-sm leading-relaxed text-slate-100 focus:border-sky-400/40 focus:outline-none"
        spellCheck
      />
      <div className="flex flex-wrap gap-1 border-t border-[var(--orb-line)]/30 pt-2">
        <button
          type="button"
          data-orb-dictate-copy
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={() => void handleCopy()}
        >
          <ClipboardCopy className="h-3.5 w-3.5" /> Copy
        </button>
        <button
          type="button"
          data-orb-dictate-save
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={() => void handleSave()}
        >
          <Save className="h-3.5 w-3.5" /> Save
        </button>
        <button
          type="button"
          data-orb-dictate-export-pdf
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={() => void handleExport('pdf')}
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </button>
        <button
          type="button"
          data-orb-dictate-export-docx
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={() => void handleExport('docx')}
        >
          <FileText className="h-3.5 w-3.5" /> DOCX
        </button>
        <button
          type="button"
          data-orb-dictate-export-markdown
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={() => void handleExport('markdown')}
        >
          Markdown
        </button>
        <button
          type="button"
          data-orb-dictate-send-chat
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={() => void onSendToChat(documentText)}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Chat
        </button>
        <select
          data-orb-dictate-anonymise-preset
          value={anonymisePreset}
          onChange={(e) => setAnonymisePreset(e.target.value as OrbDictateAnonymisePreset)}
          className="rounded-lg border border-[var(--orb-line)]/50 bg-black/20 px-1 py-1 text-[10px] text-slate-200"
        >
          <option value="young_person">Young person</option>
          <option value="staff_role">Staff role</option>
          <option value="participant_role">Participant role</option>
          <option value="initials">Initials</option>
        </select>
        <button
          type="button"
          data-orb-dictate-action-anonymise
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={handleAnonymisePreview}
        >
          <Shield className="h-3.5 w-3.5" /> Preview anonymise
        </button>
        {anonymisePreview ? (
          <button
            type="button"
            data-orb-dictate-apply-anonymise
            className="rounded-lg border border-emerald-400/30 px-2 py-1 text-xs text-emerald-100"
            onClick={handleApplyAnonymise}
          >
            Apply anonymise
          </button>
        ) : null}
        {onOpenOrbVoice ? (
          <button
            type="button"
            data-orb-dictate-continue-voice
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
            onClick={onOpenOrbVoice}
          >
            <Mic className="h-3.5 w-3.5" /> Voice
          </button>
        ) : null}
      </div>
    </div>
  )

  const assistantPanel = (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {!pendingEdit && !editing ? (
        <p className="text-xs leading-relaxed text-slate-400" data-orb-dictate-assistant-starter>
          Ask ORB to refine tone, add safeguarding prompts, or tighten structure. Try a quick action, or type
          “make this more therapeutic”. Changes are previewed before they replace your draft.
        </p>
      ) : null}
      <OrbDictateStudioAssistant
        editing={editing}
        pendingEdit={pendingEdit}
        originalText={documentText}
        onRunEdit={handleRunEdit}
        onApplyEdit={handleApplyEdit}
        onDiscardEdit={() => setPendingEdit(null)}
        onKeepSuggestion={() => onStatusMessage('Suggestion kept for reference — document unchanged.')}
        onSetInstruction={() => {}}
      />
    </div>
  )

  const transcriptPanel = (
    <p className="whitespace-pre-wrap text-sm text-slate-300" data-orb-dictate-studio-transcript>
      {output.transcript}
    </p>
  )

  const qualityPanel = (
    <OrbDictateStudioQuality
      checks={qualityChecks}
      onImprove={(mode, instruction) => void handleRunEdit(mode, instruction)}
      onAskOrb={(prompt) => void handleRunEdit('missing_information', prompt)}
    />
  )

  const exportPanel = (
    <div className="space-y-2 text-sm text-slate-300">
      <p>Export includes draft notice, title, note type and date.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={() => void handleExport('pdf')}
        >
          Export PDF
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={() => void handleExport('docx')}
        >
          Export DOCX
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          onClick={() => void handleCopy()}
        >
          Copy
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col orb-dictate-studio-scroll" data-orb-dictate-studio>
      <OrbDictateDraftSyncPrompt backendAvailable={backendAvailable} onStatusMessage={onStatusMessage} />
      <p className="mb-2 text-[10px] text-slate-500">{orbDictateReadinessDisclaimer()}</p>
      {readiness.improvements.length ? (
        <ul className="mb-2 list-disc pl-4 text-[10px] text-slate-500" data-orb-dictate-readiness-improvements>
          {readiness.improvements.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
          onClick={onBack}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to capture
        </button>
        <h3 className="text-sm font-semibold text-white">ORB Dictate Studio</h3>
      </div>

      {/* Mobile tabs */}
      <div className="mb-2 flex shrink-0 gap-1 overflow-x-auto md:hidden" data-orb-dictate-studio-mobile-tabs>
        {(
          [
            ['document', 'Document'],
            ['assistant', 'ORB Assistant'],
            ['transcript', 'Transcript'],
            ['quality', 'Quality'],
            ['export', 'Export']
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-orb-dictate-studio-tab={id}
            className={`shrink-0 rounded-lg px-2 py-1 text-[10px] ${
              mobileTab === id ? 'bg-sky-500/20 text-sky-100' : 'text-[var(--orb-muted)]'
            }`}
            onClick={() => setMobileTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Desktop split */}
      <div className="hidden min-h-0 flex-1 gap-4 overflow-hidden md:grid md:grid-cols-2" data-orb-dictate-studio-split>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-white/[0.02] p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Document</h4>
          {documentPanel}
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-white/[0.02] p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">ORB Assistant</h4>
          <div className="min-h-0 flex-1 overflow-y-auto">{assistantPanel}</div>
        </div>
      </div>

      {/* Mobile single panel */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--orb-line)]/50 bg-white/[0.02] p-3 md:hidden">
        {mobileTab === 'document' ? documentPanel : null}
        {mobileTab === 'assistant' ? assistantPanel : null}
        {mobileTab === 'transcript' ? transcriptPanel : null}
        {mobileTab === 'quality' ? qualityPanel : null}
        {mobileTab === 'export' ? exportPanel : null}
      </div>

      {/* Desktop quality row under document could be tab - quality accessible via mobile; add link on desktop */}
      <details className="mt-2 hidden shrink-0 md:block">
        <summary className="cursor-pointer text-xs text-sky-400/90">Quality checks</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">{qualityPanel}</div>
      </details>

    </div>
  )
}
