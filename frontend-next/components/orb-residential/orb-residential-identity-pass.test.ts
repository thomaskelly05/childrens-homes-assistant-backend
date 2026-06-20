import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_PRIMARY_RECORD_TYPE_IDS,
  ORB_RECORDING_SECTION_PROMPTS,
  buildSectionPromptBody,
  sectionPromptsForRecordType
} from '../../lib/orb/recording/orb-recording-section-prompts.ts'
import { orbWriteBodyToMobileNotepadHtml } from '../../lib/orb/write/orb-write-mobile-body.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const workspaceRoot = join(root, '..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function readJsonFromWorkspace(relativePath: string) {
  return JSON.parse(readFileSync(join(workspaceRoot, relativePath), 'utf8'))
}

const CORE_TEMPLATE_IDS = [
  'general_dictation',
  'daily_record',
  'incident_report',
  'key_work_session',
  'handover',
  'chronology_entry',
  'safeguarding_concern',
  'behaviour_reflection',
  'manager_summary',
  'meeting_notes',
  'multi_agency_discussion',
  'home_visit_note',
  'strategy_safeguarding_discussion',
  'supervision_discussion'
] as const

const BLAMING_PHRASES = [
  'manipulative',
  'attention-seeking',
  'bad behaviour',
  'non-compliant',
  'chose to behave',
  'failed to engage'
]

