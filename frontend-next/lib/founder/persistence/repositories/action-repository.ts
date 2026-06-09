import type { FounderActionRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { BaseFounderRepository } from './repository-base'

class ActionRepository extends BaseFounderRepository<FounderActionRecord> {
  entityType = 'action' as const
  memory = { items: [] as FounderActionRecord[], warned: false }
}

export const actionRepository = new ActionRepository()
