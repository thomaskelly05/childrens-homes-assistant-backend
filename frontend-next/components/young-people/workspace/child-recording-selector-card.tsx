'use client'

import { RecordingTypeSelector } from '@/components/indicare/record/recording-type-selector'

export function ChildRecordingSelectorCard({ childId }: { childId: string }) {
  return (
    <section data-testid="child-workspace-recording-selector" className="rounded-[28px] border border-sky-100/80 bg-white p-1 shadow-sm">
      <p
        data-testid="child-record-once-tagline"
        className="mx-4 mt-4 text-sm font-semibold leading-6 text-slate-600 md:mx-5"
      >
        Record once. IndiCare connects this to the child&apos;s story, plans, oversight and evidence.
      </p>
      <RecordingTypeSelector childId={childId} about="child" compact showBrowseAllLink />
    </section>
  )
}
