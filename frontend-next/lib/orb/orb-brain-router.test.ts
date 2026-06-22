import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB brain router convergence', () => {
  it('exports canonical brain entrypoint aliases', () => {
    const router = readSource('lib/orb/orb-brain-router.ts')
    assert.match(router, /export async function askOrbBrain/)
    assert.match(router, /export const runOrbBrain = askOrbBrain/)
    assert.match(router, /export const createOrbResponse = askOrbBrain/)
    assert.match(router, /export \{ routeOrbBrainIntent \}/)
  })

  it('routes general prompts to general_assistant by default', () => {
    const intent = readSource('lib/orb/orb-brain-router-intent.ts')
    assert.match(intent, /general_assistant/)
    assert.match(intent, /Everyday assistant question/)
  })

  it('routes residential prompts to residential_specialist', () => {
    const intent = readSource('lib/orb/orb-brain-router-intent.ts')
    assert.match(intent, /residential_specialist/)
    assert.match(intent, /children's home/)
  })

  it('routes live lookup prompts with tool extensions', () => {
    const intent = readSource('lib/orb/orb-brain-router-intent.ts')
    assert.match(intent, /live_lookup/)
    assert.match(intent, /weather/)
    assert.match(intent, /resolveLiveToolExtension/)
  })

  it('sends structured brain routing hints without mutating the user message', () => {
    const router = readSource('lib/orb/orb-brain-router.ts')
    assert.match(router, /source_surface/)
    assert.match(router, /client_route_hint/)
    assert.match(router, /routeOrbBrainIntent/)
    assert.match(router, /buildOrbBrainConversationRequest/)
    assert.match(router, /requested_action: 'voice_conversation'/)
    assert.match(router, /requested_action: 'residential_guided_chat'/)
    assert.doesNotMatch(router, /\[ORB brain routing\]/)
  })

  it('voice and chat share brain routing in care companion', () => {
    const companion = readSource('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /buildOrbBrainConversationRequest/)
    assert.match(companion, /queryStandaloneOrbConversation/)
    assert.match(companion, /source: voiceOriginatedSend \? 'voice' : 'chat'/)
  })

  it('minimal chat routes through askOrbBrain', () => {
    const minimal = readSource('components/orb-standalone/orb-minimal-chat.tsx')
    assert.match(minimal, /askOrbBrain/)
    assert.doesNotMatch(minimal, /queryStandaloneOrbConversation/)
  })

  it('dictate client uses document brain API path', () => {
    const dictate = readSource('lib/orb/dictate/orb-dictate-client.ts')
    assert.match(dictate, /\/orb\/dictate\//)
  })

  it('write receives voice content via converged handoff with voice source', () => {
    const voice = readSource('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /data-orb-voice-open-write/)
    assert.match(voice, /ORB_VOICE_V2_SUMMARY_TITLE|title: 'Voice reflection'/)
    const companion = readSource('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /source: 'voice'/)
    const handoff = readSource('lib/orb/write/orb-write-converged-handoff.ts')
    assert.match(handoff, /convergedHandoffToOrbWrite/)
  })

  it('shared residential quality client exists', () => {
    const quality = readSource('lib/orb/residential/orb-residential-quality.ts')
    assert.match(quality, /\/orb\/standalone\/quality-check/)
    assert.match(quality, /ORB_SHARED_CAPTURE_PROMPTS/)
  })
})
