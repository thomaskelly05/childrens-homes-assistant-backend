'use client'

import {
  ORB_DICTATE_RECORDING_ATTACHED_SUPPORTING,
  ORB_DICTATE_RECORDING_ATTACHED_TITLE,
  ORB_DICTATE_RECORDING_LOCAL_STORAGE_NOTE
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import {
  formatOrbDictateRecordingCreatedAt,
  formatOrbDictateRecordingDuration,
  orbDictateRecordingStatusLabel,
  type OrbDictateRecordingMedia
} from '@/lib/orb/dictate/orb-dictate-recording-media'

export type OrbDictateRecordingAttachmentProps = {
  media: OrbDictateRecordingMedia
}

export function OrbDictateRecordingAttachment({ media }: OrbDictateRecordingAttachmentProps) {
  const statusLabel = orbDictateRecordingStatusLabel(media.status)
  const storageLabel = media.storageMode === 'local' ? 'Local only' : 'Stored'

  return (
    <section
      className="orb-dictate-recording-attachment rounded-xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/50 p-3"
      data-orb-dictate-recording-attachment
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-[var(--orb-foreground)]" data-orb-dictate-recording-attached-title>
            {ORB_DICTATE_RECORDING_ATTACHED_TITLE}
          </h4>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-recording-attached-supporting>
            {ORB_DICTATE_RECORDING_ATTACHED_SUPPORTING}
          </p>
        </div>
        <span
          className="rounded-full border border-[var(--orb-line)]/25 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
          data-orb-dictate-recording-status={media.status}
        >
          {statusLabel}
        </span>
      </header>

      <dl className="mt-2 grid gap-1 text-[11px] text-[var(--orb-muted)]" data-orb-dictate-recording-metadata>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <div>
            <dt className="sr-only">Filename</dt>
            <dd data-orb-dictate-recording-filename>{media.filename}</dd>
          </div>
          <div>
            <dt className="sr-only">Duration</dt>
            <dd data-orb-dictate-recording-duration>{formatOrbDictateRecordingDuration(media.durationMs)}</dd>
          </div>
          <div>
            <dt className="sr-only">Created</dt>
            <dd data-orb-dictate-recording-created-at>{formatOrbDictateRecordingCreatedAt(media.createdAt)}</dd>
          </div>
          <div>
            <dt className="sr-only">Storage</dt>
            <dd data-orb-dictate-recording-storage-mode={media.storageMode}>{storageLabel}</dd>
          </div>
        </div>
      </dl>

      {media.localObjectUrl ? (
        <audio
          className="orb-dictate-recording-player mt-2 h-8 w-full"
          controls
          preload="metadata"
          src={media.localObjectUrl}
          data-orb-dictate-recording-playback
          aria-label="Play attached recording"
        />
      ) : null}

      {media.transcriptionNotice ? (
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-recording-transcription-notice>
          {media.transcriptionNotice}
        </p>
      ) : null}

      {media.storageMode === 'local' ? (
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-recording-local-note>
          {ORB_DICTATE_RECORDING_LOCAL_STORAGE_NOTE}
        </p>
      ) : null}
    </section>
  )
}
