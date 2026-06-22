import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5O premium UI convergence', () => {
  it('build marker is phase-5o-orb-premium-ui-voice-timing-cleanup', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5o-orb-premium-ui-voice-timing-cleanup')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5o-orb-premium-ui-voice-timing-cleanup/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('shared premium primitives exist in shell CSS', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    for (const cls of [
      'orb-premium-surface',
      'orb-premium-glass',
      'orb-premium-hero',
      'orb-premium-rail',
      'orb-premium-button',
      'orb-premium-chip',
      'orb-premium-input',
      'orb-premium-empty-state',
      'orb-premium-section-title',
      'orb-premium-safety-note'
    ]) {
      assert.match(shell, new RegExp(`\\.${cls}`))
    }
  })

  it('Home has premium hero and prompt structure', () => {
    const care = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(care, /orb-premium-hero/)
    assert.match(care, /data-orb-workspace-hero/)
    assert.match(care, /data-orb-home-centre-stack/)
  })

  it('Dictate has modern capture station structure', () => {
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /orb-premium-capture-station/)
    assert.match(dictate, /data-orb-dictate-station/)
  })

  it('Communicate has one main describe-the-need flow', () => {
    const flow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    assert.match(flow, /ORB_COMMUNICATE_MAIN_HEADING/)
    assert.match(flow, /Describe the communication need/)
    assert.match(flow, /data-orb-communicate-natural-language-input/)
    assert.doesNotMatch(flow, /role="tablist"/)
  })

  it('ORB Write keeps one document editor', () => {
    const write = read('components/orb-write/orb-write-station.tsx')
    assert.match(write, /OrbWriteEditor/)
    assert.match(write, /data-orb-write-station/)
    assert.doesNotMatch(write, /OrbWriteEditorDuplicate/)
  })

  it('core routes still mount from care companion', () => {
    const care = read('components/orb-standalone/orb-care-companion.tsx')
    for (const marker of [
      'OrbVoiceStation',
      'OrbDictateStation',
      'OrbCommunicateStation',
      'OrbWriteStation',
      'OrbHelpPanel'
    ]) {
      assert.match(care, new RegExp(marker))
    }
  })

  it('safeguarding copy preserved without compliance guarantee language', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    const care = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(shell, /compliance guarantee/i)
    assert.doesNotMatch(care, /compliance guarantee/i)
    assert.match(care, /Save to Records/i)
  })

  it('Katherine and specialist brain remain', () => {
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /katherineReady/)
    assert.match(read('../services/orb_voice_brain_router_service.py'), /voice_specialist/)
    assert.match(read('../services/orb_voice_v2_service.py'), /katherine/i)
  })
})
