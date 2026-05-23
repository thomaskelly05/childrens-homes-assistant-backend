import { notFound } from 'next/navigation'

import { ChildJourneyAttentionStrip } from '@/components/child-journey/child-journey-attention-strip'
import { ChildJourneyEvidenceSection } from '@/components/child-journey/child-journey-evidence-card'
import { ChildJourneyHeader } from '@/components/child-journey/child-journey-header'
import { ChildJourneyJourneyPicture } from '@/components/child-journey/child-journey-journey-picture'
import { ChildJourneyOrbRail } from '@/components/child-journey/child-journey-orb-rail'
import { ChildJourneyRecordingActions } from '@/components/child-journey/child-journey-recording-actions'
import { ChildJourneyTodaySection } from '@/components/child-journey/child-journey-today-section'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { WorkflowSaveIndicator } from '@/components/system-feedback/workflow-save-indicator'
import { osDesign } from '@/components/indicare/os-design-tokens'
import { getChildExperienceIntelligence, getChildJourneyData } from '@/lib/child-journey/data'
import type { OsApiResult } from '@/lib/os-api/types'
import { saveStateFromStatus } from '@/lib/workflows/reliability'

export default async function ChildJourneyPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; status?: string; recordId?: string; limitation?: string; focus?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const [data, experienceResult] = await Promise.all([
    getChildJourneyData(id),
    getChildExperienceIntelligence(id)
  ])

  const child = data.child
  if (!child && data.source === 'live') notFound()

  const childName = child?.preferredName || child?.displayName || `Young person ${id}`
  const selectorResult: OsApiResult<unknown> = { data, source: data.source, error: data.error }
  const experienceIntelligence = experienceResult.intelligence
  const profileHref = `/young-people/${encodeURIComponent(id)}`

  return (
    <div className={osDesign.page}>
      <LiveDataStatus result={selectorResult as OsApiResult<any>} />

      {query.saved ? (
        <WorkflowSaveIndicator
          snapshot={{
            ...saveStateFromStatus(query.status),
            label: `Saved ${query.saved.replaceAll('-', ' ')}`,
            message: query.limitation || saveStateFromStatus(query.status).message
          }}
        />
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="min-w-0 space-y-5">
          <ChildJourneyHeader childId={id} childName={childName} data={data} profileHref={profileHref} />

          <div className="xl:hidden">
            <ChildJourneyOrbRail childId={id} childName={childName} />
          </div>

          <ChildJourneyTodaySection childId={id} data={data} />
          <ChildJourneyAttentionStrip childId={id} data={data} />
          <ChildJourneyRecordingActions childId={id} />
          <ChildJourneyJourneyPicture childId={id} data={data} />
          <ChildJourneyEvidenceSection childId={id} data={data} />

          {experienceIntelligence?.summary ? (
            <section className="rounded-[28px] border border-blue-100 bg-blue-50/70 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Experience intelligence</p>
              <p className="mt-2 text-sm font-bold leading-7 text-blue-950">{experienceIntelligence.summary}</p>
            </section>
          ) : null}
        </div>

        <aside className="hidden min-w-0 xl:block">
          <div className="sticky top-4">
            <ChildJourneyOrbRail childId={id} childName={childName} />
          </div>
        </aside>
      </div>
    </div>
  )
}
