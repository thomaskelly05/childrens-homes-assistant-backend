import { SchemaRecordWorkspace } from '@/components/indicare/workspaces/schema-record-workspace'

export default async function RiskAssessmentWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SchemaRecordWorkspace entityType="risk_assessment" id={id} backHref="/risk-assessments" />
}

