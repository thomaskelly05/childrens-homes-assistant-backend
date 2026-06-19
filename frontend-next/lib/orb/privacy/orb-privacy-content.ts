import { getOrbDataClassificationGuidance } from './orb-data-classification'
import type {
  OrbDataCategory,
  OrbPrivacyNotice,
  OrbPrivacyNoticeSection,
  OrbRetentionPolicySummary,
  OrbRetentionStatusItem
} from './orb-privacy-types'

export const ORB_PRIVACY_VERSION = '1.0.0-closed-pilot'
export const ORB_PRIVACY_LAST_UPDATED = '2026-06-11'
export const ORB_PRIVACY_CONTACT_EMAIL = 'privacy@indicare.co.uk'
export const ORB_PRIVACY_SUPPORT_EMAIL = 'support@indicare.co.uk'

const RETENTION_FINALISING =
  'Retention controls are being finalised for closed pilot. Data is stored as described below until automated controls are in place.'

export function buildOrbDataCategories(): OrbDataCategory[] {
  return [
    {
      id: 'chat',
      name: 'ORB Chat prompts and responses',
      description: 'Messages you type and ORB answers during chat sessions.',
      examples: ['Practice questions', 'Draft wording', 'Safeguarding reflection prompts'],
      stored: true,
      storageLocation: 'Browser localStorage (orb-standalone-workspace-v2); usage metadata in PostgreSQL (orb_usage_events)',
      mayContainChildData: true,
      retentionPeriod: 'User-controlled on device; no server-side chat archive. Usage metadata has no automated expiry.',
      deletionAvailable: false,
      exportAvailable: true,
      riskLevel: 'medium',
      classification: 'amber',
      userGuidance: 'Avoid unnecessary identifiable information. Use anonymised or minimal detail.'
    },
    {
      id: 'voice',
      name: 'ORB Voice audio and sessions',
      description: 'Live voice conversation, session metadata and optional transcripts.',
      examples: ['Spoken questions', 'Voice coaching', 'Transcript for drafting'],
      stored: true,
      storageLocation: 'In-process/Redis session store (TTL ~2 hours); optional save to orb_saved_outputs or local fallback',
      mayContainChildData: true,
      retentionPeriod: 'Raw audio is not stored by default. Session data expires after ~2 hours. Saved transcripts follow saved-output rules.',
      deletionAvailable: false,
      exportAvailable: true,
      riskLevel: 'medium',
      classification: 'amber',
      userGuidance: 'Do not use ORB Voice for emergencies. Follow local safeguarding procedures.'
    },
    {
      id: 'dictate',
      name: 'ORB Dictate audio and transcripts',
      description: 'Uploaded or recorded audio, transcripts and generated professional notes.',
      examples: ['Meeting notes', 'Handover dictation', 'Shift reflection'],
      stored: true,
      storageLocation: 'Temp disk (_tmp_dictate_uploads, deleted after transcribe); browser drafts (orb-dictate-drafts); optional orb_saved_outputs',
      mayContainChildData: true,
      retentionPeriod: 'Upload audio is ephemeral. Browser drafts capped at 20. Saved outputs are user-controlled.',
      deletionAvailable: true,
      exportAvailable: true,
      riskLevel: 'high',
      classification: 'amber',
      userGuidance: 'Check the final record before use. You remain responsible for accuracy and escalation.'
    },
    {
      id: 'write_drafts',
      name: 'ORB Write drafts',
      description: 'Rough text, generated bodies and version history in Write.',
      examples: ['Record drafts', 'Improved wording', 'Template-filled documents'],
      stored: true,
      storageLocation: 'Browser localStorage (orb-write-local-draft-v1)',
      mayContainChildData: true,
      retentionPeriod: 'User-controlled on device until cleared.',
      deletionAvailable: true,
      exportAvailable: true,
      riskLevel: 'medium',
      classification: 'amber',
      userGuidance: 'Verify accuracy before saving or exporting. Behaviour is communication; keep the child’s voice central.'
    },
    {
      id: 'saved_outputs',
      name: 'Saved outputs',
      description: 'Documents and notes you explicitly save in ORB.',
      examples: ['Saved transcripts', 'Generated reports', 'Exported reflections'],
      stored: true,
      storageLocation: 'PostgreSQL (orb_saved_outputs) with browser fallback (orb-saved-outputs-local)',
      mayContainChildData: true,
      retentionPeriod: 'User-controlled. No automated purge is implemented yet.',
      deletionAvailable: true,
      exportAvailable: true,
      riskLevel: 'high',
      classification: 'red',
      userGuidance: 'Only save what you need. Treat saved outputs as sensitive documents.'
    },
    {
      id: 'projects',
      name: 'Projects and project memory',
      description: 'Project titles, descriptions, pinned memory and linked chat IDs.',
      examples: ['Inspection prep project', 'Pinned context for a home'],
      stored: true,
      storageLocation: 'PostgreSQL (orb_projects, orb_project_chats) and browser workspace mirror',
      mayContainChildData: true,
      retentionPeriod: 'Indefinite until user deletes. Chat bodies remain on device.',
      deletionAvailable: true,
      exportAvailable: false,
      riskLevel: 'medium',
      classification: 'amber',
      userGuidance: 'Keep project memory minimal and non-identifying where possible.'
    },
    {
      id: 'templates',
      name: 'Templates',
      description: 'Built-in template definitions and filled content at generation time.',
      examples: ['Safeguarding reflection', 'Shift handover', 'Missing from care conversation'],
      stored: false,
      storageLocation: 'Static registry in code; user-filled content only if saved as output',
      mayContainChildData: false,
      retentionPeriod: 'Template definitions are static. Generated content is ephemeral unless saved.',
      deletionAvailable: false,
      exportAvailable: true,
      riskLevel: 'low',
      classification: 'green',
      userGuidance: 'Use anonymised examples when trying templates.'
    },
    {
      id: 'exports',
      name: 'Exports and PDFs',
      description: 'Files generated when you export or print from ORB.',
      examples: ['PDF export', 'DOCX export', 'Print view'],
      stored: false,
      storageLocation: 'Downloaded to your device; server temp files are ephemeral',
      mayContainChildData: true,
      retentionPeriod: 'Not stored by ORB after download. Server temp export files are short-lived.',
      deletionAvailable: false,
      exportAvailable: true,
      riskLevel: 'high',
      classification: 'red',
      userGuidance: 'Store and share exports according to your organisation’s information governance policy.'
    },
    {
      id: 'telemetry',
      name: 'Telemetry and anonymised usage data',
      description: 'Operational event metadata for product improvement and billing analytics.',
      examples: ['Mode used', 'Feature started', 'Latency and token counts'],
      stored: true,
      storageLocation: 'PostgreSQL (founder_os_telemetry_events, orb_usage_events); capped browser buffers',
      mayContainChildData: false,
      retentionPeriod: 'No automated TTL. Queries typically use last 30–90 days.',
      deletionAvailable: false,
      exportAvailable: false,
      riskLevel: 'low',
      classification: 'green',
      userGuidance: 'ORB does not store full prompts, transcripts or safeguarding narratives in telemetry.'
    },
    {
      id: 'billing',
      name: 'Billing and subscription metadata',
      description: 'Account, plan, trial and Stripe subscription identifiers.',
      examples: ['Email', 'Plan tier', 'Trial dates', 'Stripe customer ID'],
      stored: true,
      storageLocation: 'PostgreSQL (users, orb_subscriptions, orb_trials, orb_stripe_events)',
      mayContainChildData: false,
      retentionPeriod: 'Retained for billing and legal obligations. Stripe holds payment instruments.',
      deletionAvailable: false,
      exportAvailable: false,
      riskLevel: 'low',
      classification: 'green',
      userGuidance: 'Manage payment details through the Stripe customer portal.'
    },
    {
      id: 'account',
      name: 'Account, user and session data',
      description: 'Sign-in credentials, session cookies, preferences and safety acceptance.',
      examples: ['Email', 'MFA/passkeys', 'ORB preferences', 'Safety acceptance version'],
      stored: true,
      storageLocation: 'PostgreSQL (users, orb_user_preferences, orb_safety_acceptances); HTTP-only session cookies',
      mayContainChildData: false,
      retentionPeriod: 'Retained while account is active. Some local prefs may remain after sign-out.',
      deletionAvailable: false,
      exportAvailable: false,
      riskLevel: 'medium',
      classification: 'green',
      userGuidance: 'Sign out on shared devices. Contact support for account questions.'
    }
  ]
}