describe('ORB Residential station identity pass', () => {
  it('voice uses immersive ORB hero and full-width responsibility strip', () => {
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const strip = read('components/orb-standalone/orb-voice-responsibility-strip.tsx')
    const desktopCss = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    const actions = read('components/orb-standalone/orb-voice-actions.tsx')

    assert.match(hero, /orb-voice-hero-aura/)
    assert.match(hero, /OrbVoiceCompanion/)
    assert.doesNotMatch(hero, /OrbPrivacyNotice/)
    assert.doesNotMatch(hero, /data-orb-voice-safety-disclosure/)
    assert.match(content, /OrbVoiceResponsibilityStrip/)
    assert.match(strip, /data-orb-voice-responsibility-strip/)
    assert.match(strip, /data-orb-voice-privacy-strip/)
    assert.match(strip, /OrbPrivacyClassificationLink/)
    assert.match(strip, /ORB_RESIDENTIAL_VOICE_PRIVACY_STRIP/)
    assert.match(desktopCss, /\[data-orb-voice-responsibility-strip\]/)
    assert.match(actions, /Start voice/)
    assert.match(actions, /Type instead/)
    assert.match(actions, /Turn speech into a record/)
  })

  it('voice status lines are calm, immersive and actionable on failure', () => {
    const uiState = read('lib/orb/voice/orb-voice-ui-state.ts')
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const live = read('components/orb-standalone/orb-voice-live-panel.tsx')

    assert.match(companion, /I'm ready when you are\./)
    assert.match(companion, /Listening…/)
    assert.match(companion, /Thinking with you…/)
    assert.match(uiState, /Talk it through with ORB\./)
    assert.match(uiState, /You can still type or use Dictate\./)
    assert.match(uiState, /type instead, or use Dictate/)
    assert.match(live, /Listening…/)
    assert.match(live, /Thinking with you…/)
  })

  it('dictate presents Dictate product copy without breaking workflow', () => {
    const copy = read('lib/orb/orb-residential-copy.ts')
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const topBar = read('components/orb/dictate/OrbDictateTopBar.tsx')
    const transcript = read('components/orb/dictate/OrbTranscriptPanel.tsx')
    const brain = read('components/orb/dictate/OrbDictateBrainPanel.tsx')

    assert.match(copy, /ORB_RESIDENTIAL_DICTATE_COPY/)
    assert.match(copy, /ORB_DICTATE_SUBTITLE/)
    assert.doesNotMatch(copy, /ORB Magic Notes/)
    assert.match(workspace, /OrbWorkflowStrip/)
    assert.match(workspace, /OrbDictatePrivacyStrip/)
    assert.match(workspace, /data-orb-dictate-studio/)
    assert.match(topBar, /Review with ORB/)
    assert.match(topBar, /Open in ORB Write/)
    assert.match(transcript, /ORB_RESIDENTIAL_DICTATE_COPY\.capturePrompt/)
    assert.match(transcript, /data-orb-dictate-capture-guidance/)
    assert.match(brain, /ORB Review/)
    assert.match(brain, /reviewHint/)
    const workflow = read('components/orb/premium/orb-workflow-strip.tsx')
    assert.match(workflow, /Capture rough notes/)
    assert.match(workflow, /Review with ORB/)
    assert.match(workflow, /Create safer draft/)
    assert.match(workflow, /Finalise with adult approval/)
  })

  it('ORB Write feels like a guided therapeutic workspace', () => {
    const copy = read('lib/orb/orb-residential-copy.ts')
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const editor = read('components/orb-write/orb-write-editor.tsx')
    const desktopCss = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(copy, /Structure, review and finalise with adult approval/)

    assert.match(panel, /Write with ORB/)
    assert.match(panel, /data-orb-write-studio-subtitle/)
    assert.match(panel, /Choose the structure ORB should help you write/)
    assert.match(panel, /ORB_RESIDENTIAL_STATION_PRODUCT_COPY\.write/)
    assert.match(panel, /OrbWriteRecordTypeSelector/)
    assert.match(panel, /Create draft record/)
    assert.match(panel, /ORB_WRITE_SAFETY_COPY/)
    assert.match(editor, /onApprove/)
    assert.match(editor, /orbWriteBodyLooksLikeMarkdownTemplate/)
    assert.match(desktopCss, /orb-write-section-hint/)
  })

  it('markdown template bodies render as headings and guidance, not raw syntax', () => {
    const body = buildSectionPromptBody('general_dictation') ?? ''
    const html = orbWriteBodyToMobileNotepadHtml(body)
    assert.doesNotMatch(html, /^##\s/m)
    assert.match(html, /<h2>Summary<\/h2>/)
    assert.match(html, /orb-write-section-hint/)
    assert.match(html, /child's care|child&#39;s care|child&apos;s care/i)
  })

  it('core templates have therapeutic prompts without blaming language', () => {
    for (const id of CORE_TEMPLATE_IDS) {
      const prompts = sectionPromptsForRecordType(id)
      assert.ok(prompts?.length, `missing prompts for ${id}`)
      const joined = prompts!.map((p) => `${p.title} ${p.prompt}`).join(' ')
      assert.match(joined, /child|Child|adult|Adult/)
      for (const phrase of BLAMING_PHRASES) {
        assert.doesNotMatch(joined.toLowerCase(), new RegExp(phrase.toLowerCase()))
      }
    }
    assert.ok(ORB_RECORDING_SECTION_PROMPTS.meeting_notes)
    assert.ok(ORB_RECORDING_SECTION_PROMPTS.multi_agency_discussion)
    assert.ok(ORB_RECORDING_SECTION_PROMPTS.home_visit_note)
    assert.ok(ORB_RECORDING_SECTION_PROMPTS.strategy_safeguarding_discussion)
    assert.ok(ORB_RECORDING_SECTION_PROMPTS.supervision_discussion)
  })

  it('frontend and backend recording frameworks remain in parity', () => {
    const frontend = readJsonFromWorkspace('frontend-next/lib/orb/recording/orb-recording-framework.json')
    const backend = readJsonFromWorkspace('assistant/knowledge/orb_recording_framework.json')
    const frontendIds = frontend.record_types.map((r: { id: string }) => r.id).sort()
    const backendIds = backend.record_types.map((r: { id: string }) => r.id).sort()
    assert.deepEqual(frontendIds, backendIds)
    assert.equal(frontend.version, backend.version)
    for (const id of ORB_PRIMARY_RECORD_TYPE_IDS) {
      assert.ok(frontendIds.includes(id), `missing primary record type ${id}`)
    }
  })

  it('does not create duplicate station systems or false privacy claims', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const voiceStation = read('components/orb-standalone/orb-voice-station.tsx')
    const safety = read('lib/orb/orb-residential-safety-copy.ts')

    assert.doesNotMatch(companion, /lazy\(\(\) => import\('@\/components\/orb-standalone\/orb-voice-station'\)\)/)
    assert.match(voiceStation, /OrbVoiceStationContent/)
    assert.match(safety, /Do not use ORB for emergencies/)
    assert.match(safety, /ORB supports professional judgement/)
    assert.doesNotMatch(safety, /end-to-end encrypted|military-grade|100% secure/i)
  })
})
