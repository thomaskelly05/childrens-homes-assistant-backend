import type { FounderMemoryRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { BaseFounderRepository } from './repository-base'

class MemoryRepository extends BaseFounderRepository<FounderMemoryRecord> {
  entityType = 'founder_memory' as const
  memory = { items: [] as FounderMemoryRecord[], warned: false }
  protected noHardDelete = true
}

export const memoryRepository = new MemoryRepository()
