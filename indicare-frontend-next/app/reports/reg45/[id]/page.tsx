import { SchemaRecordWorkspace } from '@/components/indicare/workspaces/schema-record-workspace'

export default async function Reg45WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SchemaRecordWorkspace entityType="reg45" id={id} backHref="/reports" />
}

