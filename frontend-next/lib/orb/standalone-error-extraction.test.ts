import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  extractOrbErrorPayload,
  isStandaloneOrbSafetyAcceptanceCode,
  ORB_SAFETY_ACCEPTANCE_MESSAGE,
  ORB_SAFETY_ONBOARDING_PATH
} from './standalone-error-payload.ts'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('extractOrbErrorPayload', () => {
  it('reads safety_acceptance_required from FastAPI detail.message', () => {
    const extracted = extractOrbErrorPayload({
      detail: {
        error: 'safety_acceptance_required',
        message: ORB_SAFETY_ACCEPTANCE_MESSAGE,
        os_access_granted: false
      }
    })
    assert.equal(extracted.code, 'safety_acceptance_required')
    assert.equal(extracted.message, ORB_SAFETY_ACCEPTANCE_MESSAGE)
  })

  it('reads top-level code and message', () => {
    const extracted = extractOrbErrorPayload({
      code: 'auth_required',
      message: 'Please sign in to use ORB Residential.'
    })
    assert.equal(extracted.code, 'auth_required')
    assert.match(extracted.message || '', /sign in/i)
  })

  it('reads string detail', () => {
    const extracted = extractOrbErrorPayload({ detail: 'Forbidden' })
    assert.equal(extracted.message, 'Forbidden')
  })
})

describe('safety acceptance ORB errors', () => {
  it('parseStandaloneOrbSendError surfaces safety message and flag', () => {
    const client = readFileSync(join(root, 'orb/standalone-client.ts'), 'utf8')
    assert.match(client, /safetyAcceptanceRequired: true/)
    assert.match(client, /isStandaloneOrbSafetyAcceptanceCode\(error\.code\)/)
  })

  it('does not treat safety acceptance as auth_required', () => {
    const api = readFileSync(join(root, 'auth/api.ts'), 'utf8')
    assert.match(api, /safety_acceptance/)
    assert.equal(isStandaloneOrbSafetyAcceptanceCode('safety_acceptance_required'), true)
  })

  it('auth_required still maps to sign-in for 401', () => {
    const client = readFileSync(join(root, 'orb/standalone-client.ts'), 'utf8')
    assert.match(client, /error\.status === 401/)
    assert.match(client, /ORB_AUTH_SIGN_IN_MESSAGE/)
  })
})

describe('ORB UI safety acceptance routing', () => {
  it('conversation and stream clients throw safety-specific AuthApiError', () => {
    const client = readFileSync(join(root, 'orb/standalone-client.ts'), 'utf8')
    assert.match(client, /throwIfSafetyAcceptanceRequired/)
    assert.match(client, /extractOrbErrorPayload/)
    assert.match(client, /safety_acceptance_required/)
  })

  it('care companion shows safety CTA not generic failure', () => {
    const companion = readFileSync(
      join(root, '..', 'components/orb-standalone/orb-care-companion.tsx'),
      'utf8'
    )
    assert.match(companion, /OrbSafetyAcceptanceCallToAction/)
    assert.match(companion, /data-orb-safety-acceptance-cta/)
    assert.match(companion, /ORB_SAFETY_ONBOARDING_PATH/)
    assert.match(companion, /isStandaloneOrbSafetyAcceptanceMessage/)
    assert.doesNotMatch(companion, /ORB could not finish that response[\s\S]*OrbSafetyAcceptanceCallToAction/)
  })

  it('safety CTA links to onboarding', () => {
    const guest = readFileSync(join(root, 'orb/standalone-guest-response.ts'), 'utf8')
    assert.equal(ORB_SAFETY_ONBOARDING_PATH, '/orb/onboarding')
    assert.match(guest, /isStandaloneOrbSafetyAcceptanceMessage/)
    assert.match(guest, /accept orb residential safety statements before use/i)
  })
})

describe('profile safety state', () => {
  it('account hook and drawer expose safety accepted', () => {
    const hook = readFileSync(join(root, '..', 'hooks/use-orb-account-state.ts'), 'utf8')
    const drawer = readFileSync(
      join(root, '..', 'components/orb-standalone/orb-adult-profile-drawer.tsx'),
      'utf8'
    )
    assert.match(hook, /safetyAccepted/)
    assert.match(hook, /safety_accepted/)
    assert.match(drawer, /data-orb-account-safety-state/)
    assert.match(drawer, /Safety accepted:/)
    assert.match(drawer, /data-orb-account-safety-warning/)
  })
})
