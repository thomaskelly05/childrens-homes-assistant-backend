import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_DICTATE_STUDIO_TEMPLATES } from '../../lib/orb/dictate/orb-dictate-studio-templates.ts'
import { loadOrbDictatePanelLayout } from '../../lib/orb/dictate/orb-dictate-panel-layout.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate + Write convergence', () => {
  it('top bar has visible record and contextual generate controls', () => {
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    assert.match(topBar, /data-orb-dictate-top-record/)
    assert.match(topBar, /data-orb-dictate-generate/)
    assert.match(topBar, /Analyse with ORB/)
    assert.match(topBar, /data-orb-dictate-finalise/)
    assert.match(topBar, /OrbDictateTemplateSelector/)
  })

  it('privacy trust strip renders with expandable detail', () => {
    const strip = readComponent('components/orb/dictate/OrbDictatePrivacyStrip.tsx')
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    const types = readComponent('lib/orb/write/orb-write-types.ts')
    assert.match(strip, /data-orb-dictate-privacy-strip/)
    assert.match(strip, /data-orb-dictate-privacy-detail/)
    assert.match(strip, /Session-only transcript/)
    assert.match(topBar, /OrbDictatePrivacyStrip/)
    assert.match(types, /No child profile data is stored in ORB Dictate/)
  })

  it('resizable panels component exists with presets', () => {
    const panels = readComponent('components/orb/resizable-panels/orb-resizable-workspace.tsx')
    assert.match(panels, /data-orb-resizable-workspace/)
    assert.match(panels, /data-orb-panel-preset/)
    assert.match(panels, /data-orb-panel-divider/)
  })

  it('panel layout saves locally', () => {
    const layoutMod = readComponent('lib/orb/dictate/orb-dictate-panel-layout.ts')
    const panels = readComponent('components/orb/resizable-panels/orb-resizable-workspace.tsx')
    assert.match(layoutMod, /orb-dictate-panel-layout-v1/)
    assert.match(layoutMod, /saveOrbDictatePanelLayout/)
    assert.match(panels, /saveOrbDictatePanelLayout/)
    assert.equal(loadOrbDictatePanelLayout().preset, '50-50')
  })

  it('transcript panel is editable', () => {
    const panel = readComponent('components/orb/dictate/OrbTranscriptPanel.tsx')
    assert.match(panel, /data-orb-dictate-live-transcript/)
    assert.match(panel, /textarea/)
  })

  it('brain suggestions have accept reject apply', () => {
    const brain = readComponent('components/orb/dictate/OrbDictateBrainPanel.tsx')
    assert.match(brain, /data-orb-brain-accept/)
    assert.match(brain, /data-orb-brain-reject/)
    assert.match(brain, /data-orb-brain-apply/)
  })

  it('suggested output buttons render', () => {
    const outputs = readComponent('components/orb/dictate/OrbDictateSuggestedOutputs.tsx')
    assert.match(outputs, /data-orb-suggested-output/)
    assert.ok(ORB_DICTATE_STUDIO_TEMPLATES.length >= 9)
  })

  it('station opens ORB Write on finalise', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /OrbWriteStation/)
    assert.match(station, /handleFinalise/)
    assert.match(station, /OrbDictateStudioWorkspace/)
  })

  it('ORB Write editor and toolbar render', () => {
    const write = readComponent('components/orb-write/orb-write-station.tsx')
    const editor = readComponent('components/orb-write/orb-write-editor.tsx')
    const toolbar = readComponent('components/orb-write/orb-write-toolbar.tsx')
    assert.match(write, /data-orb-write-station/)
    assert.match(editor, /data-orb-write-editor/)
    assert.match(toolbar, /data-orb-write-toolbar/)
    assert.match(write, /data-orb-write-word-count/)
    assert.match(write, /data-orb-write-export-pdf/)
    assert.match(write, /data-orb-write-print/)
  })

  it('PDF export module excludes UI panels and brain metadata', () => {
    const exportMod = readComponent('lib/orb/write/orb-write-export.ts')
    assert.match(exportMod, /buildOrbWritePrintHtml/)
    assert.match(exportMod, /IndiCare Intelligence/)
    assert.doesNotMatch(exportMod, /brain_metadata/)
    assert.doesNotMatch(exportMod, /data-orb-panel/)
    const write = readComponent('components/orb-write/orb-write-station.tsx')
    assert.match(write, /data-orb-write-export-pdf/)
    assert.match(write, /data-orb-write-print/)
  })

  it('no child profile selector in dictate workspace', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.doesNotMatch(workspace, /child.profile|childProfile|ChildProfile/)
    assert.doesNotMatch(station, /child.profile|childProfile|ChildProfile/)
  })

  it('brain panel does not expose internal metadata labels', () => {
    const brain = readComponent('components/orb/dictate/OrbDictateBrainPanel.tsx')
    assert.doesNotMatch(brain, /brain_metadata/)
    assert.doesNotMatch(brain, /os_records_accessed/)
    assert.doesNotMatch(brain, /indicare_intelligence_core/)
  })
})
