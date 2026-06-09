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

export async function hydrateAllFounderPersistence(): Promise<void> {
  await Promise.all([
    hydrateActionsFromPersistence(),
    hydrateApprovalsFromPersistence(),
    hydrateContentFromPersistence(),
    hydrateBuildBriefsFromPersistence(),
    hydrateQualityRunsFromPersistence(),
    hydrateQualityProposalsFromPersistence(),
    hydrateExpertReviewsFromPersistence()
  ])
}
