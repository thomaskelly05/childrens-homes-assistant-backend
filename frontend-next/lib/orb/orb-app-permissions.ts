/**
 * ORB app permissions model — reflects real browser and account permissions.
 * Not fake OS toggles; browser-controlled permissions show status only.
 */

export type OrbAppPermissionStatus =
  | 'allowed'
  | 'ask_each_time'
  | 'browser_controlled'
  | 'not_available'
  | 'not_connected'

export type OrbAppPermissionCategory = 'app' | 'data' | 'security' | 'responsibility'

export type OrbAppPermission = {
  id: string
  label: string
  description: string
  whyOrbAsks: string
  userControl: string
  browserPermission: boolean
  dataSensitivity: 'low' | 'medium' | 'high'
  category: OrbAppPermissionCategory
  safeFallback: string
  settingsSectionId?: string
}

export const ORB_APP_PERMISSIONS: OrbAppPermission[] = [
  {
    id: 'microphone',
    label: 'Microphone',
    description: 'Used for Voice and Dictate.',
    whyOrbAsks: 'ORB needs microphone access when you start Voice or Dictate.',
    userControl: 'You stay in control and can type instead.',
    browserPermission: true,
    dataSensitivity: 'high',
    category: 'app',
    safeFallback: 'Type your message or use Dictate when the browser allows.'
  },
  {
    id: 'camera',
    label: 'Camera',
    description: 'Used only when you choose to take a photo.',
    whyOrbAsks: 'ORB opens the camera only when you tap Camera in the composer.',
    userControl: 'You choose each time from the plus menu.',
    browserPermission: true,
    dataSensitivity: 'high',
    category: 'app',
    safeFallback: 'Use Photos or Files instead.'
  },
  {
    id: 'photos_files',
    label: 'Files & documents',
    description: 'Used only when you upload or attach a file.',
    whyOrbAsks: 'ORB reads files you select to support drafting and review.',
    userControl: 'Nothing is uploaded until you choose a file.',
    browserPermission: true,
    dataSensitivity: 'high',
    category: 'app',
    safeFallback: 'Type or paste text instead of attaching.'
  },
  {
    id: 'voice',
    label: 'Voice',
    description: 'Live conversational support with transcripts.',
    whyOrbAsks: 'Voice uses your microphone and may create transcripts for drafting.',
    userControl: 'Turn off voice input in Settings → Voice.',
    browserPermission: true,
    dataSensitivity: 'high',
    category: 'app',
    safeFallback: 'Use Chat or Dictate with typing.',
    settingsSectionId: 'voice'
  },
  {
    id: 'dictate',
    label: 'Dictate',
    description: 'Speech-to-text for structured records.',
    whyOrbAsks: 'Dictate uses speech recognition when you open the Dictate station.',
    userControl: 'You can type in Dictate instead.',
    browserPermission: true,
    dataSensitivity: 'high',
    category: 'app',
    safeFallback: 'Type your notes directly.'
  },
  {
    id: 'saved_outputs',
    label: 'Saved outputs',
    description: 'Outputs you choose to save in your account.',
    whyOrbAsks: 'ORB stores saved outputs so you can review and export them later.',
    userControl: 'You decide what to save, edit or delete.',
    browserPermission: false,
    dataSensitivity: 'medium',
    category: 'data',
    safeFallback: 'Copy text without saving.'
  },
  {
    id: 'personal_context',
    label: 'Personal context',
    description: 'Preferences and workflow context in your account.',
    whyOrbAsks: 'ORB uses your profile, preferences and selected context to be more useful.',
    userControl: 'Use temporary chat or clear local memory in Settings.',
    browserPermission: false,
    dataSensitivity: 'medium',
    category: 'data',
    safeFallback: 'Start a temporary chat that skips saved profile context.'
  },
  {
    id: 'search',
    label: 'Search',
    description: 'Find chats, outputs, templates and documents.',
    whyOrbAsks: 'Search filters content within the surface you are viewing.',
    userControl: 'Search does not access live IndiCare OS records.',
    browserPermission: false,
    dataSensitivity: 'low',
    category: 'data',
    safeFallback: 'Browse lists manually.'
  },
  {
    id: 'billing',
    label: 'Billing & subscription',
    description: 'Plan status and payment through Stripe.',
    whyOrbAsks: 'ORB checks subscription status to enable paid features.',
    userControl: 'Manage billing in Settings → Account & Billing.',
    browserPermission: false,
    dataSensitivity: 'medium',
    category: 'security',
    safeFallback: 'Contact support for billing help.',
    settingsSectionId: 'account_billing'
  },
  {
    id: 'sign_in_security',
    label: 'Sign-in security',
    description: 'Password, OAuth, passkeys and MFA.',
    whyOrbAsks: 'ORB protects your account with standard sign-in controls.',
    userControl: 'Add passkeys or use your organisation sign-in.',
    browserPermission: false,
    dataSensitivity: 'high',
    category: 'security',
    safeFallback: 'Sign in with email and password.'
  }
]

export function getOrbAppPermission(id: string): OrbAppPermission | undefined {
  return ORB_APP_PERMISSIONS.find((item) => item.id === id)
}

export function orbAppPermissionsByCategory(category: OrbAppPermissionCategory): OrbAppPermission[] {
  return ORB_APP_PERMISSIONS.filter((item) => item.category === category)
}

/** Labels for UI status display — never pretend to toggle browser permissions. */
export function orbAppPermissionStatusLabel(status: OrbAppPermissionStatus): string {
  switch (status) {
    case 'allowed':
      return 'Allowed'
    case 'ask_each_time':
      return 'Ask each time'
    case 'browser_controlled':
      return 'Browser controlled'
    case 'not_available':
      return 'Not available'
    case 'not_connected':
      return 'Not connected'
    default:
      return 'Unknown'
  }
}
