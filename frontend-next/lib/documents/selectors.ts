import { HomeDocument, HomeDocumentType } from './types'

export function getHomeDocuments(): HomeDocument[] {
  return []
}

export function getHomeDocumentById(id: string): HomeDocument | undefined {
  return getHomeDocuments().find((document) => document.id === id)
}

export function getDocumentsByType(documentType: HomeDocumentType): HomeDocument[] {
  return getHomeDocuments().filter((document) => document.documentType === documentType)
}

export function getRegulatoryDocuments(): HomeDocument[] {
  return getHomeDocuments().filter((document) => Boolean(document.regulation) || document.documentType.startsWith('reg'))
}

export function getDocumentsNeedingReview(): HomeDocument[] {
  return getHomeDocuments().filter((document) => ['review_required', 'action_plan_open'].includes(document.status))
}