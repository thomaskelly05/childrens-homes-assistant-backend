import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate recorder studio v3', () => {
  it('recorder bar renders with record, analyse, generate and open in write', () => {
    const topBar = read('components/orb/dictate/OrbDictateTopBar.tsx')
    assert.match(topBar, /data-orb-dictate-recorder-bar/)
    assert.match(topBar, /data-orb-dictate-top-record/)
    assert.match(topBar, /data-orb-dictate-generate/)
    assert.match(topBar, /data-orb-dictate-finalise/)
    assert.match(topBar, /Open in ORB Write/)
  })

  it('transcript and ORB analysis panels render in studio workspace', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const transcript = read('components/orb/dictate/OrbTranscriptPanel.tsx')
    const brain = read('components/orb/dictate/OrbDictateBrainPanel.tsx')
    assert.match(workspace, /OrbTranscriptPanel/)
    assert.match(workspace, /OrbDictateBrainPanel/)
    assert.match(transcript, /data-orb-transcript-panel/)
    assert.match(brain, /data-orb-dictate-brain-panel|OrbDictateBrainPanel/)
  })

  it('bottom output rail and privacy strip remain', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const privacy = read('components/orb/dictate/OrbDictatePrivacyStrip.tsx')
    assert.match(workspace, /data-orb-dictate-action-rail/)
    assert.match(workspace, /OrbDictateSuggestedOutputs/)
    assert.match(workspace, /OrbDictatePrivacyStrip/)
    assert.match(privacy, /data-orb-dictate-privacy-strip/)
  })

  it('dictate handoff to ORB Write preserved', () => {
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /saveOrbWriteHandoff/)
    assert.match(dictate, /OrbWriteStation|onFinalise/)
  })

  it('voice station remains unchanged aside from navigation shell', () => {
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /presentation="workspace"/)
    assert.doesNotMatch(voice, /OrbDictateStudioWorkspace/)
  })
})
