import type { OrbOfficialGuidanceEntry } from '@/lib/orb/knowledge/orb-knowledge-library-types'

/** Curated official guidance metadata — links only, no copied statutory text. */
export const ORB_OFFICIAL_GUIDANCE_ENTRIES: readonly OrbOfficialGuidanceEntry[] = [
  {
    id: 'official-childrens-homes-regulations-2015',
    title: "Children's Homes Regulations 2015",
    source_type: 'statutory',
    publisher: 'UK legislation (legislation.gov.uk)',
    jurisdiction: 'England',
    url: 'https://www.legislation.gov.uk/uksi/2015/541/contents',
    last_checked_at: '2026-06-01',
    approval_status: 'approved',
    related_record_type_ids: ['reg_44_evidence_summary', 'reg_45_reflection', 'manager_oversight_note'],
    related_topics: ['regulation', 'quality standards', 'oversight'],
    metadata_only: true
  },
  {
    id: 'official-quality-standards-guide',
    title: "Guide to the Children's Homes Regulations, including the Quality Standards",
    source_type: 'official',
    publisher: 'Department for Education',
    jurisdiction: 'England',
    url: 'https://www.gov.uk/government/publications/childrens-homes-regulations-guide',
    last_checked_at: '2026-06-01',
    approval_status: 'approved',
    related_record_type_ids: ['reg_44_evidence_summary', 'reg_45_reflection', 'daily_record'],
    related_topics: ['quality standards', 'care planning', 'leadership'],
    metadata_only: true
  },
  {
    id: 'official-ofsted-sccif-childrens-homes',
    title: "Ofsted SCCIF: children's homes",
    source_type: 'inspection_framework',
    publisher: 'Ofsted',
    jurisdiction: 'England',
    url: 'https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes',
    last_checked_at: '2026-06-01',
    approval_status: 'approved',
    related_record_type_ids: ['reg_44_evidence_summary', 'incident_report', 'safeguarding_concern'],
    related_topics: ['inspection', 'SCCIF', 'quality of care'],
    metadata_only: true
  },
  {
    id: 'official-working-together',
    title: 'Working Together to Safeguard Children',
    source_type: 'statutory',
    publisher: 'HM Government / Department for Education',
    jurisdiction: 'England',
    url: 'https://www.gov.uk/government/publications/working-together-to-safeguard-children--2',
    last_checked_at: '2026-06-01',
    approval_status: 'approved',
    related_record_type_ids: ['safeguarding_concern', 'missing_from_home_record', 'lado_referral_preparation'],
    related_topics: ['safeguarding', 'multi-agency', 'LADO'],
    metadata_only: true
  },
  {
    id: 'official-kcsie',
    title: 'Keeping Children Safe in Education (where relevant to residential settings)',
    source_type: 'statutory',
    publisher: 'Department for Education',
    jurisdiction: 'England',
    url: 'https://www.gov.uk/government/publications/keeping-children-safe-in-education--2',
    last_checked_at: '2026-06-01',
    approval_status: 'approved',
    related_record_type_ids: ['safeguarding_concern', 'education_health_update'],
    related_topics: ['education', 'safeguarding', 'online safety'],
    metadata_only: true
  },
  {
    id: 'official-care-planning-statutory-guidance',
    title: 'Care planning, placement and case review statutory guidance',
    source_type: 'statutory',
    publisher: 'Department for Education',
    jurisdiction: 'England',
    url: 'https://www.gov.uk/government/publications/care-planning-placement-and-case-review',
    last_checked_at: '2026-06-01',
    approval_status: 'approved',
    related_record_type_ids: ['care_plan_review', 'placement_planning_note', 'keywork_summary'],
    related_topics: ['care planning', 'placement', 'reviews'],
    metadata_only: true
  }
] as const

export function officialGuidanceForRecordType(recordTypeId: string): OrbOfficialGuidanceEntry[] {
  return ORB_OFFICIAL_GUIDANCE_ENTRIES.filter((e) =>
    e.related_record_type_ids.includes(recordTypeId)
  )
}
