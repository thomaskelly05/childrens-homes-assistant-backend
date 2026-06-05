import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write word processor', () => {
  it('toolbar renders rich text controls', () => {
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(toolbar, /data-orb-write-toolbar/)
    assert.match(toolbar, /data-orb-write-bold/)
    assert.match(toolbar, /data-orb-write-italic/)
    assert.match(toolbar, /data-orb-write-underline/)
    assert.match(toolbar, /data-orb-write-bullet/)
    assert.match(toolbar, /data-orb-write-numbered/)
    assert.match(toolbar, /data-orb-write-quote/)
    assert.match(toolbar, /data-orb-write-divider/)
    assert.match(toolbar, /data-orb-write-align-left/)
    assert.match(toolbar, /data-orb-write-clear-format/)
    assert.match(toolbar, /data-orb-write-block-style/)
    assert.match(toolbar, /data-orb-write-table/)
  })

  it('zoom controls exist and target document canvas only', () => {
    const editor = read('components/orb-write/orb-write-editor.tsx')
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    const zoom = read('components/orb-write/orb-write-zoom-controls.tsx')
    const zoomLib = read('lib/orb/write/orb-write-zoom.ts')
    assert.match(editor, /data-orb-write-document-canvas/)
    assert.match(editor, /data-orb-write-canvas-workspace/)
    assert.match(editor, /transform: scale/)
    assert.match(toolbar, /data-orb-write-toolbar/)
    assert.match(zoom, /data-orb-write-zoom-controls/)
    assert.match(zoomLib, /orb-write-zoom-v1/)
    assert.doesNotMatch(toolbar, /transform: scale/)
  })

  it('export print save finalise buttons exist', () => {
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(toolbar, /data-orb-write-export-pdf/)
    assert.match(toolbar, /data-orb-write-print/)
    assert.match(toolbar, /data-orb-write-save-draft/)
    assert.match(toolbar, /data-orb-write-finalise|data-orb-write-approve/)
  })

  it('rich text editor uses contenteditable with sanitisation', () => {
    const editor = read('components/orb-write/orb-write-editor.tsx')
    const sanitize = read('lib/orb/write/orb-write-sanitize.ts')
    assert.match(editor, /contentEditable/)
    assert.match(editor, /data-orb-write-body/)
    assert.match(editor, /sanitizeOrbWriteHtml/)
    assert.match(sanitize, /script|iframe/)
  })

  it('AI panel uses governed edit route with child-centred actions', () => {
    const ai = read('components/orb-write/orb-write-ai-panel.tsx')
    const actions = read('lib/orb/write/orb-write-ai-actions.ts')
    assert.match(ai, /editOrbDictateDocument/)
    assert.match(ai, /ORB guidance/)
    assert.doesNotMatch(ai, /IndiCare Brain/)
    assert.match(actions, /Check safeguarding gaps/)
    assert.match(actions, /Check Ofsted readiness/)
    assert.match(actions, /What am I missing/)
    assert.match(ai, /data-orb-write-ai-apply/)
  })

  it('dictate handoff still loads into ORB Write', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const handoff = read('lib/orb/write/orb-write-handoff.ts')
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(panel, /loadOrbWriteHandoff/)
    assert.match(handoff, /orb-write-session-handoff-v1/)
    assert.match(dictate, /OrbWriteStation/)
  })

  it('print page excludes toolbar chrome', () => {
    const css = read('components/orb/premium/orb-premium-v2.css')
    assert.match(css, /@media print/)
    assert.match(css, /data-orb-write-toolbar/)
  })
})
