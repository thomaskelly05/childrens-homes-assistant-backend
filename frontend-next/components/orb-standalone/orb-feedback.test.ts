import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB message feedback UI', () => {
  it('feedback component renders thumbs up and down', () => {
    const feedback = readComponent('components/orb-standalone/orb-message-feedback.tsx')
    assert.match(feedback, /data-orb-feedback-up/)
    assert.match(feedback, /data-orb-feedback-down/)
    assert.match(feedback, /aria-label="Helpful answer"/)
  })

  it('thumbs down opens reason box', () => {
    const feedback = readComponent('components/orb-standalone/orb-message-feedback.tsx')
    assert.match(feedback, /data-orb-feedback-reason-box/)
    assert.match(feedback, /data-orb-feedback-reason-select/)
    assert.match(feedback, /What did ORB miss or get wrong/)
  })

  it('submit feedback calls API client', () => {
    const feedback = readComponent('components/orb-standalone/orb-message-feedback.tsx')
    assert.match(feedback, /submitStandaloneOrbFeedback/)
    const client = readComponent('lib/orb/standalone-client.ts')
    assert.match(client, /export async function submitStandaloneOrbFeedback/)
  })

  it('thank-you state renders', () => {
    const feedback = readComponent('components/orb-standalone/orb-message-feedback.tsx')
    assert.match(feedback, /data-orb-feedback-thanks/)
    assert.match(feedback, /Thanks — this helps improve ORB/)
  })

  it('care companion wires feedback on completed assistant messages', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbMessageFeedback/)
    assert.match(companion, /entry\.status === 'complete'/)
  })

  it('older messages keep feedback buttons', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const feedbackIdx = companion.indexOf('<OrbMessageFeedback')
    assert.ok(feedbackIdx >= 0)
    const snippet = companion.slice(feedbackIdx, feedbackIdx + 900)
    assert.doesNotMatch(snippet, /isLatest=\{index === visibleMessages\.length - 1\}/)
  })
})

describe('ORB data safety copy', () => {
  it('help panel includes data safety section without overpromise', () => {
    const help = readComponent('components/orb-standalone/orb-help-panel.tsx')
    assert.match(help, /How ORB protects your data/)
    assert.match(help, /does not access IndiCare OS/)
    assert.doesNotMatch(help, /100% safe/i)
  })

  it('settings privacy includes data safety section', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /data-orb-settings-data-safety/)
    assert.match(settings, /How ORB protects your data/)
    assert.doesNotMatch(settings, /100% safe/i)
  })
})