export function buildOrbRetentionPolicySummary(): OrbRetentionPolicySummary {
  return {
    audioRetention:
      'Dictate upload audio is deleted after transcription. Voice raw audio is not stored by default. Session audio processing is ephemeral.',
    transcriptRetention:
      'Voice and Dictate transcripts stay in the active session unless you save them. Saved transcripts follow saved-output retention. Retention controls are being finalised for closed pilot.',
    draftRetention:
      'Write and Dictate drafts are stored in your browser until you clear them or save elsewhere. No server-side draft archive for standalone ORB.',
    savedOutputRetention:
      'Saved outputs remain until you delete them. There is no automated expiry job yet. Retention controls are being finalised for closed pilot.',
    telemetryRetention:
      'Telemetry stores redacted metadata only (mode, route, counts). No full prompts or transcripts. No automated purge is implemented yet.',
    billingRetention:
      'Subscription and Stripe metadata are retained for billing and audit. Payment card details are held by Stripe.',
    deletionRequestProcess:
      'Self-service deletion is not yet available. Submit a privacy request at /orb/privacy/requests or email privacy@indicare.co.uk. Requests are reviewed manually.',
    exportRequestProcess:
      'You can export workspace JSON from ORB settings. A full data export is not yet self-service — submit a privacy request for manual review.',
    limitations: [
      RETENTION_FINALISING,
      'ORB Residential does not access IndiCare OS care records unless you separately use operational ORB within IndiCare OS.',
      'Feedback submissions may store trimmed question/answer snapshots (up to ~6,000 characters) for quality review.',
      'Deleting a Dictate note does not remove copies already saved to Records & Drafts.',
      'No automated account erasure endpoint is available in this pilot build.'
    ]
  }
}

