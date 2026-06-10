/**
 * Hydrate founder stores from batched bootstrap on page load.
 */

import { hydrateApprovalsFromPersistence } from '@/lib/founder/approvals/approval-store'
import { hydrateActionsFromPersistence } from '@/lib/founder/actions/founder-action-store'
import { hydrateBuildBriefsFromPersistence } from '@/lib/founder/build-briefs/build-brief-store'
import { hydrateContentFromPersistence } from '@/lib/founder/content/content-draft-store'
import {
  loadFounderBootstrap,
  type FounderBootstrapPayload
} from '@/lib/founder/bootstrap/founder-bootstrap-client'
import { setBootstrapPersistenceCache } from '@/lib/founder/bootstrap/founder-bootstrap-cache'
import { hydrateEvidencePacksFromPersistence } from '@/lib/founder/evidence/evidence-store'
import { hydrateFounderMemoryFromPersistence } from '@/lib/founder/memory/founder-memory-store'
import { operatingLoopRepository } from '@/lib/founder/persistence'
import { hydrateOperatingLoopRunsFromPersistence } from '@/lib/founder/operating-loop/operating-loop-store'
import {
  hydrateExpertReviewsFromPersistence,
  hydrateQualityProposalsFromPersistence,
  hydrateQualityRunsFromPersistence
} from '@/lib/founder/quality-lab/persistence-bridge'
import { seedFounderTelemetrySummary } from '@/lib/founder/telemetry/founder-telemetry-service'

let lastBootstrap: FounderBootstrapPayload | null = null

export function getLastFounderBootstrap(): FounderBootstrapPayload | null {
  return lastBootstrap
}

export async function hydrateAllFounderPersistence(): Promise<FounderBootstrapPayload> {
  const bootstrap = await loadFounderBootstrap()
  lastBootstrap = bootstrap
  setBootstrapPersistenceCache(bootstrap.persistence)

  await Promise.allSettled([
    hydrateActionsFromPersistence(),
    hydrateApprovalsFromPersistence(),
    hydrateContentFromPersistence(),
    hydrateBuildBriefsFromPersistence(),
    hydrateQualityRunsFromPersistence(),
    hydrateQualityProposalsFromPersistence(),
    hydrateExpertReviewsFromPersistence(),
    operatingLoopRepository.list().then((records) => hydrateOperatingLoopRunsFromPersistence(records)).catch(() => undefined),
    hydrateFounderMemoryFromPersistence(),
    hydrateEvidencePacksFromPersistence()
  ])

  if (bootstrap.telemetrySummary) {
    seedFounderTelemetrySummary(bootstrap.telemetrySummary)
  }

  return bootstrap
}
