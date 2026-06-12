import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

import type { LearningLoopTriggerType } from './learning-loop-types.ts'
import { gatherLearningSignals } from './learning-loop-signals.ts'
import {
  approveProposal,
  approveScenario,
  buildLearningLoopOverview,
  createBuildBriefForProposal,
  createProposalForLoop,
  generateScenariosForLoop,
  getBenchmarkBank,
  getLearningLoopAudit,
  getLearningLoopAutonomySettings,
  rejectProposal,
  rejectScenario,
  runWeaknessDetection,
  startLearningLoop,
  updateLearningLoopAutonomySettings
} from './learning-loop-service.ts'

function founderActor(session: { user: { email?: string; id?: number } }): string {
  return session.user.email ?? (session.user.id != null ? `user-${session.user.id}` : 'founder')
}

export async function handleLearningLoopGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(
    sanitiseFounderPayload({ success: true, data: buildLearningLoopOverview() })
  )
}

export async function handleLearningLoopStartPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    triggerType?: LearningLoopTriggerType
    sourceRunId?: string
    sourceEventId?: string
  }

  const loop = startLearningLoop({
    triggerType: body.triggerType ?? 'manual_founder_trigger',
    sourceRunId: body.sourceRunId,
    sourceEventId: body.sourceEventId,
    actor: founderActor(session),
    signals: gatherLearningSignals()
  })

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: loop }))
}

export async function handleLearningLoopDetectWeaknessesPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { loopId?: string }
  if (!body.loopId) {
    return NextResponse.json({ error: 'loopId required' }, { status: 400 })
  }

  try {
    const loop = runWeaknessDetection(body.loopId, founderActor(session), gatherLearningSignals())
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: loop }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Detection failed' },
      { status: 400 }
    )
  }
}

export async function handleLearningLoopGenerateScenariosPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    loopId?: string
    areaId?: string
    count?: number
  }
  if (!body.loopId) {
    return NextResponse.json({ error: 'loopId required' }, { status: 400 })
  }

  try {
    const loop = generateScenariosForLoop(
      body.loopId,
      { areaId: body.areaId, count: body.count },
      founderActor(session)
    )
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: loop }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 400 }
    )
  }
}

export async function handleLearningLoopApproveScenarioPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    scenarioId?: string
    targetStatus?: 'approved_for_testing' | 'active_benchmark'
  }
  if (!body.scenarioId) {
    return NextResponse.json({ error: 'scenarioId required' }, { status: 400 })
  }

  try {
    const scenario = approveScenario(body.scenarioId, founderActor(session), body.targetStatus)
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: scenario }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Approval failed' },
      { status: 400 }
    )
  }
}

export async function handleLearningLoopRejectScenarioPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { scenarioId?: string; reason?: string }
  if (!body.scenarioId) {
    return NextResponse.json({ error: 'scenarioId required' }, { status: 400 })
  }

  try {
    const scenario = rejectScenario(body.scenarioId, founderActor(session), body.reason)
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: scenario }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Rejection failed' },
      { status: 400 }
    )
  }
}

export async function handleLearningLoopCreateProposalPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { loopId?: string }
  if (!body.loopId) {
    return NextResponse.json({ error: 'loopId required' }, { status: 400 })
  }

  try {
    const proposal = createProposalForLoop(body.loopId, founderActor(session))
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: proposal }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Proposal creation failed' },
      { status: 400 }
    )
  }
}

export async function handleLearningLoopApproveProposalPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { proposalId?: string; notes?: string }
  if (!body.proposalId) {
    return NextResponse.json({ error: 'proposalId required' }, { status: 400 })
  }

  try {
    const proposal = approveProposal(body.proposalId, founderActor(session), body.notes)
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: proposal }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Approval failed' },
      { status: 400 }
    )
  }
}

export async function handleLearningLoopRejectProposalPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { proposalId?: string; notes?: string }
  if (!body.proposalId) {
    return NextResponse.json({ error: 'proposalId required' }, { status: 400 })
  }

  try {
    const proposal = rejectProposal(body.proposalId, founderActor(session), body.notes)
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: proposal }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Rejection failed' },
      { status: 400 }
    )
  }
}

export async function handleLearningLoopCreateBuildBriefPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { proposalId?: string }
  if (!body.proposalId) {
    return NextResponse.json({ error: 'proposalId required' }, { status: 400 })
  }

  try {
    const result = createBuildBriefForProposal(body.proposalId, founderActor(session))
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: result }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Build brief creation failed' },
      { status: 400 }
    )
  }
}

export async function handleLearningLoopAuditGet(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const url = new URL(request.url)
  const loopId = url.searchParams.get('loopId') ?? undefined

  return NextResponse.json(
    sanitiseFounderPayload({ success: true, data: { entries: getLearningLoopAudit(loopId) } })
  )
}

export async function handleLearningLoopBenchmarkBankGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: getBenchmarkBank() }))
}

export async function handleLearningLoopAutonomySettingsGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(
    sanitiseFounderPayload({ success: true, data: getLearningLoopAutonomySettings() })
  )
}

export async function handleLearningLoopAutonomySettingsPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const settings = updateLearningLoopAutonomySettings(body as Parameters<typeof updateLearningLoopAutonomySettings>[0])

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: settings }))
}
