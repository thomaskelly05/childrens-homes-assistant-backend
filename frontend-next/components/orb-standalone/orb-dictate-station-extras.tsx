'use client'

import { Upload } from 'lucide-react'

import type {
  OrbDictateMode,
  OrbDictateParticipant,
  OrbDictateTranscriptSegment
} from '@/lib/orb/dictate/orb-dictate-speaker'
import {
  MODE_REQUIRES_CONSENT,
  ORB_DICTATE_MODE_LABELS,
  SPEAKER_INTRO_PROMPT,
  participantLabel,
  suggestParticipantsFromText
} from '@/lib/orb/dictate/orb-dictate-speaker'

const MODES = Object.keys(ORB_DICTATE_MODE_LABELS) as OrbDictateMode[]

export function OrbDictateModeSelect({
  mode,
  onChange
}: {
  mode: OrbDictateMode
  onChange: (mode: OrbDictateMode) => void
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Dictate mode</h3>
      <select
        data-orb-dictate-mode
        value={mode}
        onChange={(e) => onChange(e.target.value as OrbDictateMode)}
        className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/60 bg-black/20 px-3 py-2 text-sm text-white"
      >
        {MODES.map((m) => (
          <option key={m} value={m}>
            {ORB_DICTATE_MODE_LABELS[m]}
          </option>
        ))}
      </select>
    </section>
  )
}

