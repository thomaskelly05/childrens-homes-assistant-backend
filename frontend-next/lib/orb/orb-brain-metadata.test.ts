import { describe, expect, it } from 'vitest'

import {
  ORB_BRAIN_ID,
  ORB_BRAIN_PRODUCT,
  normalizeOrbBrainMetadata,
  orbBrainIndicatorLabel
} from '@/lib/orb/orb-brain-metadata'

describe('orb-brain-metadata', () => {
  it('normalises nested brain_metadata', () => {
    const meta = normalizeOrbBrainMetadata({
      brain_metadata: {
        surface: 'orb_standalone',
        product: ORB_BRAIN_PRODUCT,
        powered_by: 'IndiCare Intelligence',
        brain: ORB_BRAIN_ID,
        os_records_accessed: false,
        live_record_access: false,
        standalone: true,
        feature: 'conversation'
      }
    })
    expect(meta?.brain).toBe(ORB_BRAIN_ID)
    expect(meta?.feature).toBe('conversation')
  })

  it('builds indicator label', () => {
    const label = orbBrainIndicatorLabel({
      product: ORB_BRAIN_PRODUCT,
      powered_by: 'IndiCare Intelligence',
      brain: ORB_BRAIN_ID
    })
    expect(label).toContain('ORB Residential')
    expect(label).toContain('IndiCare Intelligence')
  })
})
