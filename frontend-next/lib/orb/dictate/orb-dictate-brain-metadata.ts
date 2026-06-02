import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

export type OrbDictateBrainMetadata = {
  surface?: string
  product: string
  powered_by: string
  brain: string
  feature: string
  standalone: boolean
  os_records_accessed: boolean
  live_record_access: boolean
  output_type: OrbDictateNoteType | string
  mode?: string
  lens?: string
}

export const ORB_DICTATE_BRAIN_PRODUCT = 'ORB Residential'
export const ORB_DICTATE_BRAIN_POWERED_BY = 'IndiCare Intelligence'
export const ORB_DICTATE_BRAIN_ID = 'orb_residential_intelligence'

export function buildLocalDictateBrainMetadata(noteType: OrbDictateNoteType): OrbDictateBrainMetadata {
  return {
    surface: 'orb_standalone',
    product: ORB_DICTATE_BRAIN_PRODUCT,
    powered_by: ORB_DICTATE_BRAIN_POWERED_BY,
    brain: ORB_DICTATE_BRAIN_ID,
    feature: 'dictate',
    standalone: true,
    os_records_accessed: false,
    live_record_access: false,
    output_type: noteType,
    mode: noteType,
    lens: noteType
  }
}

export function assertDictateBrainMetadata(meta: OrbDictateBrainMetadata | null | undefined): boolean {
  if (!meta) return false
  return (
    meta.product === ORB_DICTATE_BRAIN_PRODUCT &&
    meta.powered_by === ORB_DICTATE_BRAIN_POWERED_BY &&
    meta.brain === ORB_DICTATE_BRAIN_ID &&
    meta.feature === 'dictate' &&
    meta.standalone === true &&
    meta.os_records_accessed === false &&
    meta.live_record_access === false &&
    Boolean(meta.output_type)
  )
}
