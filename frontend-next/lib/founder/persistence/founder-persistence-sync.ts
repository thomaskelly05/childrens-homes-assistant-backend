/**
 * Hydrate founder stores from persisted records on page load.
 */

import { hydrateApprovalsFromPersistence } from '@/lib/founder/approvals/approval-store'
import { hydrateActionsFromPersistence } from '@/lib/founder/actions/founder-action-store'
import { hydrateBuildBriefsFromPersistence } from '@/lib/founder/build-briefs/build-brief-store'
import { hydrateContentFromPersistence } from '@/lib/founder/content/content-draft-store'
import {
  hydrateExpertReviewsFromPersistence,
  hydrateQualityProposalsFromPersistence,
  hydrateQualityRunsFromPersistence
} from '@/lib/founder/quality-lab/persistence-bridge'
import { hydrateEvidencePacksFromPersistence } from '@/lib/founder/evidence/evidence-store'
import { hydrateFounderMemoryFromPersistence } from '@/lib/founder/memory/founder-memory-store'
import { hydrateOperatingLoopRunsFromPersistence } from '@/lib/founder/operating-loop/operating-loop-store'
import { operatingLoopRepository } from '@/lib/founder/persistence'

export async function hydrateAllFounderPersistence(): Promise<void> {
  await Promise.all([
    hydrateActionsFromPersistence(),
    hydrateApprovalsFromPersistence(),
    hydrateContentFromPersistence(),
    hydrateBuildBriefsFromPersistence(),
    hydrateQualityRunsFromPersistence(),
    hydrateQualityProposalsFromPersistence(),
    hydrateExpertReviewsFromPersistence(),
    operatingLoopRepository.list().then((records) => hydrateOperatingLoopRunsFromPersistence(records)),
    hydrateFounderMemoryFromPersistence(),
    hydrateEvidencePacksFromPersistence()
  ])
}
