'use client'

import { RecordingTypeSelector } from '@/components/indicare/record/recording-type-selector'

export function ChildRecordingSelectorCard({ childId }: { childId: string }) {
  return (
    <section data-testid="child-workspace-recording-selector" className="rounded-[28px] border border-sky-100/80 bg-white p-1 shadow-sm">
      <RecordingTypeSelector childId={childId} about="child" compact showBrowseAllLink />
    </section>
  )
}
