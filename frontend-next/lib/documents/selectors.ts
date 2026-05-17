import { getOsDocuments, getOsDocument } from '@/lib/os-api/documents'
import { HomeDocument, HomeDocumentType } from './types'

const legacyHomeDocuments: HomeDocument[] = []

export function getHomeDocuments(): HomeDocument[] {
  return legacyHomeDocuments
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

export async function getLiveHomeDocuments(): Promise<HomeDocument[]> {
  const result = await getOsDocuments()
  return result.data
}

export async function getLiveHomeDocumentById(id: string): Promise<HomeDocument | undefined> {
  const result = await getOsDocument(id)
  return result.data
}

export async function getLiveDocumentsByType(documentType: HomeDocumentType): Promise<HomeDocument[]> {
  const documents = await getLiveHomeDocuments()
  return documents.filter((document) => document.documentType === documentType)
}

export async function getLiveRegulatoryDocuments(): Promise<HomeDocument[]> {
  const documents = await getLiveHomeDocuments()
  return documents.filter((document) => Boolean(document.regulation) || document.documentType.startsWith('reg'))
}

export async function getLiveDocumentsNeedingReview(): Promise<HomeDocument[]> {
  const documents = await getLiveHomeDocuments()
  return documents.filter((document) => ['draft', 'review', 'review_required', 'returned_for_update', 'action_plan_open', 'processing'].includes(document.status))
}