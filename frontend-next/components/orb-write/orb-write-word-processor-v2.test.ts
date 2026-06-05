import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write word processor v2', () => {
  it('standalone panel uses three-column studio editor layout', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(panel, /OrbStudioShell/)
    assert.match(panel, /OrbWriteSourcePanel/)
    assert.match(panel, /data-orb-write-assistant-panel/)
    assert.match(panel, /data-orb-write-studio-editor/)
    assert.match(panel, /lg:grid-cols-\[260px_1fr_300px\]/)
  })

  it('source panel shows dictate template and draft actions', () => {
    const source = read('components/orb-write/orb-write-source-panel.tsx')
    assert.match(source, /data-orb-write-source-panel/)
    assert.match(source, /data-orb-write-source-dictate/)
    assert.match(source, /data-orb-write-source-template/)
  })

  it('start screen uses premium studio hero and action rail', () => {
    const start = read('components/orb-write/orb-write-start-screen.tsx')
    assert.match(start, /OrbStudioHero/)
    assert.match(start, /OrbStudioActionRail/)
    assert.match(start, /data-orb-write-generate/)
    assert.match(start, /data-orb-write-option-paste/)
  })

  it('document canvas and toolbar controls preserved', () => {
    const editor = read('components/orb-write/orb-write-editor.tsx')
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(editor, /data-orb-write-document-canvas/)
    assert.match(editor, /orb-studio-document-canvas-workspace/)
    assert.match(editor, /data-orb-write-print-page/)
    assert.match(toolbar, /data-orb-write-bold/)
    const zoom = read('components/orb-write/orb-write-zoom-controls.tsx')
    assert.match(zoom, /data-orb-write-zoom-controls/)
    assert.match(editor, /data-orb-write-zoom/)
    assert.match(toolbar, /data-orb-write-export-pdf/)
    assert.match(toolbar, /data-orb-write-save-draft/)
  })

  it('AI panel uses governed edit route without brain metadata', () => {
    const ai = read('components/orb-write/orb-write-ai-panel.tsx')
    assert.match(ai, /editOrbDictateDocument/)
    assert.match(ai, /data-orb-write-ai-panel/)
    assert.doesNotMatch(ai, /IndiCare Brain/)
    assert.doesNotMatch(ai, /brain_metadata/)
  })

  it('dictate and template handoffs still load into ORB Write', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(panel, /loadOrbWriteHandoff/)
    assert.match(panel, /loadOrbWriteTemplateHandoff/)
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /OrbWriteStation|openInOrbWrite|orb-write/)
  })
})
