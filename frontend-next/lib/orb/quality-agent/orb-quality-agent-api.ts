import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import { mergeFounderProxyHeaders, requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

import type { OrbEvaluationRun } from '../evaluation/orb-evaluation-types.ts'
import { normalisePersistedRuns } from '../evaluation/orb-evaluation-api.ts'
import { computeOrbLaunchQualityGate } from '../quality/launch-quality-gate.ts'
import { listOrbQualityAgentAuditRecords, recordOrbQualityAgentAudit } from './orb-quality-agent-audit.ts'
import {
  analyzeOrbEvaluationRun,
  findLatestFailedRun,
  generateBuildBriefFromAnalysis,
  prepareDraftPrFromAnalysis
} from './orb-quality-agent-service.ts'
import type { OrbFailureClassification } from './orb-quality-agent-types.ts'

async function fetchPersistedRuns(request: Request): Promise<OrbEvaluationRun[]> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const backendOrigin = getInternalBackendOrigin()
  const upstream = await fetch(`${backendOrigin}/founder-os/persistence/orb-evaluation-runs`, {
    headers: mergeFounderProxyHeaders(request, cookieHeader, undefined, cookieStore),
    cache: 'no-store'
  })

  if (!upstream.ok) return []
  const payload = await upstream.json().catch(() => ({}))
  const items = (payload as { items?: unknown }).items ?? payload
  return normalisePersistedRuns(items)
}

function founderActor(session: { user: { email?: string; id?: number } }): string {
  return session.user.email ?? (session.user.id != null ? `user-${session.user.id}` : 'founder')
}

export async function handleQualityAgentAnalyzeGet(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const url = new URL(request.url)
  const runId = url.searchParams.get('runId')

  const runs = await fetchPersistedRuns(request)
  const targetRun = runId ? runs.find((r) => r.id === runId) : findLatestFailedRun(runs)

  if (!targetRun) {
    return NextResponse.json(
      sanitiseFounderPayload({
        success: false,
        message: 'No ORB evaluation run found for quality agent analysis.'
      }),
      { status: 404 }
    )
  }

  const launchGateBlockers = computeOrbLaunchQualityGate({
    runs: [],
    evaluationRuns: [targetRun],
    whistleblowingCovered: true,
    privacyRetentionReviewed: true
  }).blockers
  const analysis = analyzeOrbEvaluationRun(targetRun, { launchGateBlockers })

  void recordOrbQualityAgentAudit({
    user: founderActor(session),
    runId: targetRun.id,
    action: 'analyze_run',
    testsRequested: ['classification'],
    metadata: { failureGroupCount: analysis.failureGroups.length, runType: analysis.runType }
  })

  return NextResponse.json(
    sanitiseFounderPayload({
      success: true,
      data: analysis
    })
  )
}

export async function handleQualityAgentBuildBriefPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { runId?: string }
  const runs = await fetchPersistedRuns(request)
  const targetRun = body.runId ? runs.find((r) => r.id === body.runId) : findLatestFailedRun(runs)

  if (!targetRun) {
    return NextResponse.json(
      sanitiseFounderPayload({ success: false, message: 'Run not found.' }),
      { status: 404 }
    )
  }

  const launchGateBlockers = computeOrbLaunchQualityGate({
    runs: [],
    evaluationRuns: [targetRun],
    whistleblowingCovered: true,
    privacyRetentionReviewed: true
  }).blockers
  const analysis = analyzeOrbEvaluationRun(targetRun, { launchGateBlockers })
  const { brief, formatted } = generateBuildBriefFromAnalysis(analysis)

  void recordOrbQualityAgentAudit({
    user: founderActor(session),
    runId: targetRun.id,
    action: 'generate_build_brief',
    generatedPlan: brief.context,
    testsRequested: brief.tests
  })

  return NextResponse.json(
    sanitiseFounderPayload({
      success: true,
      data: { brief, formatted }
    })
  )
}

export async function handleQualityAgentCreatePrPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    runId?: string
    classification?: OrbFailureClassification
  }

  const runs = await fetchPersistedRuns(request)
  const targetRun = body.runId ? runs.find((r) => r.id === body.runId) : findLatestFailedRun(runs)

  if (!targetRun) {
    return NextResponse.json(
      sanitiseFounderPayload({ success: false, message: 'Run not found.' }),
      { status: 404 }
    )
  }

  const launchGateBlockers = computeOrbLaunchQualityGate({
    runs: [],
    evaluationRuns: [targetRun],
    whistleblowingCovered: true,
    privacyRetentionReviewed: true
  }).blockers
  const analysis = analyzeOrbEvaluationRun(targetRun, { launchGateBlockers })
  const prSummary = prepareDraftPrFromAnalysis(analysis, body.classification)

  if (!prSummary) {
    return NextResponse.json(
      sanitiseFounderPayload({ success: false, message: 'No failure groups to prepare PR for.' }),
      { status: 400 }
    )
  }

  void recordOrbQualityAgentAudit({
    user: founderActor(session),
    runId: targetRun.id,
    action: 'prepare_pr',
    failureClassification: body.classification ?? analysis.failureGroups[0]?.classification,
    generatedPlan: prSummary.body.slice(0, 500),
    testsRequested: [...prSummary.body.match(/npm run \S+/g) ?? []],
    metadata: { branchName: prSummary.branchName, title: prSummary.title }
  })

  return NextResponse.json(
    sanitiseFounderPayload({
      success: true,
      data: {
        prSummary,
        message:
          'Draft PR prepared. Founder must review and approve before merge. Auto-merge is not permitted.',
        autoMergeAllowed: false
      }
    })
  )
}

export async function handleQualityAgentAuditGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const records = listOrbQualityAgentAuditRecords(100)

  return NextResponse.json(
    sanitiseFounderPayload({
      success: true,
      data: { records, count: records.length }
    })
  )
}
