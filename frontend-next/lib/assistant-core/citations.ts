import type { AssistantCitation } from './types'
import { resolveCitationRoute } from '@/lib/navigation/entity-resolver'

export function citationLabel(citation: AssistantCitation, index: number) {
  return citation.label || `${citation.source_type} #${citation.source_id || index + 1}`
}

export function citationHref(citation: AssistantCitation) {
  return resolveCitationRoute(citation)
}

export function citationsUnavailable(citations: AssistantCitation[] | undefined) {
  return !citations || citations.length === 0
}
