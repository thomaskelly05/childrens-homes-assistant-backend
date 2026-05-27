import { notFound } from 'next/navigation'

import { RecordingForm } from '@/components/child-journey/recording-form'
import { FullScreenWorkspace } from '@/components/indicare/workspaces/full-screen-workspace'
import { getChildJourneyData } from '@/lib/child-journey/data'
import { workflowFromRouteSegment } from '@/lib/child-journey/workflows'

export default async function ChildRecordingWorkflowPage({
  params
}: {
  params: Promise<{ id: string; workflow: string; mode: string }>
}) {
  const { id, workflow: workflowSegment, mode } = await params
  const workflow = workflowFromRouteSegment(workflowSegment)
  if (!workflow) notFound()
  if (mode !== 'new' && !(workflow.id === 'documents' && mode === 'upload')) notFound()

  const data = await getChildJourneyData(id)
  const child = data.child
  if (!child && data.source === 'live') notFound()
  const childName = child?.preferredName || child?.displayName || `Young person ${id}`

  return (
    <FullScreenWorkspace
      eyebrow={`${workflow.eyebrow} workspace`}
      title={workflow.title}
      description={`${workflow.description} Child selected: ${childName}.`}
      backHref={`/young-people/${encodeURIComponent(id)}/journey`}
    >
      <RecordingForm childId={id} childName={childName} workflow={workflow} />
    </FullScreenWorkspace>
  )
}
