import { DocumentEditorShell } from '@/components/document-editor/document-editor-shell'

export default async function DocumentWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DocumentEditorShell scope="home" documentId={id} title="Home document" />
}

