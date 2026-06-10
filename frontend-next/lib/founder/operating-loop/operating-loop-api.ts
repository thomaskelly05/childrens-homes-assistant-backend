import { NextResponse } from 'next/server'

import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'
import { operatingLoopRepository } from '@/lib/founder/persistence'
import type { FounderOperatingLoopRunRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { requireFounderSession } from '@/lib/founder/persistence/founder-api-handler'
import {
  getOperatingLoopRun,
  getOperatingLoopRuns,
  hydrateOperatingLoopRunsFromPersistence
} from './operating-loop-store'
import { runFounderOperatingLoop } from './founder-operating-loop'
import type { FounderOperatingLoopPlan } from './operating-loop-types'
import { FULL_OPERATING_LOOP_PLAN } from './operating-loop-types'

function recordToRun(record: FounderOperatingLoopRunRecord) {
  return record.run ?? null
}

export async function handleOperatingLoopRunPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { plan?: Partial<FounderOperatingLoopPlan> }
  const plan: FounderOperatingLoopPlan = {
    ...FULL_OPERATING_LOOP_PLAN,
    ...(body.plan ?? {})
  }

  const triggeredBy = session.user.email ?? 'founder'
  const result = await runFounderOperatingLoop(plan, triggeredBy)
  return NextResponse.json(sanitiseFounderPayload(result))
}

export async function handleOperatingLoopRunsGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  let persisted: FounderOperatingLoopRunRecord[] = []
  try {
    persisted = await operatingLoopRepository.list()
  } catch {
    persisted = []
  }
  hydrateOperatingLoopRunsFromPersistence(persisted)

  const runs =
    getOperatingLoopRuns().length > 0
      ? getOperatingLoopRuns()
      : persisted.map(recordToRun).filter((run): run is NonNullable<typeof run> => Boolean(run))
  return NextResponse.json(sanitiseFounderPayload({ runs }))
}

export async function handleOperatingLoopRunGet(runId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const local = getOperatingLoopRun(runId)
  if (local) {
    return NextResponse.json(sanitiseFounderPayload({ run: local }))
  }

  const record = await operatingLoopRepository.getById(runId)
  if (!record?.run) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ run: record.run }))
}
