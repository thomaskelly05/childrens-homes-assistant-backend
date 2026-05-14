import Link from 'next/link'
import { notFound } from 'next/navigation'

import { RecordingForm } from '@/components/child-journey/recording-form'
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
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500" aria-label="Breadcrumb">
        <Link href="/home" className="hover:text-blue-700">Home</Link>
        <span>/</span>
        <Link href={`/young-people/${encodeURIComponent(id)}/journey`} className="hover:text-blue-700">{childName}</Link>
        <span>/</span>
        <span className="text-slate-900">{workflow.title.replace('Add ', '')}</span>
      </nav>

      <header className="rounded-[36px] border border-white/80 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">{workflow.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-5xl">{workflow.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-500">{workflow.description}</p>
            <p className="mt-3 text-sm font-black text-slate-700">Child selected: {childName}. You do not need to choose the child again.</p>
          </div>
          <Link href={`/young-people/${encodeURIComponent(id)}/journey`} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </header>

      <RecordingForm childId={id} childName={childName} workflow={workflow} />
    </div>
  )
}
