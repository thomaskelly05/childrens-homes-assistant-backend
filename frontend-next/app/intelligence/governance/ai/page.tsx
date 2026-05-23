import Link from 'next/link'

import { AiGovernanceDashboard } from '@/components/intelligence-governance/ai-governance-dashboard'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader } from '@/components/indicare/ui'
import { fetchAiGovernanceDashboard } from '@/lib/os-api/ai-governance'

type PageProps = {
  searchParams?: Promise<{ period?: string }>
}

export default async function AiGovernancePage({ searchParams }: PageProps) {
  const params = (await searchParams) || {}
  const period = params.period || '7d'
  const result = await fetchAiGovernanceDashboard(period)
  const data = result.data

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="IndiCare Intelligence"
        title="AI Governance Dashboard"
        description="Control room for AI usage, quality, cost, safety, citations and source integrity. Leadership and manager oversight — metadata only."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/intelligence-spine"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              Intelligence Spine
            </Link>
            <Link
              href="/intelligence-oversight"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              Oversight review
            </Link>
          </div>
        }
      />
      <LiveDataStatus result={result} />
      <AiGovernanceDashboard data={data} warning={result.warning || data.warning || undefined} />
    </div>
  )
}
