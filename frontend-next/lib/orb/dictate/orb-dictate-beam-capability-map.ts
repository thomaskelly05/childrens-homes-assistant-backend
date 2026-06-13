/**
 * Internal Beam-level capability map for ORB Dictate meeting intelligence.
 * Dev-facing honesty matrix — not marketing copy.
 *
 * ORB Dictate is meeting intelligence for residential children's homes,
 * not generic Beam Notes parity.
 */

export type OrbDictateCapabilityStatus =
  | 'implemented'
  | 'partial'
  | 'foundation'
  | 'missing'
  | 'roadmap'

export type OrbDictateBeamCapability = {
  id: string
  label: string
  status: OrbDictateCapabilityStatus
  userVisible: boolean
  safeToClaimPublicly: boolean
  evidence: string[]
  implementationFiles: string[]
  limitations: string[]
  nextStep: string
  safetyNotes: string[]
}

/** Honest product copy — safe when capability is partial/foundation only where noted. */
export const ORB_DICTATE_SAFE_COPY = {
  speakerSeparation:
    'ORB can separate speakers where possible.',
  confirmNamesRoles:
    'Confirm names or roles before using them in a record.',
  transcriptAfterProcessing: 'Transcript available after processing.',
  sourceReferences:
    'Source references are shown where transcript turns are available.',
  adultReviewRequired: 'Adult review required.',
  desktopCapture:
    'Record using your microphone or upload audio after a meeting.',
  speakerBoundary:
    'ORB can separate speakers where possible. Confirm names or roles before using them in a record. ORB does not verify identity by voice.'
} as const

export const ORB_DICTATE_CAPTURE_MODE_COPY =
  'Record a meeting, home visit, consultation or shift discussion.'

