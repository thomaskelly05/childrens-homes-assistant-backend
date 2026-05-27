import { SchemaRecordWorkspace } from '@/components/indicare/workspaces/schema-record-workspace'

export default async function ActionWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SchemaRecordWorkspace entityType="action" id={id} backHref="/actions" />
}

