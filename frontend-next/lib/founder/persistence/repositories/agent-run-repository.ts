import type { FounderAgentRunRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { BaseFounderRepository } from './repository-base'

class AgentRunRepository extends BaseFounderRepository<FounderAgentRunRecord> {
  entityType = 'agent_run' as const
  memory = { items: [] as FounderAgentRunRecord[], warned: false }
}

export const agentRunRepository = new AgentRunRepository()
