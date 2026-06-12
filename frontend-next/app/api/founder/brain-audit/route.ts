import { handleBrainAuditGet, handleBrainAuditPost } from '@/lib/founder/brain-audit/brain-audit-api'

export async function GET() {
  return handleBrainAuditGet()
}

export async function POST() {
  return handleBrainAuditPost()
}
