'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ClipboardCopy,
  Download,
  FileText,
  Mic,
  MicOff,
  Pause,
  Play,
  Save,
  Sparkles,
  Square,
  Trash2
} from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import type { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import {
  buildLocalDictateFallback,
  exportOrbDictateNote,
  generateOrbDictateNote,
  readLatestOrbVoiceTranscript,
  saveOrbDictateNote
} from '@/lib/orb/dictate/orb-dictate-client'
import {
  generateFlagsForVoiceCommand,
  noteTypeForVoiceCommand,
  parseOrbDictateVoiceCommand,
  type OrbDictateVoiceCommandAction
} from '@/lib/orb/dictate/orb-dictate-voice-commands'
import {
  ORB_DICTATE_GOVERNANCE_COPY,
  ORB_DICTATE_NOTE_TYPE_LABELS,
  REFLECTIVE_DEBRIEF_QUESTIONS,
  type OrbDictateGenerateResult,
  type OrbDictateNoteType,
  type OrbDictateStartMode
} from '@/lib/orb/dictate/orb-dictate-types'
import { createOrbSavedOutput } from '@/lib/orb/standalone-client'

type VoiceApi = ReturnType<typeof useStandaloneOrbVoice>

type OutputTab = 'professional' | 'summary' | 'actions' | 'transcript' | 'evidence'

const NOTE_TYPES = Object.keys(ORB_DICTATE_NOTE_TYPE_LABELS) as OrbDictateNoteType[]

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function OrbDictateStation({
  open,
  onClose,
  voice,
  onSendToChat,
  onOpenOrbVoice,
  onOpenTemplates,
  initialTranscript,
  initialNoteType
}: {
  open: boolean
  onClose: () => void
  voice: VoiceApi
  onSendToChat: (text: string) => void | Promise<void>
  onOpenOrbVoice?: () => void
  onOpenTemplates?: () => void
  initialTranscript?: string
  initialNoteType?: OrbDictateNoteType
}) {
  const [startMode, setStartMode] = useState<OrbDictateStartMode | null>(null)
  const [noteType, setNoteType] = useState<OrbDictateNoteType>(initialNoteType ?? 'daily_record')
  const [transcript, setTranscript] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [recordingActive, setRecordingActive] = useState(false)
  const [recordingPaused, setRecordingPaused] = useState(false)
  const [timerSec, setTimerSec] = useState(0)
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [output, setOutput] = useState<OrbDictateGenerateResult | null>(null)
  const [outputTab, setOutputTab] = useState<OutputTab>('professional')
  const [editedNote, setEditedNote] = useState('')
  const [generating, setGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [reflectiveMode, setReflectiveMode] = useState(false)
  const [reflectiveIndex, setReflectiveIndex] = useState(0)
  const [reflectiveAnswers, setReflectiveAnswers] = useState<string[]>([])
  const [reflectiveDraft, setReflectiveDraft] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const needsConsent = startMode === 'record_debrief'

  const liveTranscript = useMemo(() => {
    const live = (voice.transcript || voice.displayTranscript || '').trim()
    if (!live) return transcript
    return transcript ? `${transcript}\n${live}` : live
  }, [transcript, voice.transcript, voice.displayTranscript])

  const resetRecording = useCallback(() => {
    setRecordingActive(false)
    setRecordingPaused(false)
    setTimerSec(0)
    voice.cancelListening()
    voice.clearTranscript()
    if (timerRef.current) clearInterval(timerRef.current)
  }, [voice])

  useEffect(() => {
    if (!open) {
      resetRecording()
      setStartMode(null)
      setReflectiveMode(false)
      setReflectiveIndex(0)
      setReflectiveAnswers([])
      setOutput(null)
      setStatusMessage(null)
      return
    }
    if (initialTranscript) {
      setTranscript(initialTranscript)
      setStartMode('import_voice')
    }
  }, [open, initialTranscript, resetRecording])

  useEffect(() => {
    if (!recordingActive || recordingPaused) return
    timerRef.current = setInterval(() => setTimerSec((s) => s + 1), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [recordingActive, recordingPaused])

  useEffect(() => {
    if (!recordingActive) return
    const live = (voice.transcript || voice.displayTranscript || '').trim()
    if (live) {
      const cmd = parseOrbDictateVoiceCommand(live)
      if (cmd) {
        void handleVoiceCommand(cmd.action)
        voice.clearTranscript()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.transcript, voice.displayTranscript, recordingActive])

  async function handleVoiceCommand(action: OrbDictateVoiceCommandAction) {
    const converted = noteTypeForVoiceCommand(action)
    if (converted) setNoteType(converted)
    if (action === 'save') {
      await handleSave()
      return
    }
    if (action === 'copy') {
      await handleCopy()
      return
    }
    if (action === 'export_pdf') {
      await handleExport('pdf')
      return
    }
    if (action === 'send_chat') {
      handleSendToChat()
      return
    }
    if (action === 'what_missing' && output) {
      setOutputTab('evidence')
      setStatusMessage('Review quality checks and evidence tab for gaps.')
      return
    }
    const flags = generateFlagsForVoiceCommand(action)
    await runGenerate({ ...flags, include_ofsted_lens: flags.include_ofsted_lens ?? action === 'ofsted_ready' })
  }

  async function handleStartRecording() {
    if (needsConsent && !consentConfirmed) {
      setStatusMessage('Please confirm consent before recording a conversation or debrief.')
      return
    }
    if (!voice.recognitionAvailable) {
      setStatusMessage('Microphone transcription is not available in this browser. Paste your transcript instead.')
      return
    }
    setRecordingActive(true)
    setRecordingPaused(false)
    setStatusMessage(null)
    const ok = await voice.beginUserVoiceCapture()
    if (!ok) {
      setRecordingActive(false)
      setStatusMessage('Could not access the microphone. You can paste a transcript instead.')
    }
  }

  function handlePauseRecording() {
    setRecordingPaused(true)
    voice.cancelListening()
  }

  function handleResumeRecording() {
    setRecordingPaused(false)
    void voice.beginUserVoiceCapture()
  }

  function handleStopRecording() {
    const live = (voice.transcript || voice.displayTranscript || '').trim()
    if (live) setTranscript((prev) => (prev ? `${prev}\n${live}` : live))
    voice.clearTranscript()
    resetRecording()
  }

  function handleClearTranscript() {
    setTranscript('')
    setPasteText('')
    voice.clearTranscript()
  }

  function applyPaste() {
    const text = pasteText.trim()
    if (!text) return
    setTranscript(text)
    setStartMode('paste')
    setStatusMessage('Transcript added.')
  }

  function importFromOrbVoice() {
    const text = readLatestOrbVoiceTranscript()
    if (!text) {
      setStatusMessage('No saved ORB Voice transcript found. Save a conversation in ORB Voice first.')
      return
    }
    setTranscript(text)
    setStartMode('import_voice')
    setStatusMessage('Imported from ORB Voice.')
  }

  async function runGenerate(overrides?: Partial<Parameters<typeof generateOrbDictateNote>[0]>) {
    const input = liveTranscript.trim() || pasteText.trim()
    if (!input) {
      setStatusMessage('Add a transcript before generating.')
      return
    }
    setGenerating(true)
    setStatusMessage(null)
    try {
      const result = await generateOrbDictateNote({
        input_text: input,
        note_type: noteType,
        include_child_voice: true,
        include_safeguarding: true,
        include_manager_oversight: true,
        include_actions: true,
        include_ofsted_lens: outputTab === 'evidence',
        source: startMode === 'import_voice' ? 'orb_voice' : startMode === 'paste' ? 'paste' : 'dictation',
        conversation_consent_confirmed: needsConsent ? consentConfirmed : undefined,
        ...overrides
      })
      setOutput(result)
      setEditedNote(result.professional_note)
      setStatusMessage('Professional note ready for review.')
    } catch {
      const fallback = buildLocalDictateFallback(input, noteType)
      setOutput(fallback)
      setEditedNote(fallback.professional_note)
      setStatusMessage('Generated offline draft. Reconnect for full ORB intelligence.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    const text = editedNote || output?.professional_note
    if (!text) return
    const ok = await copyTextToClipboard(text)
    setStatusMessage(ok ? 'Copied to clipboard.' : 'Copy failed — select and copy manually.')
  }

  async function handleSave() {
    const text = editedNote || output?.professional_note
    if (!text || !output) return
    try {
      const saved = await saveOrbDictateNote({
        title: output.title,
        note_type: output.note_type,
        professional_note: text,
        summary: output.summary,
        transcript: output.transcript,
        actions: output.actions
      })
      setStatusMessage(saved.message || 'Saved to Saved Outputs.')
    } catch {
      try {
        await createOrbSavedOutput({
          title: output.title,
          type: 'recording_rewrite',
          summary: output.summary,
          content_markdown: text,
          tags: ['orb-dictate', output.note_type],
          created_from: 'manual'
        })
        setStatusMessage('Saved to Saved Outputs.')
      } catch {
        setStatusMessage('Save unavailable — use copy to keep your wording.')
      }
    }
  }

  async function handleExport(format: 'pdf' | 'docx') {
    const text = editedNote || output?.professional_note
    if (!text || !output) return
    try {
      const blob = await exportOrbDictateNote({
        title: output.title,
        professional_note: text,
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
      setStatusMessage(`Exported ${format.toUpperCase()}.`)
    } catch {
      setStatusMessage('Export unavailable — use copy instead.')
    }
  }

  function handleSendToChat() {
    const text = editedNote || output?.professional_note
    if (!text) return
    void Promise.resolve(onSendToChat(text))
    setStatusMessage('Sent to chat for further refinement.')
    onClose()
  }

  function advanceReflective() {
    const answer = reflectiveDraft.trim()
    if (!answer) return
    const nextAnswers = [...reflectiveAnswers, answer]
    setReflectiveAnswers(nextAnswers)
    setReflectiveDraft('')
    if (reflectiveIndex + 1 >= REFLECTIVE_DEBRIEF_QUESTIONS.length) {
      const combined = REFLECTIVE_DEBRIEF_QUESTIONS.map((q, i) => `${q}\n${nextAnswers[i] || ''}`).join('\n\n')
      setTranscript(combined)
      setReflectiveMode(false)
      setNoteType('staff_debrief')
      setStatusMessage('Reflective debrief complete. Generate your professional note when ready.')
      return
    }
    setReflectiveIndex((i) => i + 1)
  }

  const micStatus = !voice.recognitionAvailable
    ? 'Transcription unavailable — paste instead'
    : recordingActive
      ? recordingPaused
        ? 'Paused'
        : 'Recording…'
      : 'Ready'

  const orbClass = recordingActive && !recordingPaused ? 'glass-orb-mark--listening glass-orb-mark--voice' : 'glass-orb-mark--voice glass-orb-mark--idle'

  return (
    <OrbAppModal
      open={open}
      title="ORB Dictate"
      subtitle="Voice-to-recording companion for residential childcare"
      onClose={onClose}
      panelId="orb-dictate"
      size="wide"
      ariaLabel="ORB Dictate"
    >
      <div className="orb-dictate flex min-h-0 flex-1 flex-col" data-orb-dictate-station>
        <p className="shrink-0 px-1 pb-3 text-sm text-[var(--orb-muted)]">
          Speak naturally. ORB will help turn rough notes, debriefs or conversations into structured professional
          wording.
        </p>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Start</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ['record_note', 'Record note', Mic],
                    ['record_debrief', 'Record debrief', Mic],
                    ['paste', 'Paste transcript', FileText],
                    ['import_voice', 'Import from ORB Voice', Sparkles],
                    ['template', 'Use template', FileText]
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    data-orb-dictate-start={id}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                      startMode === id
                        ? 'border-sky-400/50 bg-sky-500/10 text-white'
                        : 'border-[var(--orb-line)]/60 bg-white/[0.03] text-[var(--orb-foreground)] hover:border-sky-400/30'
                    }`}
                    onClick={() => {
                      setStartMode(id)
                      if (id === 'import_voice') importFromOrbVoice()
                      if (id === 'template') onOpenTemplates?.()
                      if (id === 'paste') setPasteText(transcript)
                      if (id === 'record_debrief') setReflectiveMode(false)
                    }}
                  >
                    <Icon className="mb-1 h-4 w-4 text-sky-400" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 text-xs text-sky-400/90 hover:text-sky-300"
                data-orb-dictate-reflective
                onClick={() => {
                  setReflectiveMode(true)
                  setReflectiveIndex(0)
                  setReflectiveAnswers([])
                  setStartMode('record_debrief')
                }}
              >
                Reflective debrief (one question at a time)
              </button>
            </section>

            {reflectiveMode ? (
              <section className="rounded-xl border border-[var(--orb-line)]/60 bg-white/[0.03] p-3" data-orb-dictate-reflective-step>
                <p className="text-xs text-[var(--orb-muted)]">
                  Question {reflectiveIndex + 1} of {REFLECTIVE_DEBRIEF_QUESTIONS.length}
                </p>
                <p className="mt-1 text-sm font-medium text-white">{REFLECTIVE_DEBRIEF_QUESTIONS[reflectiveIndex]}</p>
                <textarea
                  value={reflectiveDraft}
                  onChange={(e) => setReflectiveDraft(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-[var(--orb-line)]/60 bg-black/20 px-3 py-2 text-sm text-white"
                  placeholder="Your reflection…"
                />
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-200"
                  onClick={advanceReflective}
                >
                  Next
                </button>
              </section>
            ) : null}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Note type</h3>
              <select
                data-orb-dictate-note-type
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as OrbDictateNoteType)}
                className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/60 bg-black/20 px-3 py-2 text-sm text-white"
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ORB_DICTATE_NOTE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </section>

            {needsConsent ? (
              <section
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100/90"
                data-orb-dictate-consent
              >
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={consentConfirmed}
                    onChange={(e) => setConsentConfirmed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I confirm I have authority/consent to record or dictate this note. I understand I must review the
                    output before using it as a formal record.
                  </span>
                </label>
              </section>
            ) : null}

            {startMode === 'paste' ? (
              <section>
                <textarea
                  data-orb-dictate-paste
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={4}
                  placeholder="Paste transcript…"
                  className="w-full rounded-xl border border-[var(--orb-line)]/60 bg-black/20 px-3 py-2 text-sm text-white"
                />
                <button type="button" className="mt-2 text-xs text-sky-400" onClick={applyPaste}>
                  Use pasted text
                </button>
              </section>
            ) : null}

            <section className="rounded-xl border border-[var(--orb-line)]/60 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GlassOrbMark className={orbClass} size="sm" />
                  <div>
                    <p className="text-xs font-medium text-white">{micStatus}</p>
                    <p className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-timer>
                      {formatTimer(timerSec)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!recordingActive ? (
                    <button
                      type="button"
                      data-orb-dictate-record-start
                      className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-3 py-1.5 text-xs text-sky-100"
                      onClick={() => void handleStartRecording()}
                    >
                      <Mic className="h-3.5 w-3.5" /> Start
                    </button>
                  ) : (
                    <>
                      {recordingPaused ? (
                        <button type="button" className="rounded-full p-2 hover:bg-white/10" onClick={handleResumeRecording} aria-label="Resume">
                          <Play className="h-4 w-4" />
                        </button>
                      ) : (
                        <button type="button" className="rounded-full p-2 hover:bg-white/10" onClick={handlePauseRecording} aria-label="Pause">
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                      <button type="button" className="rounded-full p-2 hover:bg-white/10" onClick={handleStopRecording} aria-label="Stop">
                        <Square className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button type="button" className="rounded-full p-2 hover:bg-white/10" onClick={handleClearTranscript} aria-label="Clear">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-[var(--orb-line)]/40 bg-black/20 p-2 text-sm text-slate-200"
                data-orb-dictate-live-transcript
              >
                {liveTranscript || <span className="text-[var(--orb-muted)]">Live transcript appears here…</span>}
              </div>
            </section>

            <button
              type="button"
              data-orb-dictate-generate
              disabled={generating}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              onClick={() => void runGenerate()}
            >
              {generating ? 'Generating…' : 'Generate professional note'}
            </button>

            {onOpenOrbVoice ? (
              <button type="button" className="text-xs text-sky-400/90 hover:text-sky-300" onClick={onOpenOrbVoice}>
                Continue with ORB Voice
              </button>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-white/[0.02]">
            <div className="flex shrink-0 gap-1 border-b border-[var(--orb-line)]/40 p-2">
              {(
                [
                  ['professional', 'Professional note'],
                  ['summary', 'Summary'],
                  ['actions', 'Actions'],
                  ['transcript', 'Transcript'],
                  ['evidence', 'Evidence / Ofsted']
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  data-orb-dictate-tab={id}
                  className={`rounded-lg px-2 py-1 text-[10px] sm:text-xs ${
                    outputTab === id ? 'bg-sky-500/20 text-sky-100' : 'text-[var(--orb-muted)] hover:text-white'
                  }`}
                  onClick={() => setOutputTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!output ? (
                <p className="text-sm text-[var(--orb-muted)]">Generated output appears here for review and edit.</p>
              ) : outputTab === 'professional' ? (
                <textarea
                  data-orb-dictate-output
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  rows={16}
                  className="h-full min-h-[12rem] w-full resize-none bg-transparent text-sm text-slate-100 focus:outline-none"
                />
              ) : outputTab === 'summary' ? (
                <p className="text-sm text-slate-200">{output.summary}</p>
              ) : outputTab === 'actions' ? (
                <ul className="list-disc space-y-1 pl-4 text-sm text-slate-200">
                  {output.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ) : outputTab === 'transcript' ? (
                <p className="whitespace-pre-wrap text-sm text-slate-300">{output.transcript}</p>
              ) : (
                <div className="space-y-2 text-sm text-slate-200">
                  {output.ofsted_lens ? <p>{output.ofsted_lens}</p> : null}
                  <ul className="space-y-1 text-xs">
                    {Object.entries(output.quality_checks).map(([k, v]) => (
                      <li key={k}>
                        {k.replace(/_/g, ' ')}: <span className="text-sky-300">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {output ? (
              <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--orb-line)]/40 p-2">
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
                  data-orb-dictate-send-chat
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
                  onClick={handleSendToChat}
                >
                  Send to chat
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
                  onClick={() => void runGenerate({ include_child_voice: true })}
                >
                  Add child voice
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
                  onClick={() => void runGenerate({ include_manager_oversight: true })}
                >
                  Add manager oversight
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
                  onClick={() => void runGenerate({ include_safeguarding: true })}
                >
                  Add safeguarding
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="mt-3 shrink-0 space-y-1 border-t border-[var(--orb-line)]/30 pt-3 text-[10px] text-[var(--orb-muted)]">
          <p>{ORB_DICTATE_GOVERNANCE_COPY.draft}</p>
          <p>{ORB_DICTATE_GOVERNANCE_COPY.recording}</p>
          <p>{ORB_DICTATE_GOVERNANCE_COPY.boundary}</p>
          <p>{ORB_DICTATE_GOVERNANCE_COPY.retention}</p>
          {statusMessage ? (
            <p className="text-xs text-sky-300/90" role="status">
              {statusMessage}
            </p>
          ) : null}
        </footer>
      </div>
    </OrbAppModal>
  )
}
