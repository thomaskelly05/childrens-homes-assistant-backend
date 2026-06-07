import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { routeOrbBrainIntent } from './orb-brain-router-intent.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function buildRoutingMessage(
  message: string,
  mode: string,
  source: 'chat' | 'voice' = 'chat'
): string {
  const route = routeOrbBrainIntent(message, mode, { source })
  return [
    '[ORB brain routing]',
    `source: ${source}`,
    `route: ${route.route}`,
    route.toolExtension ? `tool_extension: ${route.toolExtension}` : null
  ]
    .filter(Boolean)
    .join('\n')
    .concat('\n\n', message)
}

describe('orb-brain-router', () => {
  it('routes general questions to general assistant path', () => {
    const examples = [
      'Explain quantum computing simply.',
      'Help me plan a birthday party.',
      'Write me a polite email.',
      'What is the capital of France?',
      'Help me with Excel.'
    ]
    for (const message of examples) {
      const decision = routeOrbBrainIntent(message, 'Ask ORB')
      assert.equal(decision.route, 'general_assistant', message)
    }
  })

  it('routes unknown or unclear intent to general assistant, not unsupported', () => {
    const decision = routeOrbBrainIntent('asdkjhasdkjh random unclear question', 'Ask ORB')
    assert.equal(decision.route, 'general_assistant')
    assert.doesNotMatch(decision.reason, /unsupported/i)
  })

  it('routes children\'s homes questions to residential specialist path', () => {
    const examples = [
      'What should I record after a missing from care episode?',
      'Help me write a safeguarding chronology.',
      'What should a registered manager evidence for Ofsted?'
    ]
    for (const message of examples) {
      const decision = routeOrbBrainIntent(message, 'Ask ORB')
      assert.equal(decision.route, 'residential_specialist', message)
    }
  })

  it('routes current/live/local questions to live lookup extension path', () => {
    const decision = routeOrbBrainIntent('What is the weather in Newcastle today?', 'Ask ORB')
    assert.equal(decision.route, 'live_lookup')
    assert.equal(decision.toolExtension, 'weather')
  })

  it('routes document and drafting tasks to document workspace', () => {
    const decision = routeOrbBrainIntent('Turn these rough notes into a daily record.', 'Ask ORB')
    assert.equal(decision.route, 'document_workspace')
  })

  it('voice transcript with general question uses general assistant route metadata', () => {
    const prepared = buildRoutingMessage('Write a poem about the sea.', 'Ask ORB', 'voice')
    assert.match(prepared, /route: general_assistant/)
    assert.match(prepared, /source: voice/)
  })

  it('voice transcript with children\'s homes question uses specialist route metadata', () => {
    const prepared = buildRoutingMessage(
      'What should I record after a missing from care episode?',
      'Ask ORB',
      'voice'
    )
    assert.match(prepared, /route: residential_specialist/)
    assert.match(prepared, /source: voice/)
  })

  it('chat and voice use the same routing for identical questions', () => {
    const message = 'Give me ideas for a LinkedIn post.'
    const chatRoute = routeOrbBrainIntent(message, 'Ask ORB', { source: 'chat' })
    const voiceRoute = routeOrbBrainIntent(message, 'Ask ORB', { source: 'voice' })
    assert.deepEqual(chatRoute, voiceRoute)
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

  it('buildOrbBrainConversationRequest prepends routing block without rejecting unknown routes', () => {
    const prepared = buildRoutingMessage('Something completely novel and unclassified', 'Ask ORB')
    assert.match(prepared, /\[ORB brain routing\]/)
    assert.match(prepared, /route: general_assistant/)
    assert.doesNotMatch(prepared, /unsupported/i)
  })
})
