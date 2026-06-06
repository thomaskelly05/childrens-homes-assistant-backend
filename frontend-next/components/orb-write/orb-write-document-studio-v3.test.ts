import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write document studio v3', () => {
  it('opens document studio editor by default with blank document', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(panel, /data-orb-write-studio-editor/)
    assert.match(panel, /createBlankOrbWriteDocumentFromRecordType/)
    assert.match(panel, /data-orb-write-studio-header/)
    assert.doesNotMatch(panel, /view === 'start'/)
  })

  it('document canvas and word processor toolbar render', () => {
    const editor = read('components/orb-write/orb-write-editor.tsx')
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(editor, /data-orb-write-document-canvas/)
    assert.match(editor, /data-orb-write-print-page/)
    assert.match(toolbar, /data-orb-write-bold/)
    assert.match(toolbar, /data-orb-write-export-pdf/)
    assert.match(toolbar, /data-orb-write-save-draft/)
  })

  it('zoom controls and status footer render', () => {
    const zoom = read('components/orb-write/orb-write-zoom-controls.tsx')
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(zoom, /data-orb-write-zoom-controls/)
    assert.match(panel, /data-orb-write-status-footer/)
    assert.match(panel, /data-orb-write-word-count-display/)
  })

  it('document-first layout with collapsible source and guidance panels', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(panel, /OrbWriteSourcePanel/)
    assert.match(panel, /OrbWriteEditor/)
    assert.match(panel, /data-orb-write-assistant-panel/)
    assert.match(panel, /data-orb-write-document-first/)
    assert.match(panel, /useState\(false\)[\s\S]*sourcePanelOpen/)
    assert.match(panel, /useState\(false\)[\s\S]*guidancePanelOpen/)
  })

  it('content, dictate and template handoffs load into studio', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const handoff = read('lib/orb/write/orb-write-content-handoff.ts')
    assert.match(panel, /loadOrbWriteContentHandoff/)
    assert.match(panel, /loadOrbWriteHandoff/)
    assert.match(panel, /loadOrbWriteTemplateHandoff/)
    assert.match(handoff, /handoffTextToOrbWrite/)
  })
})
