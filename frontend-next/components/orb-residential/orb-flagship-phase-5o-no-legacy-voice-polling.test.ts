import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      walkTsFiles(full, acc)
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      acc.push(full)
    }
  }
  return acc
}

describe('ORB Residential Phase 5O no legacy voice polling', () => {
  it('active frontend does not call /orb/voice/session/status', () => {
    const frontendRoot = join(root, 'components')
    const libRoot = join(root, 'lib')
    const offenders: string[] = []
    for (const file of [...walkTsFiles(frontendRoot), ...walkTsFiles(libRoot)]) {
      const source = readFileSync(file, 'utf8')
      if (source.includes('/orb/voice/session/status')) {
        offenders.push(file.replace(`${root}/`, ''))
      }
    }
    assert.deepEqual(offenders, [])
  })

  it('fetchOrbVoiceRealtimeStatus uses v2 and realtime probes only', () => {
    const source = read('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(source, /\/orb\/voice\/realtime\/status/)
    assert.match(source, /\/orb\/voice\/v2\/status/)
    assert.doesNotMatch(source, /\/orb\/voice\/session\/status/)
  })

  it('active Voice uses useOrbVoiceV2 only', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(station, /useOrbVoiceV2\(open\)/)
    assert.doesNotMatch(station, /useOrbVoice\(/)
    assert.match(hook, /fetchOrbVoiceV2Status/)
    assert.match(hook, /fetchOrbVoiceRealtimeBetaStatus/)
  })

  it('Voice setup remains single active rail tab', () => {
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    assert.match(rail, /data-orb-voice-live-rail/)
    assert.doesNotMatch(rail, /OrbVoiceSetupPanelDuplicate/)
  })

  it('active capture mode copy is browser/runtime honest', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-active-capture-mode/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-runtime-mode.ts'), /WebRTC capture active/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-runtime-mode.ts'), /Standard capture on Safari/)
  })

  it('v2 fallback routes remain', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
  })
})
