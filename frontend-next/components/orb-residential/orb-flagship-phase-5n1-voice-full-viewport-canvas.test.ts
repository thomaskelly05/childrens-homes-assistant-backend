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

describe('ORB Residential Phase 5N.1 Voice full viewport canvas', () => {
  it('build marker is phase-5n3-voice-fast-capture-modern-ui', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5n3-voice-fast-capture-modern-ui')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5n3-voice-fast-capture-modern-ui/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('Voice workspace exposes full viewport data attribute', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(station, /data-orb-voice-full-viewport="true"/)
    assert.match(content, /data-orb-voice-full-viewport="true"/)
    assert.match(content, /data-orb-voice-one-screen-workspace/)
  })

  it('removes centred max-width constraint from Voice grid', () => {
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(content, /max-w-none/)
    assert.doesNotMatch(content, /max-w-\[88rem\]/)
    assert.match(shell, /\[data-orb-voice-full-viewport='true'\][\s\S]*max-width: none/)
  })

  it('main stage and wave scale with viewport clamps', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(shell, /min-height: calc\(100vh - 96px\)/)
    assert.match(shell, /min-height: clamp\(640px, 76vh, 860px\)/)
    assert.match(shell, /clamp\(260px, 24vw, 420px\)/)
    assert.match(shell, /clamp\(460px, 58vh, 680px\)/)
    assert.match(shell, /clamp\(720px, 70vw, 1100px\)/)
  })

  it('right rail is integrated cockpit side rail on desktop', () => {
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(content, /md:min-w-\[23\.75rem\]/)
    assert.match(content, /md:max-w-\[28\.75rem\]/)
    assert.match(shell, /minmax\(380px, 440px\)|clamp\(380px, 28vw, 460px\)/)
    assert.match(shell, /grid-template-columns: minmax\(0, 1fr\) minmax\(380px, 440px\)/)
    assert.match(rail, /h-full/)
  })

  it('setup stays in rail and Start conversation remains visible', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    assert.match(station, /openVoiceSetup/)
    assert.match(rail, /label: 'Voice setup'/)
    assert.match(station, /data-orb-voice-start-conversation/)
    assert.doesNotMatch(station, /voiceSettingsOpen/)
  })

  it('one shell CSS import with voice v2 and realtime routes unchanged', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(client, /\/orb\/voice\/v2\/status/)
    assert.match(read('../routers/orb_voice_residential_routes.py'), /\/realtime\/status/)
    assert.doesNotMatch(read('lib/orb/voice-v2/orb-voice-v2-copy.ts'), /compliance guarantee|ofsted approved/i)
  })
})