export const ORB_DICTATE_BEAM_CAPABILITIES: OrbDictateBeamCapability[] = [
  // — Meeting intelligence foundations (implemented) —
  {
    id: 'live_recording',
    label: 'Live microphone recording (web)',
    status: 'implemented',
    userVisible: true,
    safeToClaimPublicly: true,
    evidence: ['MediaRecorder in dictate station', 'Realtime transcription session endpoint'],
    implementationFiles: [
      'frontend-next/components/orb-standalone/orb-dictate-station.tsx',
      'routers/orb_dictate_routes.py',
      'frontend-next/lib/orb/dictate/orb-dictate-realtime.ts'
    ],
    limitations: ['Requires network for transcription', 'Microphone only — no system audio'],
    nextStep: 'None — core path works',
    safetyNotes: ['Consent required for multi-person modes']
  },
  {
    id: 'audio_upload',
    label: 'Post-meeting audio upload transcription',
    status: 'implemented',
    userVisible: true,
    safeToClaimPublicly: true,
    evidence: ['POST /orb/dictate/transcribe/audio', 'Upload UI on mobile and desktop'],
    implementationFiles: [
      'routers/orb_dictate_routes.py',
      'services/orb_dictate_service.py',
      'frontend-next/components/orb-standalone/orb-dictate-mobile-experience.tsx'
    ],
    limitations: ['25MB max', 'Audio deleted after transcription — no persistent replay'],
    nextStep: 'Evaluate diarisation provider when segments become available',
    safetyNotes: ['Upload audio is ephemeral per retention policy']
  },
  {
    id: 'paste_transcript',
    label: 'Paste transcript from Teams/Zoom/Meet',
    status: 'implemented',
    userVisible: true,
    safeToClaimPublicly: true,
    evidence: ['Paste flow in dictate station and mobile', 'text_to_segments heuristic parsing'],
    implementationFiles: [
      'frontend-next/lib/orb/dictate/orb-dictate-speaker.ts',
      'services/orb_dictate_speaker.py'
    ],
    limitations: ['Speaker labels depend on pasted format'],
    nextStep: 'None',
    safetyNotes: ['Pasted content may include third-party meeting metadata — adult review']
  },
  {
    id: 'transcript_segments',
    label: 'Transcript segments with speaker labels',
    status: 'implemented',
    userVisible: true,
    safeToClaimPublicly: true,
    evidence: ['OrbDictateTranscriptSegment model', 'OrbTranscriptPanel', 'mobile speaker labelling'],
    implementationFiles: [
      'schemas/orb_dictate.py',
      'frontend-next/components/orb/dictate/OrbTranscriptPanel.tsx',
      'frontend-next/components/orb/dictate/OrbDictateSpeakerLabelling.tsx'
    ],
    limitations: ['Live capture is often single-stream until processed'],
    nextStep: 'Route diarised provider segments when available',
    safetyNotes: ['Generic Speaker N labels are not identities']
  },
  {
    id: 'manual_speaker_confirmation',
    label: 'Adult-confirmed speaker names and roles',
    status: 'implemented',
    userVisible: true,
    safeToClaimPublicly: true,
    evidence: ['OrbDictateSpeakerLabelling', 'confirmSpeakerLabel', 'build_speakers_from_segments'],
    implementationFiles: [
      'frontend-next/lib/orb/dictate/orb-dictate-speaker-model.ts',
      'services/orb_dictate_speaker.py'
    ],
    limitations: ['Confirmation is manual — no voice biometric verification'],
    nextStep: 'None',
    safetyNotes: ['Never auto-confirm generic Speaker N as a named person']
  },
  {
    id: 'structured_action_points',
    label: 'Structured action points with source references',
    status: 'implemented',
    userVisible: true,
    safeToClaimPublicly: true,
    evidence: ['OrbDictateActionPointsPanel', 'normalize_structured_actions', 'format_segment_source_ref'],
    implementationFiles: [
      'services/orb_dictate_action_points.py',
      'frontend-next/lib/orb/dictate/orb-dictate-action-points.ts',
      'frontend-next/lib/orb/dictate/orb-dictate-source-check.ts'
    ],
    limitations: ['Owner/deadline default to Not stated when missing'],
    nextStep: 'Expand meeting-minutes eval harness',
    safetyNotes: ['Do not invent owners or deadlines']
  },
  {
    id: 'orb_write_handoff',
    label: 'ORB Write handoff after finalise',
    status: 'implemented',
    userVisible: true,
    safeToClaimPublicly: true,
    evidence: ['POST /prepare-write', 'POST /finalise', 'orb-write handoff payload'],
    implementationFiles: [
      'routers/orb_dictate_routes.py',
      'frontend-next/components/orb-standalone/orb-dictate-station.tsx'
    ],
    limitations: ['Handoff is draft — not statutory submission'],
    nextStep: 'None',
    safetyNotes: ['Adult review required before formal use']
  },
  {
    id: 'meeting_record_types',
    label: 'Meeting record types in shared framework',
    status: 'implemented',
    userVisible: true,
    safeToClaimPublicly: true,
    evidence: ['31 record types including meeting_notes, multi_agency_discussion, etc.'],
    implementationFiles: [
      'frontend-next/lib/orb/recording/orb-recording-framework.json',
      'services/orb_recording_framework_service.py'
    ],
    limitations: ['Record type selection does not auto-detect meeting context'],
    nextStep: 'Link meeting-minutes eval fixtures to each type',
    safetyNotes: ['Safeguarding types require consent/boundary confirmations']
  },

  // — Beam gap areas (assessed) —
  {
    id: 'real_diarisation',
    label: 'Real diarisation quality from audio',
    status: 'foundation',
    userVisible: false,
    safeToClaimPublicly: false,
    evidence: [
      'Speaker model exists with diarised source type',
      'Manual speaker confirmation exists',
      'mapDiarisationToOrbTranscriptSegments ready for provider segments',
      'OpenAI gpt-4o-transcribe returns text only — segments: []'
    ],
    implementationFiles: [
      'services/ai_external_call_governance.py',
      'frontend-next/lib/orb/dictate/orb-dictate-diarisation.ts',
      'services/orb_dictate_diarisation.py'
    ],
    limitations: [
      'No verified ML diarisation provider currently proven in production',
      'Upload path uses heuristic text_to_segments after flat transcript',
      'Heuristic labels marked diarised for upload generic speakers only'
    ],
    nextStep: 'Integrate and evaluate diarisation provider or confirm provider segment support',
    safetyNotes: ['Do not identify people by voice without adult confirmation', 'No voice biometrics']
  },
  {
    id: 'live_multi_speaker_mobile',
    label: 'Live multi-speaker capture on mobile',
    status: 'partial',
    userVisible: true,
    safeToClaimPublicly: false,
    evidence: [
      'Mobile live recording works via MediaRecorder/realtime',
      'Mobile speaker labelling UI with compact mode',
      'Post-upload multi-speaker segments better than live single-stream'
    ],
    implementationFiles: [
      'frontend-next/components/orb-standalone/orb-dictate-mobile-experience.tsx',
      'frontend-next/components/orb/dictate/OrbDictateSpeakerLabelling.tsx'
    ],
    limitations: [
      'Live capture is typically single transcript stream',
      'No live speaker turn detection on mobile',
      'Safari speech/realtime limitations handled with fallbacks'
    ],
    nextStep: 'Route diarised turns into shared speaker model after processing',
    safetyNotes: ['Do not claim live speaker detection publicly']
  },
  {
    id: 'desktop_meeting_capture',
    label: 'Desktop meeting capture',
    status: 'partial',
    userVisible: true,
    safeToClaimPublicly: true,
    evidence: [
      'Web app records microphone during meetings',
      'Upload after meeting supported',
      'Paste transcript supported',
      'No Electron/Tauri/desktop app'
    ],
    implementationFiles: [
      'frontend-next/components/orb-standalone/orb-dictate-station.tsx',
      'frontend-next/lib/orb/orb-residential-stations.ts'
    ],
    limitations: [
      'No system audio capture',
      'No floating recorder or browser extension',
      'Browser permission limits — mic only'
    ],
    nextStep: 'Document desktop capture options honestly in UI copy only',
    safetyNotes: ['Do not claim Teams/Zoom auto-capture']
  },
  {
    id: 'offline_no_low_internet',
    label: 'Offline / no-low internet mode',
    status: 'partial',
    userVisible: false,
    safeToClaimPublicly: false,
    evidence: [
      'localStorage transcript drafts (orb-dictate-drafts.ts)',
      'Draft sync metadata (orb-dictate-draft-sync.ts)',
      'Offline edit fallback in dictate studio'
    ],
    implementationFiles: [
      'frontend-next/lib/orb/dictate/orb-dictate-drafts.ts',
      'frontend-next/lib/orb/dictate/orb-dictate-draft-sync.ts',
      'frontend-next/lib/orb/dictate/orb-dictate-offline-readiness.ts'
    ],
    limitations: [
      'No offline recording with guaranteed sync',
      'No service worker / background sync',
      'No local audio cache — by design for safeguarding',
      'Transcription requires network'
    ],
    nextStep: 'Implement tested upload retry queue before any offline claim',
    safetyNotes: ['Never store raw audio locally without explicit privacy decision']
  },
  {
    id: 'online_meeting_auto_detection',
    label: 'Online meeting auto-detection (Teams/Zoom/Meet)',
    status: 'missing',
    userVisible: false,
    safeToClaimPublicly: false,
    evidence: ['No meeting detection code in repo'],
    implementationFiles: [],
    limitations: ['Not implemented'],
    nextStep: 'Roadmap — desktop agent or calendar integration if ever pursued',
    safetyNotes: ['Would require explicit consent and governance review']
  },
  {
    id: 'audio_replay_storage',
    label: 'Audio replay and persistent storage',
    status: 'foundation',
    userVisible: false,
    safeToClaimPublicly: false,
    evidence: [
      'Upload audio deleted after transcription',
      'Session object URL used for duration hint only',
      'TRANSCRIPT_ONLY_COPY in UI',
      'Retention policy documents ephemeral audio'
    ],
    implementationFiles: [
      'frontend-next/lib/orb/privacy/orb-privacy-content.ts',
      'routers/orb_dictate_routes.py',
      'frontend-next/lib/orb/dictate/orb-dictate-source-check.ts'
    ],
    limitations: [
      'No persistent audio replay',
      'No waveform review of stored meetings',
      'No retention policy for audio blobs'
    ],
    nextStep: 'Governance decision required before any persistent audio storage',
    safetyNotes: ['Child audio has heightened data protection implications']
  },
  {
    id: 'translation_welsh',
    label: 'Translation / Welsh (Cymraeg)',
    status: 'missing',
    userVisible: false,
    safeToClaimPublicly: false,
    evidence: ['No translation service integrated for Dictate'],
    implementationFiles: [],
    limitations: ['Transcription is English-oriented via OpenAI transcribe model'],
    nextStep: 'Evaluate Welsh STT/translation provider with governance before exposure',
    safetyNotes: ['Original transcript must be preserved if translation is ever added']
  },
  {
    id: 'deleted_note_recovery',
    label: 'Deleted note recovery',
    status: 'partial',
    userVisible: false,
    safeToClaimPublicly: false,
    evidence: [
      'ORB saved outputs support archive status',
      'Hard delete on delete_output — no soft-delete restore UI',
      'ai_meeting_notes has soft_delete — separate from ORB Dictate saved outputs'
    ],
    implementationFiles: [
      'services/orb_saved_output_service.py',
      'db/ai_notes_db.py'
    ],
    limitations: [
      'Dictate saved output deletion is permanent',
      'No trash/recover UI for ORB standalone outputs',
      'Archive exists but not marketed as recovery'
    ],
    nextStep: 'Design soft-delete + retention window with legal review',
    safetyNotes: ['Recovery must be auditable; child data deletion expectations apply']
  },
  {
    id: 'team_analytics',
    label: 'Team analytics / manager dashboard',
    status: 'partial',
    userVisible: false,
    safeToClaimPublicly: false,
    evidence: [
      'Billing usage metrics exist',
      'ORB analytics events (mode, route, counts — no transcript content)',
      'Founder telemetry — not team manager dashboard',
      'OS notification analytics — operational, not Dictate-specific'
    ],
    implementationFiles: [
      'frontend-next/lib/orb/orb-billing-client.ts',
      'routers/founder_telemetry_routes.py'
    ],
    limitations: [
      'No Dictate team analytics dashboard',
      'No recording counts per home without governance',
      'Must not expose child names or transcript content'
    ],
    nextStep: 'Internal analytics capability plan only — privacy-safe aggregates',
    safetyNotes: ['Never expose child data, incident details, or transcript content in dashboards']
  },
  {
    id: 'enterprise_security_compliance',
    label: 'Enterprise security / compliance evidence',
    status: 'partial',
    userVisible: true,
    safeToClaimPublicly: false,
    evidence: [
      'MFA implemented (mfa_routes.py)',
      'OAuth/SSO for ORB standalone (orb_oauth_routes.py)',
      'Passkeys (passkey_routes.py)',
      'RBAC via policy_engine',
      'Security headers middleware',
      'Audit log services',
      'TLS in transit (deployment)'
    ],
    implementationFiles: [
      'middleware/security_middleware.py',
      'routers/mfa_routes.py',
      'routers/orb_oauth_routes.py',
      'services/audit_event_service.py',
      'frontend-next/lib/orb/orb-enterprise-capability-evidence.ts'
    ],
    limitations: [
      'No SOC2/ISO certification',
      'No HIPAA claim',
      'No guaranteed UK-only storage claim',
      'DPA/DPIA evidence docs incomplete',
      'Penetration test status not verified in repo'
    ],
    nextStep: 'Complete enterprise evidence map and correct any public overclaims',
    safetyNotes: ['Do not claim government-grade or HIPAA without verified evidence']
  },
  {
    id: 'live_llm_meeting_minutes_quality',
    label: 'Live LLM quality of meeting minutes',
    status: 'foundation',
    userVisible: false,
    safeToClaimPublicly: false,
    evidence: [
      'Deterministic quality checks (orb_dictate_quality.py)',
      'Recording framework section prompts',
      'Meeting intelligence tests',
      'Meeting minutes eval harness with fixtures'
    ],
    implementationFiles: [
      'services/orb_dictate_quality.py',
      'frontend-next/lib/orb/dictate/orb-dictate-meeting-minutes-eval.ts',
      'frontend-next/lib/orb/recording/orb-output-quality-audit.ts'
    ],
    limitations: [
      'No automated live LLM eval in CI',
      'Golden outputs require staging/manual runs',
      'Speaker label flow into notes not fully regression-tested against live LLM'
    ],
    nextStep: 'Run meeting-minutes fixtures against staging LLM; expand prohibited-pattern checks',
    safetyNotes: [
      'Outputs must not invent names, actions, diagnoses, or unsupported safeguarding decisions',
      'Child voice must not be lost in multi-speaker meetings'
    ]
  }
]

