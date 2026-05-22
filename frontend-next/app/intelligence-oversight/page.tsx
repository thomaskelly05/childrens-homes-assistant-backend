import Link from 'next/link'

import { IntelligenceOversightForm } from '@/components/indicare/intelligence/intelligence-oversight-form'
import { PageHeader } from '@/components/indicare/ui'

type PageProps = {
  searchParams?: Promise<{ home_id?: string; child_id?: string; staff_id?: string }>
}

export default async function IntelligenceOversightPage({ searchParams }: PageProps) {
  const params = (await searchParams) || {}

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Manager oversight"
        title="Intelligence oversight review"
        description="Record daily brief, safeguarding, evidence and record quality oversight for audit. This does not replace professional judgement."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/intelligence-actions" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">
              Action Board
            </Link>
            <Link
              href="/intelligence-spine"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              Intelligence Spine
            </Link>
          </div>
        }
      />
      <IntelligenceOversightForm homeId={params.home_id} childId={params.child_id} staffId={params.staff_id} />
    </div>
  )
}
