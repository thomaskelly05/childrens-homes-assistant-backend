import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_DICTATE_RECORDING_ATTACHED_TITLE,
  ORB_DICTATE_RECORDING_LOCAL_STORAGE_NOTE,
  ORB_DICTATE_RECORDING_START_FAILED,
  ORB_DICTATE_RECORDING_TRANSCRIPTION_FAILED,
  ORB_DICTATE_RECORDING_UNSUPPORTED,
  ORB_DICTATE_SOURCE_FROM_RECORDING,
  ORB_DICTATE_WRITE_FROM_RECORDING_NOTE
} from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3P Dictate recording media', () => {
  it('build version marker is phase-3p-dictate-recording-media', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-3p-dictate-recording-media')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('dictate record button uses dedicated start handler', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(station, /handleStartDictateRecording/)
    assert.match(station, /beginOrbDictateRecording/)
    assert.match(station, /onStartRecording=\{\(\) => void handleStartDictateRecording\(\)\}/)
    assert.match(workspace, /onClick={handleStartRecording}/)
    assert.match(workspace, /data-orb-dictate-top-record/)
  })

  it('recording unsupported and microphone error copy exist', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.equal(ORB_DICTATE_RECORDING_UNSUPPORTED, 'This browser does not support in-browser recording. Paste notes or upload audio instead.')
    assert.equal(ORB_DICTATE_RECORDING_START_FAILED, 'Recording could not start. Check microphone permission and try again.')
    assert.match(station, /ORB_DICTATE_RECORDING_UNSUPPORTED/)
    assert.match(station, /ORB_DICTATE_RECORDING_START_FAILED/)
  })

  it('recording state shows timer and stop control', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /data-orb-dictate-recording-stage/)
    assert.match(workspace, /props\.formatTimer\(props\.timerSec\)/)
    assert.match(workspace, /onClick={props\.onStopRecording}/)
    assert.match(workspace, /orb-dictate-recording-pulse/)
  })

  it('stopping a recording creates media metadata with required fields', () => {
    const util = read('lib/orb/dictate/orb-dictate-recording-media.ts')
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(util, /filename/)
    assert.match(util, /mimeType/)
    assert.match(util, /sizeBytes/)
    assert.match(util, /durationMs/)
    assert.match(util, /createdAt/)
    assert.match(util, /createOrbDictateRecordingMediaFromBlob/)
    assert.match(util, /buildOrbDictateRecordingFilename/)
    assert.match(station, /createOrbDictateRecordingMediaFromBlob/)
    assert.match(station, /endOrbDictateRecording/)
    assert.match(util, /orb-dictate-recording-/)
  })

  it('transcript workspace shows recording attached panel and playback', () => {
    const panel = read('components/orb/dictate/OrbDictateTranscriptWorkspace.tsx')
    const attachment = read('components/orb/dictate/OrbDictateRecordingAttachment.tsx')
    assert.equal(ORB_DICTATE_RECORDING_ATTACHED_TITLE, 'Recording attached')
    assert.match(panel, /OrbDictateRecordingAttachment/)
    assert.match(panel, /recordingMedia/)
    assert.match(attachment, /data-orb-dictate-recording-playback/)
    assert.match(attachment, /localObjectUrl/)
  })

  it('transcription failure keeps recording attached with honest copy', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.equal(
      ORB_DICTATE_RECORDING_TRANSCRIPTION_FAILED,
      'The recording was saved for this session, but transcription failed. You can replay it and type notes manually.'
    )
    assert.match(station, /status: 'failed'/)
    assert.match(station, /ORB_DICTATE_RECORDING_TRANSCRIPTION_FAILED/)
    assert.match(station, /preservedAudio: true/)
  })

  it('save draft and ORB Write handoff include media metadata without permanent storage claims', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    const handoff = read('lib/orb/write/orb-write-handoff.ts')
    assert.match(station, /serializeOrbDictateRecordingMediaForSave/)
    assert.match(station, /recording_media:/)
    assert.match(handoff, /recording_media\?:/)
    assert.match(handoff, /dictate_capture_source\?:/)
    assert.equal(
      ORB_DICTATE_RECORDING_LOCAL_STORAGE_NOTE,
      'Recording attached locally to this draft. Permanent media storage is not yet enabled.'
    )
    assert.match(station, /ORB_DICTATE_WRITE_FROM_RECORDING_NOTE/)
    assert.equal(ORB_DICTATE_SOURCE_FROM_RECORDING, 'Source: transcript from attached recording')
    assert.doesNotMatch(station, /permanently stored|permanent storage enabled/i)
  })

  it('uses speech-oriented audio constraints and does not encourage covert recording', () => {
    const util = read('lib/orb/dictate/orb-dictate-recording-media.ts')
    const copy = read('lib/orb/dictate/orb-dictate-capture-copy.ts')
    assert.match(util, /echoCancellation: true/)
    assert.match(util, /noiseSuppression: true/)
    assert.match(util, /autoGainControl: true/)
    assert.match(util, /channelCount: 1/)
    assert.match(util, /ORB_DICTATE_RECORDING_AUDIO_CONSTRAINTS/)
    assert.match(copy, /Only record where it is appropriate, transparent/)
    assert.doesNotMatch(copy, /covert|secret recording|without consent/i)
  })

  it('single shell and one CSS import remain true', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-3p-dictate-recording-media/)
    assert.match(read('app/orb/orb-residential-shell.css'), /Phase 3P/)
  })
})
