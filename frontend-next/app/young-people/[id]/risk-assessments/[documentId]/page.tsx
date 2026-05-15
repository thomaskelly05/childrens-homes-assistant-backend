import { notFound } from 'next/navigation'

import { DocumentEditorShell } from '@/components/document-editor/document-editor-shell'
import { getYoungPersonSummary } from '@/lib/indicare/selectors'

export default async function YoungPersonRiskDocumentPage({ params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params
  const summary = getYoungPersonSummary(id)
  if (!summary) notFound()
  return <DocumentEditorShell scope="child" childId={id} documentId={documentId} title={`${summary.youngPerson.preferredName} risk assessment`} />
}