export function buildOrbRetentionStatusItems(): OrbRetentionStatusItem[] {
  return [
    {
      id: 'audio',
      label: 'Audio',
      status: 'Stored while session active',
      detail: 'Raw audio is not retained after processing. Dictate uploads are deleted after transcription.'
    },
    {
      id: 'transcripts',
      label: 'Transcripts',
      status: 'Retention controls being finalised',
      detail: 'Session transcripts expire with the session unless saved. Saved copies follow saved-output rules.'
    },
    {
      id: 'drafts',
      label: 'Drafts',
      status: 'Active',
      detail: 'Write and Dictate drafts live in your browser until you clear or save them.'
    },
    {
      id: 'saved_outputs',
      label: 'Saved outputs',
      status: 'Retention controls being finalised',
      detail: 'Stored until you delete them. No automated expiry is enforced yet.'
    },
    {
      id: 'telemetry',
      label: 'Telemetry',
      status: 'Active',
      detail: 'Redacted metadata only — no full prompts, transcripts or safeguarding narratives.'
    },
    {
      id: 'billing',
      label: 'Billing metadata',
      status: 'Active',
      detail: 'Plan, trial and Stripe identifiers retained for billing. Card details held by Stripe.'
    },
    {
      id: 'deletion',
      label: 'Deletion requests',
      status: 'Not yet self-service',
      detail: 'Submit a request at /orb/privacy/requests. Reviewed manually in line with pilot terms.'
    }
  ]
}

function section(id: string, title: string, body: string[]): OrbPrivacyNoticeSection {
  return { id, title, body }
}

