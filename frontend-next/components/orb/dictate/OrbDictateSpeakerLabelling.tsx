'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  applySpeakersToTranscript,
  buildSpeakersFromSegments,
  confirmSpeakerLabel,
  SPEAKER_LABELLING_COPY,
  SUGGESTED_SPEAKER_ROLES,
  type OrbDictateSpeaker
} from '@/lib/orb/dictate/orb-dictate-speaker-model'
import type {
  OrbDictateParticipant,
  OrbDictateTranscriptSegment
} from '@/lib/orb/dictate/orb-dictate-speaker'

export function OrbDictateSpeakerLabelling({
  segments,
  participants,
  onSegmentsChange,
  onParticipantsChange,
  compact = false
}: {
  segments: OrbDictateTranscriptSegment[]
  participants: OrbDictateParticipant[]
  onSegmentsChange: (next: OrbDictateTranscriptSegment[]) => void
  onParticipantsChange: (next: OrbDictateParticipant[]) => void
  compact?: boolean
}) {
  const initialSpeakers = useMemo(
    () => buildSpeakersFromSegments(segments, participants),
    [segments, participants]
  )
  const [speakers, setSpeakers] = useState<OrbDictateSpeaker[]>(initialSpeakers)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftRole, setDraftRole] = useState('')

  useEffect(() => {
    setSpeakers(initialSpeakers)
  }, [initialSpeakers])

  if (!segments.length) return null

  function commitSpeakers(next: OrbDictateSpeaker[]) {
    setSpeakers(next)
    const applied = applySpeakersToTranscript(next, segments, participants)
    onSegmentsChange(applied.segments)
    onParticipantsChange(applied.participants)
  }

  function openEditor(speaker: OrbDictateSpeaker) {
    setEditingId(speaker.speakerId)
    setDraftName(speaker.confirmedName ?? '')
    setDraftRole(speaker.confirmedRole ?? '')
  }

  function saveEditor(speaker: OrbDictateSpeaker, confirm: boolean) {
    const updated = confirmSpeakerLabel(speaker, {
      name: draftName,
      role: draftRole,
      confirm
    })
    commitSpeakers(speakers.map((s) => (s.speakerId === speaker.speakerId ? updated : s)))
    setEditingId(null)
  }

  return (
    <section
      className={
        compact
          ? 'rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] p-2.5'
          : 'rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] p-3'
      }
      data-orb-dictate-speaker-labelling
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
        Speakers
      </h3>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-speaker-boundary>
        {SPEAKER_LABELLING_COPY}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5" data-orb-dictate-speaker-chips>
        {speakers.map((speaker) => {
          const label = speaker.isConfirmed
            ? speaker.confirmedName || speaker.confirmedRole || speaker.displayLabel
            : speaker.displayLabel
          const isEditing = editingId === speaker.speakerId
          return (
            <div key={speaker.speakerId} className="relative">
              <button
                type="button"
                data-orb-dictate-speaker-chip
                data-orb-dictate-speaker-confirmed={speaker.isConfirmed ? 'true' : 'false'}
                onClick={() => openEditor(speaker)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  speaker.isConfirmed
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                    : 'border-[var(--orb-line)]/60 bg-[var(--orb-surface)] text-[var(--orb-foreground)]'
                }`}
              >
                {label}
                {speaker.isConfirmed ? '' : ' · tap to label'}
              </button>

              {isEditing ? (
                <div
                  className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-[var(--orb-line)]/70 bg-[var(--orb-surface)] p-2.5 shadow-lg"
                  data-orb-dictate-speaker-editor
                >
                  <label className="block text-[10px] text-[var(--orb-muted)]">
                    Name
                    <input
                      data-orb-dictate-speaker-name
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="Optional"
                      className="mt-0.5 w-full rounded-lg border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-2 py-1 text-xs text-[var(--orb-foreground)]"
                    />
                  </label>
                  <label className="mt-2 block text-[10px] text-[var(--orb-muted)]">
                    Role
                    <select
                      data-orb-dictate-speaker-role
                      value={draftRole}
                      onChange={(e) => setDraftRole(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-2 py-1 text-xs text-[var(--orb-foreground)]"
                    >
                      <option value="">Select or type below</option>
                      {SUGGESTED_SPEAKER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <input
                      value={draftRole}
                      onChange={(e) => setDraftRole(e.target.value)}
                      placeholder="Or type a role"
                      className="mt-1 w-full rounded-lg border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-2 py-1 text-xs text-[var(--orb-foreground)]"
                    />
                  </label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      data-orb-dictate-speaker-confirm
                      onClick={() => saveEditor(speaker, true)}
                      className="rounded-lg bg-sky-600/80 px-2 py-1 text-[10px] font-medium text-white"
                    >
                      Confirm label
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEditor(speaker, false)}
                      className="rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-[10px] text-[var(--orb-muted)]"
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg px-2 py-1 text-[10px] text-[var(--orb-muted)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-[10px] text-[var(--orb-muted)]">
        You can continue without naming speakers. Unconfirmed labels stay as Speaker 1, Speaker 2, etc.
      </p>
    </section>
  )
}
