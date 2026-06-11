import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

import {
  approveAgentAction,
  rejectAgentAction,
  requestChangesOnAgentAction
} from './founder-agent-actions'
import { getAutonomySettings, runAutonomousLoop, updateAutonomySettings } from './founder-autonomous-loop'
import {
  buildAgentContext,
  buildFounderCoverageMap,
  generateFounderChiefOfStaffBrief,
  getAgentApprovalQueue,
  getAgentAuditTrail,
  getFounderAgentLiveStates,
  getQualityLabAgentIntegration,
  runAgentAction
} from './founder-agent-service'
import { generateRecommendedScenariosForArea } from './founder-agent-coverage-map'
import { isValidFounderAgentId } from './founder-agent-registry'
import type { FounderAgentActionType, FounderAutonomousLoopTrigger, FounderCoverageAreaId } from './founder-agent-types'

function founderActor(session: { user: { email?: string; id?: number } }): string {
  return session.user.email ?? (session.user.id != null ? `user-${session.user.id}` : 'founder')
}

export async function handleFounderAgentsGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const context = buildAgentContext()
  const agents = getFounderAgentLiveStates(context)
  const approvalQueue = getAgentApprovalQueue()

  return NextResponse.json(
    sanitiseFounderPayload({
      success: true,
      data: { agents, approvalQueue, qualityLabIntegration: getQualityLabAgentIntegration(context) }
    })
  )
}

export async function handleFounderAgentsBriefGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const brief = generateFounderChiefOfStaffBrief(buildAgentContext())

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: brief }))
}

export async function handleFounderAgentsActionPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    agentId?: string
    actionType?: FounderAgentActionType
    areaId?: FounderCoverageAreaId
    trigger?: FounderAutonomousLoopTrigger
  }

  if (body.trigger) {
    const loopResult = runAutonomousLoop(body.trigger)
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: loopResult }))
  }

  if (!body.agentId || !body.actionType) {
    return NextResponse.json({ error: 'agentId and actionType required' }, { status: 400 })
  }

  if (!isValidFounderAgentId(body.agentId)) {
    return NextResponse.json({ error: 'Unknown agent' }, { status: 400 })
  }

  try {
    const result = runAgentAction({
      agentId: body.agentId,
      actionType: body.actionType,
      actor: founderActor(session),
      areaId: body.areaId
    })
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: result }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed' },
      { status: 400 }
    )
  }
}

export async function handleFounderAgentsApprovePost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { approvalId?: string }
  if (!body.approvalId) {
    return NextResponse.json({ error: 'approvalId required' }, { status: 400 })
  }

  const updated = approveAgentAction(body.approvalId, founderActor(session))
  if (!updated) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: updated }))
}

export async function handleFounderAgentsRejectPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    approvalId?: string
    requestChanges?: boolean
  }
  if (!body.approvalId) {
    return NextResponse.json({ error: 'approvalId required' }, { status: 400 })
  }

  const actor = founderActor(session)
  const updated = body.requestChanges
    ? requestChangesOnAgentAction(body.approvalId, actor)
    : rejectAgentAction(body.approvalId, actor)

  if (!updated) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: updated }))
}

export async function handleFounderAgentsAuditGet(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')
  const trail = getAgentAuditTrail(
    agentId && isValidFounderAgentId(agentId) ? agentId : undefined
  )

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: trail }))
}

export async function handleFounderAgentsCoverageGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const context = buildAgentContext()
  const coverage = buildFounderCoverageMap({
    qualityRuns: context.qualityRuns,
    evaluationRuns: context.evaluationRuns
  })

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: coverage }))
}

export async function handleFounderAgentsCoverageGenerateScenariosPost(
  request: Request
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { areaId?: FounderCoverageAreaId }
  if (!body.areaId) {
    return NextResponse.json({ error: 'areaId required' }, { status: 400 })
  }

  const scenarios = generateRecommendedScenariosForArea(body.areaId)
  const result = runAgentAction({
    agentId: 'orb-quality-agent',
    actionType: 'generate_synthetic_scenarios',
    actor: founderActor(session),
    areaId: body.areaId
  })

  return NextResponse.json(
    sanitiseFounderPayload({
      success: true,
      data: { scenarios, action: result }
    })
  )
}

export async function handleFounderAgentsAutonomySettingsPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Partial<ReturnType<typeof getAutonomySettings>>
  const settings = updateAutonomySettings(body)

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: settings }))
}

export async function handleFounderAgentsAutonomySettingsGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: getAutonomySettings() }))
}
