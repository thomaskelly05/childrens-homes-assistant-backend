'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { RecordingContextPanel } from '@/components/indicare/record/recording-context-panel'
import { RecordingEditor } from '@/components/indicare/record/recording-editor'
import { RecordingLanguageSuggestions } from '@/components/indicare/record/recording-language-suggestions'
import { RecordingOrbRail } from '@/components/indicare/record/recording-orb-rail'
import { RecordingQualityCoach } from '@/components/indicare/record/recording-quality-coach'
import { RecordingReviewChecklist } from '@/components/indicare/record/recording-review-checklist'
import { RecordingTherapeuticPrompts } from '@/components/indicare/record/recording-therapeutic-prompts'
import { RecordingTypeSelector } from '@/components/indicare/record/recording-type-selector'
import {
  RECORDING_OS_ORB_HREF,
  RECORDING_STANDALONE_ORB_HREF
} from '@/lib/record/recording-quality-coach'
import type { RecordAboutContext } from '@/lib/record/recording-hub'
import { recordCardById, recordCardHref } from '@/lib/record/recording-hub'
import { resolveRecordingTypeFromQuery, type RecordingWorkspaceType } from '@/lib/record/recording-types'

export function RecordingWorkspace({
  about,
  childId,
  childDisplayName,
  initialRecordingType,
  highlightType
}: {
  about: RecordAboutContext
  childId?: string
  childDisplayName?: string
  initialRecordingType?: RecordingWorkspaceType
  highlightType?: string
}) {
  const defaultType =
    initialRecordingType ||
    resolveRecordingTypeFromQuery(highlightType) ||
    (about === 'home-shift' ? 'handover' : about === 'staff' ? 'staff-reflection' : 'daily-note')

  const [recordingType, setRecordingType] = useState<RecordingWorkspaceType>(defaultType)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const continueHref = useMemo(() => {
    const card = recordCardById(
      recordingType === 'incident'
        ? 'incidents'
        : recordingType === 'family-time'
          ? 'family-contact'
          : recordingType === 'health-medication'
            ? 'medication-health'
            : recordingType === 'handover'
              ? 'shift-handover'
              : recordingType === 'evidence-document'
                ? 'documents'
                : recordingType === 'staff-reflection'
                  ? 'ask-orb'
                  : recordingType
    )
    if (!card) return '/record'
    return recordCardHref(card, childId)
  }, [childId, recordingType])

  return (
    <section data-testid="recording-workspace" className="space-y-6">
      <header className="rounded-[28px] border border-blue-100 bg-gradient-to-r from-blue-50/90 via-white to-cyan-50/70 p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Recording workspace</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Record with care</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Write clear, child-centred records. ORB can help with wording, reflection and review.
        </p>
      </header>

      <RecordingTypeSelector value={recordingType} onChange={setRecordingType} about={about} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <RecordingEditor
            recordingType={recordingType}
            about={about}
            childId={childId}
            childName={childDisplayName}
            onTitleChange={setTitle}
            onBodyChange={setBody}
          />
          <RecordingTherapeuticPrompts recordingType={recordingType} />
          <RecordingContextPanel body={body} title={title} />
        </div>

        <div className="space-y-4">
          <RecordingOrbRail />
          <RecordingQualityCoach body={body} title={title} />
          <RecordingLanguageSuggestions body={body} title={title} />
          <RecordingReviewChecklist body={body} title={title} />
        </div>
      </div>

      <section
        data-testid="recording-workspace-actions"
        className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5"
      >
        <p className="text-sm font-black text-slate-950">Review before saving</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          Submit through the correct formal workflow when ready. This workspace draft stays in your browser until then.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={RECORDING_OS_ORB_HREF}
            className="inline-flex min-h-11 items-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
          >
            Open OS ORB
          </Link>
          <Link
            href={RECORDING_STANDALONE_ORB_HREF}
            className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
          >
            Standalone wording helper
          </Link>
          <Link
            href={continueHref}
            className="inline-flex min-h-11 items-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
          >
            Continue to full record route
          </Link>
        </div>
      </section>
    </section>
  )
}