export function getBeamCapability(id: string): OrbDictateBeamCapability | undefined {
  return ORB_DICTATE_BEAM_CAPABILITIES.find((c) => c.id === id)
}

export function capabilitiesByStatus(status: OrbDictateCapabilityStatus): OrbDictateBeamCapability[] {
  return ORB_DICTATE_BEAM_CAPABILITIES.filter((c) => c.status === status)
}

export function capabilitiesNotSafeToClaimPublicly(): OrbDictateBeamCapability[] {
  return ORB_DICTATE_BEAM_CAPABILITIES.filter((c) => !c.safeToClaimPublicly)
}

/** Validates internal consistency — missing/roadmap must not be publicly claimable. */
export function validateBeamCapabilityMapTruthfulness(): string[] {
  const violations: string[] = []
  for (const cap of ORB_DICTATE_BEAM_CAPABILITIES) {
    if ((cap.status === 'missing' || cap.status === 'roadmap') && cap.safeToClaimPublicly) {
      violations.push(`${cap.id}: missing/roadmap cannot be safeToClaimPublicly`)
    }
    if (cap.status === 'foundation' && cap.safeToClaimPublicly && cap.id !== 'desktop_meeting_capture') {
      // foundation is generally not publicly claimable unless explicitly allowed
      if (
        ['real_diarisation', 'audio_replay_storage', 'live_llm_meeting_minutes_quality'].includes(cap.id)
      ) {
        violations.push(`${cap.id}: foundation capability must not be safeToClaimPublicly`)
      }
    }
    const sensitiveIds = [
      'offline_no_low_internet',
      'translation_welsh',
      'online_meeting_auto_detection',
      'real_diarisation',
      'live_multi_speaker_mobile',
      'audio_replay_storage',
      'deleted_note_recovery',
      'team_analytics',
      'enterprise_security_compliance',
      'live_llm_meeting_minutes_quality'
    ]
    if (sensitiveIds.includes(cap.id) && cap.safeToClaimPublicly) {
      violations.push(`${cap.id}: sensitive gap area must not be safeToClaimPublicly without evidence`)
    }
  }
  return violations
}

/** Legacy roadmap shape — derived from beam map for backward compatibility. */
export const ORB_DICTATE_CAPABILITY_ROADMAP = {
  implemented: ORB_DICTATE_BEAM_CAPABILITIES.filter((c) => c.status === 'implemented').map((c) => c.id),
  partial: ORB_DICTATE_BEAM_CAPABILITIES.filter((c) => c.status === 'partial').map((c) => c.id),
  foundation: ORB_DICTATE_BEAM_CAPABILITIES.filter((c) => c.status === 'foundation').map((c) => c.id),
  not_implemented: ORB_DICTATE_BEAM_CAPABILITIES.filter(
    (c) => c.status === 'missing' || c.status === 'roadmap'
  ).map((c) => c.id)
} as const
