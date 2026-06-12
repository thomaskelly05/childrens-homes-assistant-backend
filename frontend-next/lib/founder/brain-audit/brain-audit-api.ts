import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

import { BRAIN_AUDIT_DOMAIN_DEFINITIONS, BRAIN_AUDIT_CATEGORY_LABELS } from './brain-audit-domains.ts'
import { buildBrainCoverageAudit, getLatestBrainAudit } from './brain-audit-service.ts'
import { getBrainAuditHistory, getLatestMicroCheck, getMicroCheckHistory } from './brain-audit-store.ts'

export async function handleBrainAuditGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const audit = getLatestBrainAudit() ?? buildBrainCoverageAudit({ triggerType: 'manual' })

  return NextResponse.json(
    sanitiseFounderPayload({
      audit,
      history: getBrainAuditHistory(10),
      latestMicroCheck: getLatestMicroCheck(),
      microCheckHistory: getMicroCheckHistory(10),
      domainCount: BRAIN_AUDIT_DOMAIN_DEFINITIONS.length,
      categories: BRAIN_AUDIT_CATEGORY_LABELS
    })
  )
}

export async function handleBrainAuditPost(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const audit = buildBrainCoverageAudit({ triggerType: 'manual' })
  return NextResponse.json(sanitiseFounderPayload({ audit }))
}
