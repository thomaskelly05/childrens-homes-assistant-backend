'use client'

import { Mic, Upload } from 'lucide-react'

import { OrbDictateRecentCaptures } from '@/components/orb/dictate/OrbDictateRecentCaptures'
import { OrbDictateWriteTemplateSelector } from '@/components/orb/dictate/OrbDictateWriteTemplateSelector'
import { OrbIcon } from '@/components/orb-residential/ui/orb-icon'
import {
  ORB_DICTATE_CONSENT_REMINDER,
  ORB_DICTATE_CREATE_ROUGH_CAPTURE,
  ORB_DICTATE_PASTE_LABEL,
  ORB_DICTATE_PASTE_PLACEHOLDER,
  ORB_DICTATE_RECORDING_AS_PREFIX,
  ORB_DICTATE_SPEAK_LABEL,
  ORB_DICTATE_UPLOAD_BOUNDARY,
  ORB_DICTATE_UPLOAD_LABEL,
  ORB_DICTATE_UPLOAD_PLACEHOLDER,
  ORB_DICTATE_WHAT_ARE_YOU_RECORDING
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import { workingDocumentTypeLabel } from '@/lib/orb/dictate/orb-dictate-working-document'
import { OrbDictateAudioUpload } from '@/components/orb-standalone/orb-dictate-station-extras'

type CaptureMethod = 'speak' | 'paste' | 'upload'

export type OrbDictateCaptureStationProps = {
  selectedTemplateId: string
  onSelectTemplate: (templateId: string) => void
  captureMethod: CaptureMethod
  onCaptureMethodChange: (method: CaptureMethod) => void
  pasteDraft: string
  onPasteDraftChange: (value: string) => void
  onCreateRoughCapture: () => void
  onStartRecording: () => void
  onAudioUpload: (file: File) => void
  speechStartDisabled?: boolean
  micStatus?: string
  uploadingAudio?: boolean
  uploadFileLabel?: string | null
  uploadError?: string | null
  uploadReady?: boolean
}

export function OrbDictateCaptureStation(props: OrbDictateCaptureStationProps) {
  const templateLabel = workingDocumentTypeLabel(props.selectedTemplateId)
  const uploadPlaceholderOnly = props.uploadReady === false

  return (
    <>
      <section
        className="orb-dictate-capture-card orb-dictate-capture-station orb-dictate-template-first-station rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/80 p-5 shadow-sm"
        data-orb-dictate-capture-panel
        data-orb-dictate-capture-station
        data-orb-dictate-template-first-station
      >
        <div className="text-center">
          <h3 className="text-base font-semibold text-[var(--orb-foreground)]" data-orb-dictate-what-are-you-recording>
            {ORB_DICTATE_WHAT_ARE_YOU_RECORDING}
          </h3>
          <p className="mt-2 text-sm font-medium text-[var(--orb-primary)]" data-orb-dictate-recording-as>
            {ORB_DICTATE_RECORDING_AS_PREFIX} {templateLabel}
          </p>
        </div>

        <div className="mt-4">
          <OrbDictateWriteTemplateSelector
            selectedTemplateId={props.selectedTemplateId}
            onSelectTemplate={props.onSelectTemplate}
          />
        </div>

        <div
          className="orb-dictate-capture-methods mt-5 flex flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="Capture methods"
          data-orb-dictate-capture-methods
        >
          {(
            [
              { id: 'speak' as const, label: ORB_DICTATE_SPEAK_LABEL, icon: Mic },
              { id: 'paste' as const, label: ORB_DICTATE_PASTE_LABEL, icon: null },
              { id: 'upload' as const, label: ORB_DICTATE_UPLOAD_LABEL, icon: Upload }
            ] as const
          ).map((method) => (
            <button
              key={method.id}
              type="button"
              role="tab"
              aria-selected={props.captureMethod === method.id}
              data-orb-dictate-capture-method={method.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                props.captureMethod === method.id
                  ? 'border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                  : 'border-[var(--orb-line)]/30 bg-white/80 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
              }`}
              onClick={() => props.onCaptureMethodChange(method.id)}
            >
              {method.icon ? <method.icon className="h-3.5 w-3.5" aria-hidden /> : null}
              {method.label}
            </button>
          ))}
        </div>

        {props.captureMethod === 'speak' ? (
          <div className="mt-5 text-center" data-orb-dictate-speak-panel>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                data-orb-dictate-top-record
                data-orb-dictate-hero-record
                disabled={props.speechStartDisabled}
                className="orb-dictate-hero-record inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105 disabled:opacity-50"
                onClick={props.onStartRecording}
                aria-label="Start recording"
              >
                <OrbIcon name="record" size="lg" className="text-white" />
              </button>
              <p className="text-xs text-[var(--orb-muted)]" data-orb-dictate-recording-status>
                {props.micStatus || ORB_DICTATE_SPEAK_LABEL}
              </p>
            </div>
          </div>
        ) : null}

        {props.captureMethod === 'paste' ? (
          <div className="mt-4" data-orb-dictate-paste-panel>
            <textarea
              value={props.pasteDraft}
              onChange={(e) => props.onPasteDraftChange(e.target.value)}
              rows={8}
              placeholder={ORB_DICTATE_PASTE_PLACEHOLDER}
              className="orb-dictate-paste-input w-full resize-y rounded-xl border border-[var(--orb-line)]/25 bg-white/95 px-3 py-3 text-sm leading-relaxed text-[var(--orb-foreground)] outline-none focus:border-[var(--orb-primary)]/35 focus:ring-2 focus:ring-[var(--orb-primary)]/10"
              data-orb-dictate-paste-notes
            />
            <button
              type="button"
              data-orb-dictate-create-rough-capture
              disabled={!props.pasteDraft.trim()}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[var(--orb-primary)]/35 bg-[var(--orb-primary-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--orb-foreground)] disabled:opacity-45"
              onClick={props.onCreateRoughCapture}
            >
              {ORB_DICTATE_CREATE_ROUGH_CAPTURE}
            </button>
          </div>
        ) : null}

        {props.captureMethod === 'upload' ? (
          <div className="mt-4" data-orb-dictate-upload-panel>
            {uploadPlaceholderOnly ? (
              <p
                className="rounded-xl border border-dashed border-[var(--orb-line)]/35 bg-white/70 px-4 py-6 text-center text-xs leading-relaxed text-[var(--orb-muted)]"
                data-orb-dictate-upload-placeholder
              >
                {ORB_DICTATE_UPLOAD_PLACEHOLDER}
              </p>
            ) : (
              <>
                <OrbDictateAudioUpload
                  variant="capture"
                  onFile={props.onAudioUpload}
                  uploading={props.uploadingAudio ?? false}
                  fileLabel={props.uploadFileLabel ?? null}
                  error={props.uploadError ?? null}
                />
                <p className="mt-2 text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-upload-boundary>
                  {ORB_DICTATE_UPLOAD_BOUNDARY}
                </p>
              </>
            )}
          </div>
        ) : null}

        <p className="mt-4 text-center text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-consent-reminder>
          {ORB_DICTATE_CONSENT_REMINDER}
        </p>
      </section>

      <OrbDictateRecentCaptures />
    </>
  )
}
