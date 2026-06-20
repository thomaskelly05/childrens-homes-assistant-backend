import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential desktop premium simplification pass', () => {
  it('desktop home uses lightweight starter chips in composer dock', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')

    assert.match(companion, /data-orb-workspace-starters/)
    assert.match(companion, /ORB_RESIDENTIAL_EMPTY_STARTERS/)
    assert.doesNotMatch(companion, /data-orb-starter-expanded-groups/)
  })

  it('primary starter chips match the residential quick-start set', () => {
    const copy = read('lib/orb/orb-residential-copy.ts')
    for (const label of [
      'Daily record',
      'Incident reflection',
      'Key-work summary',
      'Handover note',
      'Safeguarding reflection',
      'Prepare for supervision'
    ]) {
      assert.match(copy, new RegExp(`text: '${label.replace(/'/g, "\\'")}'`))
    }
  })

  it('voice station keeps spacious desktop layout and actionable controls', () => {
    const voiceContent = read('components/orb-standalone/orb-voice-station-content.tsx')
    const voiceHero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const voiceStrip = read('components/orb-standalone/orb-voice-responsibility-strip.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(voiceContent, /data-orb-voice-desktop-spacious/)
    assert.match(voiceContent, /OrbVoiceResponsibilityStrip/)
    assert.match(voiceHero, /orb-voice-hero-aura/)
    assert.match(voiceStrip, /data-orb-voice-privacy-note/)
    assert.match(desktop, /\[data-orb-voice-desktop-spacious='true'\]/)
    assert.match(desktop, /\[data-orb-voice-responsibility-strip\]/)
    assert.match(read('components/orb-standalone/orb-voice-actions.tsx'), /Start voice|Type instead|Turn speech/)
  })

  it('dictate exposes Dictate copy while preserving workflow', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const transcript = read('components/orb/dictate/OrbTranscriptPanel.tsx')
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    const topBar = read('components/orb/dictate/OrbDictateTopBar.tsx')
    const brain = read('components/orb/dictate/OrbDictateBrainPanel.tsx')

    assert.match(workspace, /ORB_RESIDENTIAL_DICTATE_COPY/)
    assert.match(workspace, /data-orb-dictate-studio/)
    assert.match(transcript, /data-orb-dictate-capture-prompt/)
    assert.match(workspace, /data-orb-dictate-studio/)
    assert.match(topBar, /Start recording/)
    assert.match(brain, /ORB Review/)
    assert.match(brain, /ORB_RESIDENTIAL_DICTATE_COPY\.reviewHint/)
    assert.match(read('lib/orb/orb-residential-copy.ts'), /ORB_DICTATE_SUBTITLE/)
  })

  it('ORB Write exposes shared template selector without duplicating registry', () => {
    const writePanel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const selector = read('components/orb-write/orb-write-record-type-selector.tsx')
    const picker = read('components/orb-write/orb-write-template-picker.tsx')

    assert.match(writePanel, /OrbWriteRecordTypeSelector/)
    assert.match(writePanel, /selectorLabel="Record type"/)
    assert.match(writePanel, /requestRecordTypeChange/)
    assert.match(selector, /ORB_PRIMARY_RECORD_TYPE_IDS/)
    assert.match(selector, /data-orb-write-template-selector/)
    assert.match(picker, /orbWriteTemplatePickerRecordTypes/)
    assert.match(writePanel, /ORB_WRITE_SAFETY_COPY/)
    assert.match(writePanel, /Create draft record/)
    assert.match(read('lib/orb/recording/orb-recording-section-prompts.ts'), /general_dictation/)
  })

  it('billing modal uses full-width summary and desktop two-column grid', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(billing, /data-orb-billing-plan-card/)
    assert.match(billing, /data-orb-billing-desktop-grid/)
    assert.match(billing, /data-orb-billing-column-left/)
    assert.match(billing, /data-orb-billing-column-right/)
    assert.match(billing, /data-orb-billing-refresh/)
    assert.match(billing, /data-orb-billing-portal/)
    assert.match(billing, /data-orb-billing-status-pill/)
    assert.match(billing, /data-orb-billing-sticky-footer/)
    assert.match(billing, /sm:hidden[\s\S]*data-orb-billing-sticky-footer/)
    assert.match(desktop, /\[data-orb-billing-desktop-grid\]/)
  })

  it('settings keeps scroll container and appearance controls', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const appearance = read('components/orb-standalone/orb-appearance-control.tsx')
    const privacy = read('components/orb-residential/orb-privacy-data-settings-section.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(settings, /data-orb-settings-scroll/)
    assert.match(appearance, /data-orb-appearance-option/)
    assert.match(privacy, /data-orb-privacy-data-row/)
    assert.match(desktop, /\[data-orb-settings-scroll\]/)
  })

  it('mobile plus, composer, and build memory protections remain intact', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const buildExcludes = read('lib/orb/orb-build-excludes.test.ts')

    assert.match(companion, /dynamic\(/)
    assert.match(companion, /data-orb-starter-suggestion-card/)
    assert.match(composer, /OrbResidentialComposerToolsSheet|OrbComposerPlusMenu/)
    assert.doesNotMatch(composer, /data-orb-privacy-guidance-trigger/)
    assert.match(tools, /take_photo/)
    assert.match(buildExcludes, /production build excludes/)
  })
})
