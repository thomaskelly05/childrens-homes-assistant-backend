import { demoHomeDocuments } from './demo-data'
import { HomeDocument, HomeDocumentType } from './types'

export function getHomeDocuments(): HomeDocument[] {
  return [...demoHomeDocuments].sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())
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
