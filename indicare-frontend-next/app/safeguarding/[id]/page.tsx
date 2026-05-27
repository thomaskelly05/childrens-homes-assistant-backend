import { SchemaRecordWorkspace } from '@/components/indicare/workspaces/schema-record-workspace'

export default async function SafeguardingWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SchemaRecordWorkspace entityType="safeguarding" id={id} backHref="/safeguarding" />
}

