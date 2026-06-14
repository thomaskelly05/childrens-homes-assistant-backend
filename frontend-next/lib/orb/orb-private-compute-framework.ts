/**
 * Truthful ORB private compute architecture — roadmap and safe public copy.
 * Do not claim Apple Private Cloud Compute, E2EE AI, or full on-device processing unless implemented.
 */

export type OrbPrivateComputeStatus = 'implemented' | 'partial' | 'roadmap' | 'not_implemented' | 'not_claimable'

export type OrbPrivateComputeCapability = {
  id: string
  label: string
  status: OrbPrivateComputeStatus
  summary: string
  adultControlRequired?: boolean
}

export const deviceFirstPrinciple =
  'ORB keeps work local where possible and only uses cloud intelligence when needed to support the task.'

export const localOnlyWherePossible =
  'Settings, drafts, and browser-held preferences stay on this device unless you choose to upload or sync.'

export const cloudOnlyWhenNeeded =
  'ORB reasoning, document analysis, and voice transport may require secure cloud processing when the task needs it.'

export const adultControlledContext =
  'Adults remain in control of what is uploaded, used, saved, or exported from ORB Residential.'

export const noUnnecessaryIdentifiers =
  'Avoid unnecessary identifiable information in prompts, uploads, and saved outputs unless required for the task.'

export const ephemeralProcessingGoal =
  'Where feasible, processing should be scoped to the task and not retained beyond what you choose to save.'

export const sourceTransparency = 'ORB shows sources where available and labels generated content for review.'

export const clearRetentionControls =
  'You can review saved outputs, exports, and privacy settings; retention follows your choices and product policy.'

export const noTrainingOnPrivateRecords =
  'Private residential records are not used to train shared models unless explicitly documented, consented, and implemented.'

export const safePublicCopy =
  'ORB keeps work local where possible and only uses cloud intelligence when needed to support the task. Adults remain in control of what is uploaded, used, saved or exported.'

export const unsafeClaims = [
  'Everything stays on device',
  'Apple Private Compute',
  'Apple Private Cloud Compute',
  'End-to-end encrypted AI',
  'Zero-knowledge AI',
  'Fully on-device AI',
  'Nothing leaves your device'
] as const

export type OrbUnsafeClaim = (typeof unsafeClaims)[number]

export const privateComputeRoadmap: OrbPrivateComputeCapability[] = [
  {
    id: 'on_device_settings',
    label: 'On-device / local settings',
    status: 'implemented',
    summary: 'Appearance, accessibility, sidebar, and local UI preferences are stored in the browser.'
  },
  {
    id: 'local_draft_storage',
    label: 'Local draft storage',
    status: 'partial',
    summary: 'Composer drafts and some workspace state are held locally; signed-in sync may use the server where enabled.'
  },
  {
    id: 'upload_on_user_action',
    label: 'Uploaded documents processed on user action',
    status: 'implemented',
    summary: 'Documents and images are processed when you attach or upload them — not silently in the background.',
    adultControlRequired: true
  },
  {
    id: 'orb_brain_cloud',
    label: 'ORB brain / reasoning',
    status: 'implemented',
    summary: 'Chat answers, analysis, and most ORB intelligence require secure cloud reasoning.',
    adultControlRequired: true
  },
  {
    id: 'voice_transport_cloud',
    label: 'Live ORB Voice transport',
    status: 'partial',
    summary: 'Live voice conversation may use cloud realtime transport when configured; browser speech is optional.',
    adultControlRequired: true
  },
  {
    id: 'private_compute_enclave',
    label: 'Private compute enclave equivalent',
    status: 'not_implemented',
    summary: 'No dedicated secure enclave for ORB reasoning on device or in a vendor private cloud today.'
  },
  {
    id: 'apple_private_cloud_compute',
    label: 'Apple Private Cloud Compute equivalent',
    status: 'not_claimable',
    summary: 'ORB does not claim Apple Private Cloud Compute parity.'
  },
  {
    id: 'everything_on_device',
    label: 'Everything stays on device',
    status: 'not_claimable',
    summary: 'Not true today — cloud reasoning is required for most ORB tasks.'
  },
  {
    id: 'e2ee_ai_processing',
    label: 'End-to-end encrypted AI processing',
    status: 'not_claimable',
    summary: 'Not implemented for ORB reasoning or voice transport.'
  },
  {
    id: 'local_model_inference',
    label: 'Local model inference',
    status: 'roadmap',
    summary: 'On-device inference may expand for narrow tasks; cloud remains required for full ORB brain today.'
  }
]

export function isUnsafePublicClaim(text: string): boolean {
  const normalised = text.trim().toLowerCase()
  if (!normalised) return false
  return unsafeClaims.some((claim) => normalised.includes(claim.toLowerCase()))
}

export function assertSafePublicCopy(text: string): string {
  if (isUnsafePublicClaim(text)) {
    throw new Error(`Unsafe public privacy claim: ${text}`)
  }
  return text
}

export function privateComputeStatusFor(id: string): OrbPrivateComputeStatus | undefined {
  return privateComputeRoadmap.find((item) => item.id === id)?.status
}

export function highSensitivityRequiresAdultControl(id: string): boolean {
  const item = privateComputeRoadmap.find((entry) => entry.id === id)
  return Boolean(item?.adultControlRequired)
}

export function canClaimLocalFirstPublicly(): boolean {
  return !isUnsafePublicClaim(safePublicCopy)
}
