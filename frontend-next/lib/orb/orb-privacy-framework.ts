/**
 * Shared ORB privacy-first framework — principles, boundaries and truthful claims.
 * Re-exports residential safety copy; do not duplicate safeguarding or adult-review text.
 */

import { ORB_COMPOSER_UPLOAD_BOUNDARY_LINES } from './orb-composer-attachments.ts'
import {
  ORB_ADULT_REVIEW_REQUIRED_COPY,
  ORB_ADULT_REMAINS_RESPONSIBLE_COPY,
  ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY,
  ORB_FOLLOW_SAFEGUARDING_COPY,
  ORB_MINIMAL_IDENTIFIABLE_INFO_COPY,
  ORB_NOT_FOR_EMERGENCIES_COPY,
  ORB_RESIDENTIAL_PRIVACY_GUIDANCE_ITEMS,
  ORB_RESIDENTIAL_PRIVACY_STRIP,
  ORB_SUPPORTS_PROFESSIONAL_JUDGEMENT_COPY
} from './orb-residential-safety-copy.ts'

export {
  ORB_ADULT_REVIEW_REQUIRED_COPY,
  ORB_ADULT_REMAINS_RESPONSIBLE_COPY,
  ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY,
  ORB_FOLLOW_SAFEGUARDING_COPY,
  ORB_MINIMAL_IDENTIFIABLE_INFO_COPY,
  ORB_NOT_FOR_EMERGENCIES_COPY,
  ORB_RESIDENTIAL_PRIVACY_GUIDANCE_ITEMS,
  ORB_RESIDENTIAL_PRIVACY_STRIP,
  ORB_SUPPORTS_PROFESSIONAL_JUDGEMENT_COPY
}

/** Core privacy-first principles for ORB Residential. */
export const ORB_PRIVACY_PRINCIPLES = [
  {
    id: 'authorised_use',
    title: 'Only use information you are authorised to use',
    copy: ORB_COMPOSER_UPLOAD_BOUNDARY_LINES[0]
  },
  {
    id: 'data_minimisation',
    title: 'Avoid unnecessary identifiable information',
    copy: ORB_MINIMAL_IDENTIFIABLE_INFO_COPY
  },
  {
    id: 'child_central',
    title: 'Keep the child central',
    copy: 'Focus on observable facts, the child’s voice and professional accountability.'
  },
  {
    id: 'adult_review',
    title: 'Adult review before copying, saving or sharing',
    copy: ORB_ADULT_REVIEW_REQUIRED_COPY
  },
  {
    id: 'safeguarding_boundary',
    title: 'ORB supports professional judgement',
    copy: ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY
  },
  {
    id: 'user_controls',
    title: 'You control uploads, documents and context',
    copy: 'Uploaded documents are used only when you attach or select them. Saved outputs stay under your control.'
  },
  {
    id: 'source_labelling',
    title: 'ORB shows sources where available',
    copy: 'Source shown where available.'
  },
  {
    id: 'truthful_security',
    title: 'Truthful about encryption and processing',
    copy: 'Protected in transit and governed by privacy controls. ORB does not claim end-to-end encryption unless implemented.'
  }
] as const

export const ORB_UPLOAD_BOUNDARY_COPY = ORB_COMPOSER_UPLOAD_BOUNDARY_LINES

export const ORB_APP_PERMISSIONS_PRINCIPLES =
  'ORB asks for browser permissions only when you choose a feature that needs them. You can always type instead.'

export const ORB_PERSONAL_CONTEXT_GUIDANCE =
  'Personal context helps ORB remember your preferences and the way you use ORB. Do not use it for unnecessary child-identifiable information.'

export const ORB_SEARCH_SOURCE_GUIDANCE =
  'Search stays within the surface you are viewing. ORB does not search live IndiCare OS records from ORB Residential.'

/** Short privacy strips for surfaces across the app. */
export const ORB_PRIVACY_SURFACE_COPY = {
  upload: 'Only upload information you are authorised to use.',
  adultReview: 'Adult review required.',
  source: 'Source shown where available.',
  browserPermission: 'Browser permission required.',
  safeguarding: 'Follow local safeguarding procedures.'
} as const

export const ORB_PRIVACY_GUIDANCE_TITLE = 'Privacy & responsibility'

export type OrbPrivacyReturnOrigin = 'composer' | 'tools_menu' | 'settings' | 'account'

export function orbPrivacyCloseLabel(origin: OrbPrivacyReturnOrigin): string {
  switch (origin) {
    case 'settings':
      return 'Back to settings'
    case 'account':
      return 'Back to account'
    case 'tools_menu':
    case 'composer':
    default:
      return 'Back to ORB'
  }
}
