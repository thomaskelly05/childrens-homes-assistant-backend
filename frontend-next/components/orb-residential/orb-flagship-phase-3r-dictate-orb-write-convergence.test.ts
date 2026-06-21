import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_DICTATE_PEOPLE_CONFIRM_DISCLAIMER,
  ORB_DICTATE_PEOPLE_CONFIRM_TITLE,
  ORB_DICTATE_RECORDING_AS_PREFIX,
  ORB_DICTATE_RECORDING_LOCAL_PERSISTENCE_NOTE,
  ORB_DICTATE_SPEAKER_DETECTION_NOTE,
  ORB_DICTATE_WHAT_ARE_YOU_RECORDING,
  ORB_DICTATE_WRITE_TRANSITION_BODY,
  ORB_DICTATE_WRITE_TRANSITION_TITLE
} from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3R Dictate ORB Write convergence', () => {
  it('build version marker is phase-3t-dictate-transcript-data-flow', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-3t-dictate-transcript-data-flow')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('first Dictate screen uses template dropdown select', () => {
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    const selector = read('components/orb/dictate/OrbDictateWriteTemplateSelector.tsx')
    assert.equal(ORB_DICTATE_WHAT_ARE_YOU_RECORDING, 'What are you recording?')
    assert.match(capture, /data-orb-dictate-what-are-you-recording/)
    assert.match(selector, /data-orb-dictate-template-select/)
    assert.match(selector, /<select/)
    assert.doesNotMatch(selector, /role="listitem"/)
  })

  it('selected template displays as Recording as prefix with primary record button', () => {
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    assert.equal(ORB_DICTATE_RECORDING_AS_PREFIX, 'Recording as:')
    assert.match(capture, /data-orb-dictate-recording-as/)
    assert.match(capture, /data-orb-dictate-hero-record/)
  })

  it('document workspace uses ORB Write-style document surface hooks', () => {
    const working = read('components/orb/dictate/OrbDictateWorkingDocument.tsx')
    const workspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    assert.match(working, /data-orb-write-canvas-workspace/)
    assert.match(working, /data-orb-write-print-page/)
    assert.match(working, /data-orb-write-review-badge/)
    assert.match(workspace, /data-orb-dictate-orb-write-converged/)
  })

  it('people and speakers to confirm appears near the top with cautious copy', () => {
    const workspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    const people = read('components/orb/dictate/OrbDictatePeopleConfirm.tsx')
    assert.equal(ORB_DICTATE_PEOPLE_CONFIRM_TITLE, 'People and speakers to confirm')
    assert.equal(ORB_DICTATE_PEOPLE_CONFIRM_DISCLAIMER, 'ORB may identify speakers or people mentioned, but adults must confirm accuracy.')
    assert.match(workspace, /data-orb-dictate-people-confirm-top/)
    assert.match(people, /data-orb-dictate-people-confirm-disclaimer/)
    assert.equal(ORB_DICTATE_SPEAKER_DETECTION_NOTE, 'Speaker detection is suggested for adult confirmation.')
  })

  it('assistant rail keeps active free-text instruction and applies to working document', () => {
    const assistant = read('components/orb/dictate/OrbDictateEditAssistant.tsx')
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(assistant, /data-orb-dictate-edit-instruction/)
    assert.match(studio, /editOrbDictateDocument/)
    assert.match(studio, /setWorkingDocument\(result\.revised_text\)/)
  })

  it('workspace document type uses dropdown and reshapes headings on change', () => {
    const workspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    const selector = read('components/orb/dictate/OrbDictateWriteTemplateSelector.tsx')
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /OrbDictateWriteTemplateSelector/)
    assert.match(selector, /data-orb-dictate-template-select/)
    assert.match(studio, /reshapeWorkingDocument/)
    assert.match(studio, /ORB_DICTATE_DOCUMENT_STRUCTURE_UPDATED/)
  })

  it('Open in ORB Write shows transition modal with handoff checklist language', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    const modal = read('components/orb/dictate/OrbDictateWriteTransitionModal.tsx')
    assert.equal(ORB_DICTATE_WRITE_TRANSITION_TITLE, 'Opening in ORB Write')
    assert.match(ORB_DICTATE_WRITE_TRANSITION_BODY, /preparing this working document in ORB Write/)
    assert.match(modal, /data-orb-dictate-write-transition-modal/)
    assert.match(modal, /working_document/)
    assert.match(modal, /adult_review/)
    assert.match(station, /handleRequestOpenInWrite/)
    assert.match(station, /OrbDictateWriteTransitionModal/)
  })

  it('sidebar navigation remains usable and back returns to capture station', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    const workspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(station, /data-orb-dictate-sidebar-safe/)
    assert.match(workspace, /data-orb-dictate-sidebar-safe/)
    assert.match(station, /handleDictateWorkspaceClose/)
    assert.match(station, /handleClearTranscript/)
    assert.match(sidebar, /data-orb-sidebar-dictate/)
    assert.match(workspace, /data-orb-dictate-capture-again/)
  })

  it('processing states appear after recording stop with cautious diarisation wording', () => {
    const copy = read('lib/orb/dictate/orb-dictate-capture-copy.ts')
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(copy, /Saving recording/)
    assert.match(copy, /Transcribing audio/)
    assert.match(copy, /Identifying speakers to confirm/)
    assert.match(station, /processingStage/)
    assert.match(copy, /ORB may identify speakers/)
    assert.doesNotMatch(copy, /perfect diarisation|guaranteed speaker/i)
  })

  it('permanent recording storage is not overclaimed', () => {
    const persistence = read('lib/orb/dictate/orb-dictate-media-persistence.ts')
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.equal(
      ORB_DICTATE_RECORDING_LOCAL_PERSISTENCE_NOTE,
      'Recording attached locally. Permanent recording storage is not yet enabled.'
    )
    assert.match(persistence, /permanent_not_enabled/)
    assert.doesNotMatch(station, /permanently stored|permanent storage enabled/i)
  })

  it('single shell and one CSS import remain true without compliance guarantee language', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-3t-dictate-transcript-data-flow/)
    assert.doesNotMatch(workspace, /guarantee compliance|Ofsted approved/i)
  })
})