export function buildOrbPrivacyNotice(): OrbPrivacyNotice {
  const classification = getOrbDataClassificationGuidance()
  const retention = buildOrbRetentionPolicySummary()
  const categories = buildOrbDataCategories()

  return {
    id: 'orb-residential-privacy-v1',
    title: 'ORB Privacy & Data Handling',
    summary:
      'ORB Residential is a support tool for adults working in children’s residential care. It helps with practice questions, drafting and reflection. It does not replace professional judgement, safeguarding procedures or your organisation’s recording systems.',
    sections: [
      section('quick-summary', 'Quick summary', [
        'ORB stores what you type, upload, dictate, save or submit as feedback.',
        'Most chat history stays on your device — ORB does not keep a full server-side chat archive.',
        'Avoid unnecessary child-identifiable information. Use Green, Amber and Red guidance below.',
        'Emergency safeguarding concerns must be escalated through your usual procedures — not through ORB.',
        RETENTION_FINALISING
      ]),
      section('classification', 'Data classification: Green / Amber / Red', [
        classification.green.label,
        classification.green.summary,
        `Examples: ${classification.green.examples.join('; ')}.`,
        classification.amber.label,
        classification.amber.summary,
        `Examples: ${classification.amber.examples.join('; ')}.`,
        classification.red.label,
        classification.red.summary,
        `Examples: ${classification.red.examples.join('; ')}.`,
        classification.behaviourIsCommunication,
        classification.childVoiceCentral
      ]),
      section('what-stored', 'What ORB stores', categories.filter((c) => c.stored).map((c) => `${c.name}: ${c.storageLocation}`)),
      section('what-not-stored', 'What ORB does not store', [
        'IndiCare OS live care records (standalone ORB does not access them).',
        'Raw voice audio by default.',
        'Full chat transcripts on the server.',
        'Child profiles linked to IndiCare OS young people.',
        'Automated safeguarding case records.'
      ]),
      section('audio-voice', 'Audio and voice handling', [
        retention.audioRetention,
        'Voice sessions may create transcripts for drafting and support. Do not use ORB for emergencies.',
        'Transcripts can be saved to Records & Drafts if you choose.'
      ]),
      section('dictate', 'Dictate transcript handling', [
        retention.transcriptRetention,
        'Upload audio is processed and deleted from server temp storage.',
        'You remain responsible for checking accuracy before use.'
      ]),
      section('drafts-outputs', 'Drafts and saved outputs', [
        retention.draftRetention,
        retention.savedOutputRetention,
        'ORB may help draft records, but staff remain responsible for checking accuracy.'
      ]),
      section('exports', 'Exports and PDFs', [
        'Exports download to your device. ORB does not control how you store them afterwards.',
        'Exported documents may contain sensitive information — follow your organisation’s policy.'
      ]),
      section('telemetry', 'Telemetry and anonymised usage data', [
        retention.telemetryRetention,
        'ORB telemetry does not store child names, staff names, full prompts, full transcripts, safeguarding narratives or generated document text.'
      ]),
      section('billing', 'Billing and subscription data', [retention.billingRetention]),
      section('child-identifiable', 'Child-identifiable information', [
        'Users should avoid entering unnecessary identifiable information.',
        'If child-identifiable content is entered, it may be stored in browser local storage or saved outputs on your device or account.',
        'ORB is not designed to be a system of record for child-level data.'
      ]),
      section('responsibilities', 'Your responsibilities when using ORB', [
        classification.professionalJudgement,
        'Follow your organisation’s safeguarding procedures and local policies.',
        'Check all drafts before saving, exporting or sharing.',
        'Escalate emergency safeguarding concerns through usual channels.',
        classification.behaviourIsCommunication,
        classification.childVoiceCentral
      ]),
      section('deletion', 'Deletion requests', [retention.deletionRequestProcess]),
      section('export-access', 'Export and access requests', [retention.exportRequestProcess]),
      section('closed-pilot', 'Closed pilot data notice', [
        'This build is for closed pilot homes only.',
        'Pilot terms apply alongside this notice.',
        'ORB is support tooling — not a replacement for organisational recording systems unless your provider has explicitly approved it.',
        RETENTION_FINALISING,
        `Contact: ${ORB_PRIVACY_CONTACT_EMAIL} or ${ORB_PRIVACY_SUPPORT_EMAIL}`
      ])
    ],
    lastUpdated: ORB_PRIVACY_LAST_UPDATED,
    version: ORB_PRIVACY_VERSION
  }
}

export function buildOrbClosedPilotPrivacyNoticeMarkdown(): string {
  const notice = buildOrbPrivacyNotice()
  const classification = getOrbDataClassificationGuidance()
  const retention = buildOrbRetentionPolicySummary()

  const lines = [
    '# ORB Residential — Closed Pilot Privacy Notice',
    '',
    `Version ${notice.version} · Last updated ${notice.lastUpdated}`,
    '',
    notice.summary,
    '',
    '## What pilot users can use ORB for',
    '',
    '- Practice questions and reflective support',
    '- Drafting and improving record wording',
    '- Dictate and Voice for hands-free drafting',
    '- Templates, documents and saved outputs you choose to keep',
    '',
    '## Green / Amber / Red data guidance',
    '',
    `**${classification.green.label}** — ${classification.green.summary}`,
    '',
    `**${classification.amber.label}** — ${classification.amber.summary}`,
    '',
    `**${classification.red.label}** — ${classification.red.summary}`,
    '',
    '## What to avoid entering',
    '',
    '- Full child records, chronologies or formal reports',
    '- NHS numbers, full dates of birth, full addresses',
    '- Unnecessary identifiable family information',
    '',
    '## Audio, transcripts and drafts',
    '',
    retention.audioRetention,
    retention.transcriptRetention,
    retention.draftRetention,
    '',
    '## Staff responsibility',
    '',
    classification.professionalJudgement,
    classification.behaviourIsCommunication,
    classification.childVoiceCentral,
    '',
    '## Safeguarding escalation',
    '',
    'Emergency safeguarding concerns must be escalated through your home’s usual safeguarding and emergency procedures. ORB does not replace escalation.',
    '',
    '## Data retention status',
    '',
    ...retention.limitations.map((item) => `- ${item}`),
    '',
    '## Deletion and access requests',
    '',
    retention.deletionRequestProcess,
    retention.exportRequestProcess,
    '',
    '## Who to contact',
    '',
    `- Privacy: ${ORB_PRIVACY_CONTACT_EMAIL}`,
    `- Support: ${ORB_PRIVACY_SUPPORT_EMAIL}`,
    '',
    '## Limitation',
    '',
    'ORB is a support tool, not a replacement for organisational recording systems unless your provider has explicitly approved this use.'
  ]

  return lines.join('\n')
}
