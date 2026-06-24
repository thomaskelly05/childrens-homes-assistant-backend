/**
 * Phase 1A — canonical user-facing names for ORB Residential web.
 * One feature. One name. One mental model.
 * Backend/API identifiers may differ; import labels from here for UI copy.
 */

/** Primary sidebar destinations (visible to normal users). */
export const ORB_NAV_HOME = 'Home'
export const ORB_NAV_CHAT = 'Chat'
export const ORB_NAV_DICTATE = 'Dictate'
export const ORB_NAV_VOICE = 'Voice'
export const ORB_NAV_COMMUNICATE = 'Communicate'
export const ORB_NAV_WRITE = 'ORB Write'
export const ORB_NAV_RECORDS = 'Records & Drafts'
export const ORB_NAV_HELP = 'Help & Safety'
export const ORB_NAV_SETTINGS = 'Settings'

/** Records & drafts — user-facing (API may still use /outputs). */
export const ORB_RECORDS_PANEL_TITLE = 'Records & Drafts'
export const ORB_RECORDS_PANEL_SUBTITLE = 'Your saved drafts, records and working documents.'
export const ORB_RECORDS_EMPTY_TITLE = 'No records or drafts yet.'
export const ORB_RECORDS_EMPTY_SUBTITLE =
  'Saved adult-reviewed outputs from Chat, Dictate, Voice and ORB Write appear here.'
export const ORB_RECORDS_FOOTER =
  'Records and drafts are standalone ORB artefacts. Adult review required before use in practice.'
export const ORB_RECORDS_LOAD_ERROR = 'Could not load records and drafts'
export const ORB_RECORDS_OPEN_ACTION = 'Open Records & Drafts'
export const ORB_SAVED_DRAFT_LABEL = 'saved draft'
export const ORB_SAVED_RECORD_LABEL = 'saved record'

/** Dictate — single visible product name (no Magic Notes). */
export const ORB_DICTATE_TITLE = 'Dictate'
export const ORB_DICTATE_SUBTITLE =
  'Speak naturally. ORB will structure your words for adult review.'
export const ORB_DICTATE_CAPTURE_PROMPT = 'Speak, paste or upload what happened'
export const ORB_DICTATE_CAPTURE_GUIDANCE =
  'Start with what happened. ORB will help structure the record, check what may be missing and keep the child\u2019s experience central.'
export const ORB_DICTATE_REVIEW_HINT =
  'Before drafting, ORB checks whether the record has enough detail to be safe, factual and child-centred.'
export const ORB_DICTATE_RESPONSIBILITY =
  'Generated drafts must be reviewed by an adult before use. Follow your home\u2019s safeguarding and recording policy.'

/** Chat home — child-centred empty state (Phase 3H calm welcome). */
export const ORB_CHAT_EMPTY_HEADING = 'What do you need help thinking through?'
export const ORB_CHAT_EMPTY_SUBLINE =
  'Start with what happened, what you are unsure about, or what needs recording. ORB can help you reflect, structure and write with the child\u2019s experience central.'
export const ORB_HOME_VALUE_PROPOSITION = ORB_CHAT_EMPTY_SUBLINE

/** Starter action — not a competing station name. */
export const ORB_STARTER_RECORD_PROPERLY = 'Help me record this properly'
export const ORB_STARTER_RECORD_PROPERLY_PROMPT =
  'Help me record this properly. I will share rough notes — keep the child central and help me record observable facts clearly for adult review.'

/** Help panel. */
export const ORB_HELP_PANEL_TITLE = 'Help & Safety'
export const ORB_HELP_PANEL_SUBTITLE = 'ORB Residential — boundaries and support'

/** Conversion — single contact destination for provider demos. */
export const ORB_REQUEST_DEMO_LABEL = 'Request a demo'
export const ORB_REQUEST_DEMO_URL = 'https://www.indicare.co.uk/contact'
export const ORB_DEMO_BEFORE_TRIAL_COPY =
  'Providers and sector professionals can request a guided demo before starting a trial.'

/** Upgrade / billing gate — Phase 1A aligned product language. */
export const ORB_UPGRADE_INCLUDES_COPY =
  'ORB Residential helps adults in and around children\u2019s homes record, reflect and respond with safeguarding-aware AI support. Includes Chat, Dictate, Voice, ORB Write and Records & Drafts.'
export const ORB_UPGRADE_DEFAULT_FEATURES = [
  "Residential children's homes assistant",
  'Safeguarding thinking',
  'Recording support',
  'Ofsted / Reg 44 lens',
  'Guided demo walkthrough',
  'Document intelligence',
  'Academy / NVQ helper',
  'Profile and voice',
  'Feedback-driven improvement'
] as const

/** Records & Drafts search — user-facing (API id may remain saved_outputs). */
export const ORB_RECORDS_SEARCH_LABEL = 'Records & Drafts'
export const ORB_RECORDS_SEARCH_PLACEHOLDER = 'Search records and drafts'
export const ORB_RECORDS_SEARCH_EMPTY = 'No records or drafts match your search.'

/** Visible sidebar nav order — internal ids; labels from constants above. */
export const ORB_VISIBLE_SIDEBAR_NAV = [
  { id: 'home' as const, label: ORB_NAV_HOME },
  { id: 'chat' as const, label: ORB_NAV_CHAT },
  { id: 'orb_dictate' as const, label: ORB_NAV_DICTATE },
  { id: 'orb_voice' as const, label: ORB_NAV_VOICE },
  { id: 'orb_write' as const, label: ORB_NAV_WRITE },
  { id: 'saved' as const, label: ORB_NAV_RECORDS },
  { id: 'help' as const, label: ORB_NAV_HELP },
  { id: 'settings' as const, label: ORB_NAV_SETTINGS }
] as const

/** Stations kept routable but hidden from primary launch navigation until backend workflows ship. */
export const ORB_HIDDEN_LAUNCH_STATION_IDS = ['orb_communicate'] as const

export type OrbVisibleSidebarNavId = (typeof ORB_VISIBLE_SIDEBAR_NAV)[number]['id']

/** Residential-first filter chips for Records & Drafts. */
export const ORB_RECORDS_FILTER_CHIPS: Array<{ id: string; label: string; type: string }> = [
  { id: 'all', label: 'All', type: '' },
  { id: 'daily_records', label: 'Daily records', type: 'recording_rewrite' },
  { id: 'incidents', label: 'Incidents', type: 'incident_report' },
  { id: 'safeguarding', label: 'Safeguarding reflections', type: 'safeguarding_reflection' },
  { id: 'voice', label: 'Voice transcripts', type: 'voice_transcript' },
  { id: 'handover', label: 'Handover notes', type: 'handover_note' },
  { id: 'manager', label: 'Manager review', type: 'manager_briefing' },
  { id: 'other', label: 'Other drafts', type: 'general_research' }
]
