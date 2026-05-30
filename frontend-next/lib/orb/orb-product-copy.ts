/** Canonical user-facing copy for ORB Residential — avoid drift across /orb surfaces. */

export const ORB_PRODUCT_NAME = 'ORB Residential'
export const ORB_POWERED_BY = 'Powered by IndiCare'
export const ORB_PRODUCT_FOOTER = 'ORB Residential · © 2026 IndiCare'
export const ORB_DATA_BOUNDARY =
  'ORB Residential does not access IndiCare OS records. It uses your profile, conversation, uploaded documents and IndiCare residential intelligence.'
export const ORB_DATA_BOUNDARY_SHORT = 'ORB Residential does not access IndiCare OS records.'

export const orbProductShell = {
  name: ORB_PRODUCT_NAME,
  poweredBy: ORB_POWERED_BY,
  tagline: 'Ready when you are.',
  footer: ORB_PRODUCT_FOOTER,
  dataBoundary: ORB_DATA_BOUNDARY,
  dataBoundaryShort: ORB_DATA_BOUNDARY_SHORT,
} as const
