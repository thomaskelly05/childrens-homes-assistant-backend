import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

import { buildAutonomyOverview, getSchedulerStatus, tickScheduler } from './autonomy-service'
import { approveLiveLlmRun, rejectLiveLlmRun } from './live-llm-gate'
import { executeSchedulerTask } from './scheduler-runner'
import { getSchedulerTask, updateEmailSettings, updateSchedulerTask } from './scheduler-store'
import { generateDailyEmailReport, generateWeeklyEmailReport, sendFounderEmailReport } from './email-report-service'

export async function handleAutonomyGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

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

  const result = executeSchedulerTask(task)
  return NextResponse.json(sanitiseFounderPayload({ result, overview: buildAutonomyOverview() }))
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
    provider?: 'smtp' | 'resend' | 'sendgrid' | 'postmark' | 'dry_run'
  }

  const settings = updateEmailSettings(body)
  return NextResponse.json(sanitiseFounderPayload({ settings }))
}

export async function handleAutonomyEmailPreviewPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { type?: 'daily' | 'weekly' }
  const report = body.type === 'weekly' ? generateWeeklyEmailReport() : generateDailyEmailReport()
  return NextResponse.json(sanitiseFounderPayload({ report }))
}

export async function handleAutonomyEmailSendPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { type?: 'daily' | 'weekly' }
  const report = body.type === 'weekly' ? generateWeeklyEmailReport() : generateDailyEmailReport()
  const sendResult = sendFounderEmailReport(report)
  return NextResponse.json(sanitiseFounderPayload(sendResult))
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
