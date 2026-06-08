import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB safety acceptance gate', () => {
  it('renders required safety copy and four checkbox statements', () => {
    const screen = read('components/orb-residential/orb-safety-acceptance.tsx')
    assert.match(screen, /Before using ORB Residential/)
    assert.match(screen, /ORB supports residential childcare professionals/)
    assert.match(screen, /data-orb-safety-checkbox=/)
    assert.match(screen, /professional judgement/)
    assert.match(screen, /safeguarding policy/)
    assert.match(screen, /review, edit and approve ORB outputs/)
    assert.match(screen, /does not access live IndiCare OS care records/)
    assert.equal((screen.match(/data-orb-safety-checkbox/g) || []).length, 4)
  })

  it('requires all checkboxes before enabling accept', () => {
    const screen = read('components/orb-residential/orb-safety-acceptance.tsx')
    assert.match(screen, /allAccepted/)
    assert.match(screen, /disabled=\{submitting \|\| !allAccepted\}/)
    assert.match(screen, /Please confirm all safety statements/)
  })

  it('posts safety acceptance to the ORB safety endpoint', () => {
    const screen = read('components/orb-residential/orb-safety-acceptance.tsx')
    assert.match(screen, /acceptOrbSafety\(ORB_SAFETY_VERSION\)/)
    const client = read('lib/orb/orb-billing-client.ts')
    assert.match(client, /safetyAccept: '\/orb\/standalone\/safety\/accept'/)
  })

  it('auth gate shows safety acceptance UI instead of generic retry', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'safety_required'[\s\S]*OrbSafetyAcceptance/)
    assert.doesNotMatch(
      gate,
      /case 'safety_required'[\s\S]*Safety acceptance is required before using ORB Residential/
    )
  })

  it('after acceptance refreshes front-door verdict without routing to login', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /handleSafetyAccepted/)
    assert.match(gate, /loadVerdict\(\{ force: true \}\)/)
    assert.match(gate, /onAccepted=\{handleSafetyAccepted\}/)
    assert.doesNotMatch(gate, /case 'safety_required'[\s\S]*router\.push\('\/orb\/login'\)/)
  })

  it('back to sign in is wired for intentional logout', () => {
    const screen = read('components/orb-residential/orb-safety-acceptance.tsx')
    assert.match(screen, /data-orb-safety-back-to-sign-in/)
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /onBackToSignIn=\{handleBackToSignIn\}/)
    assert.match(gate, /handleBackToSignIn[\s\S]*auth\.logout/)
  })
})
