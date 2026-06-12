import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

import {
  ensureAutonomyLoopStateForTask,
  loadOrCreateAutonomyLoopState,
  syncAndPersistAutonomyLoopState
} from './autonomy-loop-persistence'
import { buildAutonomyOverview, getSchedulerStatus, tickScheduler } from './autonomy-service'
import { approveLiveLlmRun, rejectLiveLlmRun } from './live-llm-gate'
import { executeSchedulerTask } from './scheduler-runner'
import { getLatestEmailReportPreview, getSchedulerTask, updateEmailSettings, updateSchedulerTask } from './scheduler-store'
import { generateEmailReportWithSafety, sendFounderEmailReport } from './email-report-service'
import type { SchedulerTaskRunResult } from './scheduler-types'

export async function handleAutonomyGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await loadOrCreateAutonomyLoopState()
  return NextResponse.json(sanitiseFounderPayload(getSchedulerStatus()))
}

export async function handleAutonomyOverviewGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload({ overview: buildAutonomyOverview() }))
}

export async function handleAutonomyTickPost(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const result = tickScheduler()
  return NextResponse.json(sanitiseFounderPayload(result))
}

function buildTaskRunResponse(taskId: string, result: SchedulerTaskRunResult) {
  if (result.status === 'failed' || result.status === 'blocked') {
    return {
      status: 'failed' as const,
      taskId,
      errorCode: result.errorCode ?? 'SCHEDULER_TASK_ERROR',
      safeMessage: result.safeMessage ?? result.error ?? result.summary,
      technicalMessage: result.technicalMessage ?? result.error ?? result.summary,
      auditRecordId: result.auditRecordIds[result.auditRecordIds.length - 1],
      result,
      overview: buildAutonomyOverview()
    }
  }

  return {
    status: result.status === 'redacted' ? ('redacted' as const) : ('completed' as const),
    taskId,
    result,
    overview: buildAutonomyOverview(),
    safeMessage: result.safeMessage ?? result.summary,
    redactionCount: result.redactionCount ?? 0,
    safetyStatus: result.safetyStatus,
    emailReportId: result.emailReportId
  }
}

export async function handleAutonomyTaskRunPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { taskId?: string }
  if (!body.taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
  }

  const task = getSchedulerTask(body.taskId)
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  try {
    await ensureAutonomyLoopStateForTask(task.taskType)
    const result = executeSchedulerTask(task)
    await syncAndPersistAutonomyLoopState('task_run')
    const payload = buildTaskRunResponse(body.taskId, result)

    if (payload.status === 'failed') {
      return NextResponse.json(sanitiseFounderPayload(payload), { status: 200 })
    }

    return NextResponse.json(sanitiseFounderPayload(payload))
  } catch (error) {
    const technicalMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      sanitiseFounderPayload({
        status: 'failed',
        taskId: body.taskId,
        errorCode: 'SCHEDULER_TASK_ERROR',
        safeMessage: 'Task error — see audit trail for details.',
        technicalMessage,
        overview: buildAutonomyOverview()
      }),
      { status: 200 }
    )
  }
}

export async function handleAutonomyTaskPatch(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    taskId?: string
    enabled?: boolean
    maxRunsPerDay?: number
    maxScenarioCount?: number
  }

  if (!body.taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
  }

  const updated = updateSchedulerTask(body.taskId, {
    enabled: body.enabled,
    maxRunsPerDay: body.maxRunsPerDay,
    maxScenarioCount: body.maxScenarioCount
  })

  if (!updated) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ task: updated }))
}

export async function handleAutonomyEmailSettingsPatch(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    recipient?: string
    dailyEnabled?: boolean
    weeklyEnabled?: boolean
    dailyHourUtc?: number
    dailyMinuteUtc?: number
    dailyHourLocal?: number
    dailyMinuteLocal?: number
    dailyTimezone?: string
    provider?: 'smtp' | 'resend' | 'sendgrid' | 'postmark' | 'dry_run'
    dryRun?: boolean
    businessReportEnabled?: boolean
    includedSections?: import('./scheduler-types.ts').DailyBusinessReportSectionKey[]
    founderConfirmedSend?: boolean
  }

  const settings = updateEmailSettings(body)
  return NextResponse.json(sanitiseFounderPayload({ settings }))
}

export async function handleAutonomyEmailPreviewPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { type?: 'daily' | 'weekly' }
  const type = body.type === 'weekly' ? 'weekly' : 'daily'
  const generated = generateEmailReportWithSafety(type)

  if (generated.blocked || !generated.content) {
    return NextResponse.json(
      sanitiseFounderPayload({
        status: 'blocked',
        errorCode: 'EMAIL_REPORT_SAFETY_BLOCKED',
        safeMessage: 'Email report blocked because potential identifiable data was detected.',
        technicalMessage: generated.safety.technicalMessage ?? generated.safety.blockedReason
      }),
      { status: 200 }
    )
  }

  return NextResponse.json(
    sanitiseFounderPayload({
      report: generated.content,
      safetyStatus: generated.safety.status,
      redactionCount: generated.safety.redactionCount
    })
  )
}

export async function handleAutonomyEmailSendPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { type?: 'daily' | 'weekly' }
  const type = body.type === 'weekly' ? 'weekly' : 'daily'
  const generated = generateAndSendFromType(type)

  if (generated.blocked) {
    return NextResponse.json(
      sanitiseFounderPayload({
        status: 'blocked',
        errorCode: 'EMAIL_REPORT_SAFETY_BLOCKED',
        safeMessage: 'Email report blocked because potential identifiable data was detected.',
        technicalMessage: generated.safety.technicalMessage
      }),
      { status: 200 }
    )
  }

  return NextResponse.json(sanitiseFounderPayload(generated.sendResult))
}

function generateAndSendFromType(type: 'daily' | 'weekly') {
  const generated = generateEmailReportWithSafety(type)
  if (generated.blocked || !generated.content) {
    return { blocked: true as const, safety: generated.safety, sendResult: null }
  }
  const sendResult = sendFounderEmailReport(generated.content, generated.safety)
  return { blocked: false as const, safety: generated.safety, sendResult }
}

export async function handleAutonomyEmailPreviewGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const latest = getLatestEmailReportPreview()
  return NextResponse.json(sanitiseFounderPayload({ preview: latest?.preview ?? null, record: latest }))
}

export async function handleAutonomyLiveLlmApprovePost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { approvalId?: string }
  if (!body.approvalId) {
    return NextResponse.json({ error: 'approvalId required' }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const item = approveLiveLlmRun(body.approvalId, actor)
  if (!item) {
    return NextResponse.json({ error: 'Approval not found or already decided' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ item, note: 'Approval recorded. Live LLM still requires manual execution.' }))
}

export async function handleAutonomyLiveLlmRejectPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { approvalId?: string }
  if (!body.approvalId) {
    return NextResponse.json({ error: 'approvalId required' }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const item = rejectLiveLlmRun(body.approvalId, actor)
  if (!item) {
    return NextResponse.json({ error: 'Approval not found or already decided' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ item }))
}
