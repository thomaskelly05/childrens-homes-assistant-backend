import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate top-weight reduction', () => {
  it('selected template appears once in compact top bar dropdown', () => {
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    const selector = readComponent('components/orb/dictate/OrbDictateTemplateSelector.tsx')
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(topBar, /OrbDictateTemplateSelector/)
    assert.match(selector, /data-orb-dictate-template-dropdown/)
    assert.match(selector, /data-orb-dictate-selected-template/)
    assert.doesNotMatch(topBar, /OrbDictateSelectedTemplateCard/)
    assert.doesNotMatch(workspace, /OrbDictateSelectedTemplateCard/)
  })

  it('large selected template card is not rendered above workspace by default', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.doesNotMatch(workspace, /<OrbDictateSelectedTemplateCard/)
  })

  it('template detail is available through disclosure popover', () => {
    const selector = readComponent('components/orb/dictate/OrbDictateTemplateSelector.tsx')
    const card = readComponent('components/orb/dictate/OrbDictateSelectedTemplateCard.tsx')
    assert.match(selector, /data-orb-dictate-template-details-trigger/)
    assert.match(selector, /data-orb-dictate-template-details-popover/)
    assert.match(selector, /OrbDictateSelectedTemplateDetails/)
    assert.match(card, /data-orb-dictate-selected-template-details/)
  })

  it('privacy strip remains visible with expandable detail', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const strip = readComponent('components/orb/dictate/OrbDictatePrivacyStrip.tsx')
    assert.match(workspace, /OrbDictatePrivacyStrip/)
    assert.match(strip, /Session-only transcript/)
    assert.match(strip, /data-orb-dictate-privacy-detail/)
  })

  it('full template list is accessible via dropdown menu', () => {
    const selector = readComponent('components/orb/dictate/OrbDictateTemplateSelector.tsx')
    const framework = readComponent('lib/orb/recording/orb-recording-framework.json')
    assert.match(selector, /data-orb-dictate-template-menu/)
    assert.match(selector, /ORB_DICTATE_STUDIO_TEMPLATES\.map/)
    const labels = [
      'General Dictation',
      'Daily Record',
      'Incident Report',
      'Missing From Home Record',
      'Safeguarding Concern',
      'Physical Intervention',
      'Key Work Session',
      'Manager Summary',
      'Chronology Entry'
    ]
    for (const label of labels) {
      assert.match(framework, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
  })

  it('brain empty state shows record type, ORB checks, and analyse CTA', () => {
    const brain = readComponent('components/orb/dictate/OrbDictateBrainPanel.tsx')
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(brain, /data-orb-brain-empty-orb-checks/)
    assert.match(brain, /data-orb-brain-record-type-empty/)
    assert.match(brain, /data-orb-brain-analyse-cta/)
    assert.match(brain, /Analyse transcript with ORB/)
    assert.match(workspace, /studioTemplateId={props.selectedTemplateId}/)
  })

  it('panel layout presets exist but toolbar is hidden by default', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const panels = readComponent('components/orb/resizable-panels/orb-resizable-workspace.tsx')
    const layoutCtrl = readComponent('components/orb/dictate/OrbDictatePanelLayoutControl.tsx')
    assert.match(workspace, /hidePresetToolbar/)
    assert.match(workspace, /OrbDictatePanelLayoutControl/)
    assert.match(panels, /hidePresetToolbar/)
    assert.match(layoutCtrl, /data-orb-panel-preset/)
    assert.match(layoutCtrl, /full-transcript/)
    assert.match(layoutCtrl, /full-brain/)
  })

  it('transcript and brain panels follow trust strip immediately', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const topBarIdx = workspace.indexOf('<OrbDictateTopBar')
    const privacyIdx = workspace.indexOf('<OrbDictatePrivacyStrip')
    const panelsIdx = workspace.indexOf('<OrbResizableWorkspace')
    assert.ok(topBarIdx >= 0 && privacyIdx > topBarIdx)
    assert.ok(panelsIdx > privacyIdx)
  })

  it('no child profile selector in dictate workspace', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.doesNotMatch(workspace, /child.profile|childProfile|ChildProfile/)
  })

  it('no internal brain metadata in brain panel', () => {
    const brain = readComponent('components/orb/dictate/OrbDictateBrainPanel.tsx')
    assert.doesNotMatch(brain, /brain_metadata/)
    assert.doesNotMatch(brain, /os_records_accessed/)
    assert.doesNotMatch(brain, /indicare_intelligence_core/)
  })

  it('ORB Write button renders with correct disabled state', () => {
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    assert.match(topBar, /writeDisabled = !hasDraft/)
    assert.match(topBar, /data-orb-dictate-finalise/)
    assert.match(topBar, /Open in ORB Write/)
  })

  it('workspace uses compact modal chrome on desktop', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const frame = readComponent('components/orb-standalone/orb-workspace-frame.tsx')
    assert.match(station, /compactChrome={phase !== 'studio' && !isMobile}/)
    assert.match(frame, /compactChrome/)
  })

  it('advanced options live in transcript panel footer', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const transcript = readComponent('components/orb/dictate/OrbTranscriptPanel.tsx')
    assert.match(workspace, /footerSlot={advancedFooter}/)
    assert.match(transcript, /footerSlot/)
    assert.match(workspace, /data-orb-dictate-advanced-options/)
  })
})
