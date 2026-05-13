import type { AssistantCitation } from './types'

export function citationLabel(citation: AssistantCitation, index: number) {
  return citation.label || `${citation.source_type} #${citation.source_id || index + 1}`
}

export function citationHref(citation: AssistantCitation) {
  return citation.route || `/os/retrieval/sources?source=${encodeURIComponent(`${citation.source_type}:${citation.source_id}`)}`
}

export function citationsUnavailable(citations: AssistantCitation[] | undefined) {
  return !citations || citations.length === 0
}
