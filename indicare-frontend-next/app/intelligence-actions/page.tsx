import Link from 'next/link'

import { IntelligenceActionBoardClient } from '@/components/indicare/intelligence/intelligence-action-board-client'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader } from '@/components/indicare/ui'
import { fetchIntelligenceActions, fetchIntelligenceActionSummary } from '@/lib/os-api/intelligence-actions'

type PageProps = {
  searchParams?: Promise<{
    home_id?: string
    child_id?: string
    staff_id?: string
    status?: string
    priority?: string
    action_type?: string
    action_id?: string
  }>
}

export default async function IntelligenceActionsPage({ searchParams }: PageProps) {
  const params = (await searchParams) || {}
  const scope = {
    home_id: params.home_id,
    child_id: params.child_id,
    staff_id: params.staff_id,
    status: params.status
  }

  const [listResult, summaryResult] = await Promise.all([
    fetchIntelligenceActions({ ...scope, limit: 200 }),
    fetchIntelligenceActionSummary(scope)
  ])

  const actions = listResult.data.actions || []
  const summary = summaryResult.data.summary || {
    total: 0,
    by_status: {},
    by_priority: {},
    by_type: {},
    urgent_count: 0,
    proposed_count: 0
  }

  const highlight = params.action_id
    ? actions.find((a) => a.id === params.action_id)
    : undefined

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="IndiCare Intelligence"
        title="Intelligence Action Board"
        description="Review proposed actions, record manager decisions, and maintain an audit trail. Decision support only — manager decision required."
        action={
          <Link
            href={`/intelligence-spine${params.home_id ? `?home_id=${encodeURIComponent(params.home_id)}` : ''}`}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
          >
            Intelligence Spine
          </Link>
        }
      />
      <LiveDataStatus result={listResult} />
      {highlight ? (
        <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">
          Highlighted action: {highlight.title} (ID {highlight.id})
        </p>
      ) : null}
      <IntelligenceActionBoardClient
        initialActions={actions}
        initialSummary={summary}
        actionNotice={listResult.data.action_notice}
        persistenceAvailable={listResult.data.persistence_available}
        defaultFilters={{
          status: params.status || '',
          priority: params.priority || '',
          action_type: params.action_type || '',
          home_id: params.home_id || '',
          child_id: params.child_id || ''
        }}
      />
    </div>
  )
}
