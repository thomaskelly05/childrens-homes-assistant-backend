import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write standalone studio', () => {
  it('menu item renders in residential sidebar', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /orb_write/)
    assert.match(sidebar, /ORB Write/)
    assert.match(sidebar, /data-orb-sidebar-station/)
    const dictateIdx = sidebar.indexOf("'orb_dictate'")
    const writeIdx = sidebar.indexOf("'orb_write'")
    const shiftIdx = sidebar.indexOf("'shift_builder'")
    assert.ok(dictateIdx > -1 && writeIdx > dictateIdx && shiftIdx > writeIdx)
  })

  it('standalone panel registered in care companion', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbWriteStandalonePanel/)
    assert.match(companion, /activePanel === 'orb_write'/)
    assert.match(companion, /openOrbWritePanel/)
    assert.match(companion, /stationParam === 'write'/)
  })

  it('direct route redirects to station=write', () => {
    const page = readComponent('app/orb-residential/write/page.tsx')
    assert.match(page, /station=write/)
  })

  it('start screen renders paste input and record type selector', () => {
    const start = readComponent('components/orb-write/orb-write-start-screen.tsx')
    assert.match(start, /data-orb-write-start-screen/)
    assert.match(start, /data-orb-write-rough-input/)
    assert.match(start, /data-orb-write-record-type-selector/)
    assert.match(start, /ORB_RECORDING_RECORD_TYPES/)
    assert.match(start, /general_dictation/)
    assert.match(start, /daily_record/)
    assert.match(start, /incident_report/)
  })

  it('analyse and generate buttons appear', () => {
    const start = readComponent('components/orb-write/orb-write-start-screen.tsx')
    assert.match(start, /data-orb-write-analyse/)
    assert.match(start, /Analyse with ORB/)
    assert.match(start, /data-orb-write-generate/)
    assert.match(start, /Generate Draft/)
  })

  it('print-style document canvas renders', () => {
    const editor = readComponent('components/orb-write/orb-write-editor.tsx')
    assert.match(editor, /data-orb-write-document-canvas/)
    assert.match(editor, /data-orb-write-print-page/)
    assert.match(editor, /data-orb-write-record-type-badge/)
    assert.match(editor, /data-orb-write-datetime/)
    assert.match(editor, /data-orb-write-export-footer/)
    assert.match(editor, /210mm/)
  })

  it('zoom controls render and persist locally', () => {
    const zoom = readComponent('components/orb-write/orb-write-zoom-controls.tsx')
    const zoomLib = readComponent('lib/orb/write/orb-write-zoom.ts')
    const toolbar = readComponent('components/orb-write/orb-write-toolbar.tsx')
    assert.match(zoom, /data-orb-write-zoom-controls/)
    assert.match(zoom, /data-orb-write-zoom-in/)
    assert.match(zoom, /data-orb-write-zoom-out/)
    assert.match(zoom, /data-orb-write-zoom-fit-width/)
    assert.match(zoom, /data-orb-write-zoom-100/)
    assert.match(zoomLib, /orb-write-zoom-v1/)
    assert.match(toolbar, /OrbWriteZoomControls/)
  })

  it('dictate handoff still uses OrbWriteStation', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const handoff = readComponent('lib/orb/write/orb-write-handoff.ts')
    assert.match(dictate, /OrbWriteStation/)
    assert.match(dictate, /saveOrbWriteHandoff/)
    assert.match(handoff, /orb-write-session-handoff-v1/)
  })

  it('standalone loads dictate handoff from sessionStorage', () => {
    const panel = readComponent('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(panel, /loadOrbWriteHandoff/)
    assert.match(panel, /handoffToOrbWriteDocument/)
  })

  it('export PDF and print buttons render in toolbar', () => {
    const toolbar = readComponent('components/orb-write/orb-write-toolbar.tsx')
    assert.match(toolbar, /data-orb-write-export-pdf/)
    assert.match(toolbar, /data-orb-write-print/)
  })

  it('AI side panel uses governed edit route', () => {
    const ai = readComponent('components/orb-write/orb-write-ai-panel.tsx')
    assert.match(ai, /data-orb-write-ai-panel/)
    assert.match(ai, /editOrbDictateDocument/)
    assert.match(ai, /OrbDictateStudioAssistant/)
    assert.doesNotMatch(ai, /brain_metadata/)
  })

  it('no child profile selector in standalone write', () => {
    const panel = readComponent('components/orb-write/orb-write-standalone-panel.tsx')
    const start = readComponent('components/orb-write/orb-write-start-screen.tsx')
    assert.doesNotMatch(panel, /child.profile|childProfile|ChildProfile/)
    assert.doesNotMatch(start, /child.profile|childProfile|ChildProfile/)
  })
})
