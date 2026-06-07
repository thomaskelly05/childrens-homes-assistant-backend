import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { routeOrbBrainIntent } from './orb-brain-router-intent.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('orb-brain-router', () => {
  it('routes general questions to general assistant path', () => {
    const decision = routeOrbBrainIntent('Explain photosynthesis in simple terms', 'Ask ORB')
    assert.equal(decision.route, 'general_assistant')
  })

  it('routes children\'s homes questions to residential specialist path', () => {
    const decision = routeOrbBrainIntent('What should I record after a missing from care episode?', 'Ask ORB')
    assert.equal(decision.route, 'residential_specialist')
  })

  it('routes current/live/local questions to live lookup extension path', () => {
    const decision = routeOrbBrainIntent('What is the weather in Newcastle today?', 'Ask ORB')
    assert.equal(decision.route, 'live_lookup')
    assert.equal(decision.toolExtension, 'weather')
  })

  it('buildOrbBrainConversationRequest tags voice source for shared brain', () => {
    const router = readFileSync(join(root, 'lib/orb/orb-brain-router.ts'), 'utf8')
    assert.match(router, /buildOrbBrainConversationRequest/)
    assert.match(router, /source: \$\{source\}/)
    assert.match(router, /export async function askOrbBrain/)
  })

  it('voice station wires realtime finals through shared brain send', () => {
    const station = readFileSync(
      join(root, 'components/orb-standalone/orb-voice-station.tsx'),
      'utf8'
    )
    assert.match(station, /brainRouted: true/)
    assert.match(station, /void onSendToOrb\(trimmed\)/)
    assert.match(station, /brainRoutedVoice \? orbTextReply/)
  })

  it('care companion uses askOrbBrain instead of duplicated voice logic', () => {
    const companion = readFileSync(
      join(root, 'components/orb-standalone/orb-care-companion.tsx'),
      'utf8'
    )
    assert.match(companion, /askOrbBrain/)
    assert.match(companion, /source: 'voice'/)
    assert.doesNotMatch(companion, /sendStandaloneOrbMessageStream/)
  })
})
