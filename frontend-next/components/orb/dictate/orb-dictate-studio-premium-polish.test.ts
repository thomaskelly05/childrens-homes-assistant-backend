import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate studio premium polish', () => {
  it('record button is visible as hero action in top bar', () => {
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    assert.match(topBar, /data-orb-dictate-top-record/)
    assert.match(topBar, /orb-dictate-hero-record/)
  })

  it('template selector is compact dropdown in top bar', () => {
    const selector = readComponent('components/orb/dictate/OrbDictateTemplateSelector.tsx')
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    assert.match(selector, /data-orb-dictate-template-selector/)
    assert.match(selector, /data-orb-dictate-template-dropdown/)
    assert.match(topBar, /OrbDictateTemplateSelector/)
  })

  it('privacy strip is visible with expandable detail below top bar', () => {
    const strip = readComponent('components/orb/dictate/OrbDictatePrivacyStrip.tsx')
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(strip, /data-orb-dictate-privacy-strip/)
    assert.match(strip, /Session-only transcript/)
    assert.match(strip, /data-orb-dictate-privacy-detail/)
    assert.match(strip, /ORB_WRITE_PRIVACY_NOTICE/)
    assert.match(workspace, /OrbDictatePrivacyStrip/)
  })

  it('generate/analyse button is disabled without transcript', () => {
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(topBar, /primaryAction === 'disabled'/)
    assert.match(topBar, /data-orb-dictate-primary-action/)
    assert.match(workspace, /if \(!hasTranscript\) return 'disabled'/)
  })

  it('analyse button appears when transcript exists', () => {
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    assert.match(topBar, /Review with ORB/)
    assert.match(topBar, /Create draft record/)
  })

  it('open in ORB Write is disabled until draft is available', () => {
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    assert.match(topBar, /writeDisabled = !hasDraft/)
    assert.match(topBar, /data-orb-dictate-finalise/)
  })

  it('workflow strip shows capture to approve journey', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /OrbWorkflowStrip/)
    assert.match(workspace, /data-orb-dictate-responsibility-strip/)
  })

  it('panels render side by side via resizable workspace', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const panels = readComponent('components/orb/resizable-panels/orb-resizable-workspace.tsx')
    assert.match(workspace, /OrbResizableWorkspace/)
    assert.match(panels, /data-orb-panel-left/)
    assert.match(panels, /data-orb-panel-right/)
  })

  it('brain empty state shows record framework before analysis', () => {
    const brain = readComponent('components/orb/dictate/OrbDictateBrainPanel.tsx')
    assert.match(brain, /data-orb-brain-empty-orb-checks/)
    assert.match(brain, /What ORB will check/)
    assert.match(brain, /data-orb-brain-analyse-cta/)
  })

  it('advanced options are collapsed in transcript footer', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const transcript = readComponent('components/orb/dictate/OrbTranscriptPanel.tsx')
    assert.match(workspace, /data-orb-dictate-advanced-options/)
    assert.match(workspace, /<details/)
    assert.match(workspace, /footerSlot/)
    assert.match(transcript, /footerSlot/)
  })

  it('focus mode control renders with local preference', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const focus = readComponent('lib/orb/dictate/orb-dictate-focus-mode.ts')
    assert.match(workspace, /data-orb-dictate-focus-mode/)
    assert.match(focus, /orb-dictate-focus-mode-v1/)
  })

  it('no internal brain metadata is visible in brain panel', () => {
    const brain = readComponent('components/orb/dictate/OrbDictateBrainPanel.tsx')
    assert.doesNotMatch(brain, /brain_metadata/)
    assert.doesNotMatch(brain, /os_records_accessed/)
    assert.doesNotMatch(brain, /indicare_intelligence_core/)
  })

  it('no child profile selector is present in dictate workspace', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.doesNotMatch(workspace, /child.profile|childProfile|ChildProfile/)
  })

  it('suggested outputs action rail appears when transcript exists', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const outputs = readComponent('components/orb/dictate/OrbDictateSuggestedOutputs.tsx')
    assert.match(workspace, /data-orb-dictate-action-rail/)
    assert.match(outputs, /data-orb-suggested-outputs-variant/)
  })
})