export function OrbDictateParticipantsPanel({
  participants,
  onChange,
  transcript,
  onImportFromTranscript
}: {
  participants: OrbDictateParticipant[]
  onChange: (next: OrbDictateParticipant[]) => void
  transcript: string
  onImportFromTranscript: () => void
}) {
  function addParticipant() {
    onChange([
      ...participants,
      { id: `p_${Date.now()}`, name: '', introducedBy: 'manual' }
    ])
  }

  return (
    <section className="rounded-xl border border-[var(--orb-line)]/60 bg-white/[0.03] p-3" data-orb-dictate-participants>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
        Meeting participants / Speakers
      </h3>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--orb-muted)]">{SPEAKER_INTRO_PROMPT}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          data-orb-dictate-add-participant
          className="rounded-lg border border-sky-400/30 px-2 py-1 text-xs text-sky-200"
          onClick={addParticipant}
        >
          Add participant
        </button>
        <button
          type="button"
          data-orb-dictate-import-participants
          className="rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-slate-200"
          onClick={onImportFromTranscript}
        >
          Import from transcript
        </button>
      </div>
      <ul className="mt-2 space-y-2">
        {participants.map((p, idx) => (
          <li key={p.id} className="grid gap-1 sm:grid-cols-2">
            <input
              data-orb-dictate-participant-name
              value={p.name}
              placeholder="Name"
              onChange={(e) => {
                const next = [...participants]
                next[idx] = { ...p, name: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-[var(--orb-line)]/50 bg-black/20 px-2 py-1 text-xs text-white"
            />
            <input
              data-orb-dictate-participant-role
              value={p.role ?? ''}
              placeholder="Role"
              onChange={(e) => {
                const next = [...participants]
                next[idx] = { ...p, role: e.target.value || undefined }
                onChange(next)
              }}
              className="rounded-lg border border-[var(--orb-line)]/50 bg-black/20 px-2 py-1 text-xs text-white"
            />
          </li>
        ))}
      </ul>
      {!participants.length && transcript ? (
        <p className="mt-2 text-[10px] text-amber-200/80">
          Suggested introductions detected — use Import from transcript to review.
          ({suggestParticipantsFromText(transcript).length} possible)
        </p>
      ) : null}
    </section>
  )
}

export function OrbDictateTranscriptSegmentsEditor({
  segments,
  participants,
  onChange
}: {
  segments: OrbDictateTranscriptSegment[]
  participants: OrbDictateParticipant[]
  onChange: (next: OrbDictateTranscriptSegment[]) => void
}) {
  if (!segments.length) return null

  function updateSegment(index: number, patch: Partial<OrbDictateTranscriptSegment>) {
    const next = [...segments]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  function assignParticipant(index: number, participantId: string) {
    const p = participants.find((x) => x.id === participantId)
    if (!p) return
    updateSegment(index, {
      speaker_id: p.id,
      speaker_label: participantLabel(p)
    })
  }

  function renameSpeaker1() {
    const idx = segments.findIndex((s) => /^Speaker 1$/i.test(s.speaker_label))
    if (idx < 0) return
    const name = window.prompt('Rename Speaker 1 to:', segments[idx].speaker_label)
    if (name?.trim()) updateSegment(idx, { speaker_label: name.trim(), speaker_id: undefined })
  }

  return (
    <section className="rounded-xl border border-[var(--orb-line)]/60 bg-white/[0.02] p-3" data-orb-dictate-segments>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Transcript segments</h3>
        <button
          type="button"
          data-orb-dictate-rename-speaker-1
          className="text-[10px] text-sky-400"
          onClick={renameSpeaker1}
        >
          Rename Speaker 1
        </button>
      </div>
      <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
        {segments.map((seg, idx) => (
          <li key={seg.id} className="rounded-lg border border-[var(--orb-line)]/40 p-2" data-orb-dictate-segment>
            <div className="flex flex-wrap gap-2">
              <select
                data-orb-dictate-segment-speaker
                value={seg.speaker_id ?? ''}
                onChange={(e) => {
                  if (e.target.value) assignParticipant(idx, e.target.value)
                  else updateSegment(idx, { speaker_id: undefined })
                }}
                className="max-w-[10rem] rounded border border-[var(--orb-line)]/50 bg-black/30 px-1 py-0.5 text-[10px] text-white"
              >
                <option value="">Custom label</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {participantLabel(p)}
                  </option>
                ))}
              </select>
              <input
                value={seg.speaker_label}
                onChange={(e) => updateSegment(idx, { speaker_label: e.target.value })}
                className="min-w-[6rem] flex-1 rounded border border-[var(--orb-line)]/50 bg-black/30 px-1 py-0.5 text-[10px] text-white"
              />
            </div>
            <textarea
              value={seg.text}
              rows={2}
              onChange={(e) => updateSegment(idx, { text: e.target.value })}
              className="mt-1 w-full resize-none rounded border border-[var(--orb-line)]/40 bg-black/20 px-2 py-1 text-xs text-slate-200"
            />
            <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
              <label className="flex items-center gap-1 text-[var(--orb-muted)]">
                <input
                  type="checkbox"
                  checked={!!seg.is_direct_quote}
                  onChange={(e) => updateSegment(idx, { is_direct_quote: e.target.checked })}
                />
                Direct quote
              </label>
              <label className="flex items-center gap-1 text-[var(--orb-muted)]">
                <input
                  type="checkbox"
                  checked={!!seg.needs_review}
                  onChange={(e) => updateSegment(idx, { needs_review: e.target.checked })}
                />
                Needs review
              </label>
              {idx > 0 ? (
                <button
                  type="button"
                  className="text-sky-400"
                  onClick={() => {
                    const prev = segments[idx - 1]
                    const merged = `${prev.text}\n${seg.text}`.trim()
                    const next = segments.filter((_, i) => i !== idx)
                    next[idx - 1] = { ...prev, text: merged }
                    onChange(next)
                  }}
                >
                  Merge with previous
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function OrbDictateAudioUpload({
  onFile,
  uploading,
  fileLabel,
  error
}: {
  onFile: (file: File) => void
  uploading: boolean
  fileLabel: string | null
  error: string | null
}) {
  return (
    <section className="rounded-xl border border-[var(--orb-line)]/60 bg-white/[0.02] p-3" data-orb-dictate-upload>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-sky-200">
        <Upload className="h-4 w-4" aria-hidden />
        <span>{uploading ? 'Transcribing audio…' : 'Upload audio file'}</span>
        <input
          type="file"
          accept="audio/webm,audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/mp4,.webm,.mp3,.wav,.m4a,.mp4"
          className="sr-only"
          data-orb-dictate-upload-input
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ''
          }}
        />
      </label>
      {fileLabel ? <p className="mt-1 text-[10px] text-[var(--orb-muted)]">{fileLabel}</p> : null}
      {error ? (
        <p className="mt-1 text-[10px] text-amber-200/90" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}

export function OrbDictateGovernanceConsent({
  mode,
  authorityConsent,
  investigationConfirmed,
  draftReviewConfirmed,
  participantsAwareConfirmed,
  noAutoSubmitConfirmed,
  onAuthorityConsentChange,
  onInvestigationChange,
  onDraftReviewChange,
  onParticipantsAwareChange,
  onNoAutoSubmitChange
}: {
  mode: OrbDictateMode
  authorityConsent: boolean
  investigationConfirmed: boolean
  draftReviewConfirmed: boolean
  participantsAwareConfirmed: boolean
  noAutoSubmitConfirmed: boolean
  onAuthorityConsentChange: (v: boolean) => void
  onInvestigationChange: (v: boolean) => void
  onDraftReviewChange: (v: boolean) => void
  onParticipantsAwareChange: (v: boolean) => void
  onNoAutoSubmitChange: (v: boolean) => void
}) {
  if (!MODE_REQUIRES_CONSENT.includes(mode)) return null

  return (
    <section
      className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100/90"
      data-orb-dictate-consent
    >
      <p className="font-medium">Consent and governance</p>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={authorityConsent}
          onChange={(e) => onAuthorityConsentChange(e.target.checked)}
          className="mt-0.5"
        />
        <span>I have authority/consent to record or dictate this conversation.</span>
      </label>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={participantsAwareConfirmed}
          onChange={(e) => onParticipantsAwareChange(e.target.checked)}
          className="mt-0.5"
        />
        <span>Participants are aware notes may be generated from the transcript.</span>
      </label>
      <label className="flex cursor-pointer items-start gap-2">
        <input type="checkbox" checked={draftReviewConfirmed} onChange={(e) => onDraftReviewChange(e.target.checked)} className="mt-0.5" />
        <span>I understand the output is a draft and must be reviewed before use.</span>
      </label>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={noAutoSubmitConfirmed}
          onChange={(e) => onNoAutoSubmitChange(e.target.checked)}
          className="mt-0.5"
        />
        <span>I understand ORB Dictate does not submit this into live care records automatically.</span>
      </label>
      {mode === 'investigation_meeting' ? (
        <label
          className="flex cursor-pointer items-start gap-2 border-t border-amber-500/20 pt-2"
          data-orb-dictate-investigation-boundary
        >
          <input
            type="checkbox"
            checked={investigationConfirmed}
            onChange={(e) => onInvestigationChange(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I understand ORB Dictate must not make findings of fact or conclusions unless these are explicitly agreed
            and recorded.
          </span>
        </label>
      ) : null}
    </section>
  )
}

export function modeRequiresFullConsent(mode: OrbDictateMode): boolean {
  return MODE_REQUIRES_CONSENT.includes(mode)
}

export function consentReadyForGenerate(
  mode: OrbDictateMode,
  flags: {
    authorityConsent: boolean
    draftReviewConfirmed: boolean
    participantsAwareConfirmed: boolean
    noAutoSubmitConfirmed: boolean
    investigationConfirmed: boolean
  }
): boolean {
  if (!MODE_REQUIRES_CONSENT.includes(mode)) return true
  if (
    !flags.authorityConsent ||
    !flags.draftReviewConfirmed ||
    !flags.participantsAwareConfirmed ||
    !flags.noAutoSubmitConfirmed
  ) {
    return false
  }
  if (mode === 'investigation_meeting' && !flags.investigationConfirmed) return false
  return true
}
