import type { FounderContentDraftRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { BaseFounderRepository } from './repository-base'

class ContentRepository extends BaseFounderRepository<FounderContentDraftRecord> {
  entityType = 'content' as const
  memory = { items: [] as FounderContentDraftRecord[], warned: false }
}

export const contentRepository = new ContentRepository()
