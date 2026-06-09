import { notFound } from 'next/navigation'

import { FounderAgentDetailPage } from '@/components/founder/founder-agent-detail-page'
import { FounderGuard } from '@/components/founder/founder-guard'
import { getAgentDetail, isValidAgentId } from '@/lib/founder/agents'

type PageProps = {
  params: Promise<{ agent: string }>
}

export default async function FounderAgentPage({ params }: PageProps) {
  const { agent: agentId } = await params

  if (!isValidAgentId(agentId)) {
    notFound()
  }

  const agent = getAgentDetail(agentId)

  return (
    <FounderGuard>
      <FounderAgentDetailPage agent={agent} />
    </FounderGuard>
  )
}
