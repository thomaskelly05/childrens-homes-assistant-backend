import { SchemaRecordWorkspace } from '@/components/indicare/workspaces/schema-record-workspace'

export default async function AppointmentWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SchemaRecordWorkspace entityType="appointment" id={id} backHref="/appointments" />
}

