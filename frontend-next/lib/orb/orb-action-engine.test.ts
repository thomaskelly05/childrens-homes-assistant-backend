import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  BACKEND_SUPPORTED_ORB_RESPONSE_ACTIONS,
  backendOrbActionIdForFollowUp,
  isBackendSupportedOrbResponseAction
} from './orb-response-actions.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const clientSource = readFileSync(join(root, 'lib/orb/standalone-client.ts'), 'utf8')
const companionSource = readFileSync(
  join(root, 'components/orb-standalone/orb-care-companion.tsx'),
  'utf8'
)

test('backend-supported actions include What am I missing', () => {
  assert.equal(isBackendSupportedOrbResponseAction('what_missing'), true)
  assert.equal(backendOrbActionIdForFollowUp('what_missing'), 'what_am_i_missing')
})

test('fallback actions are not backend-supported', () => {
  assert.equal(isBackendSupportedOrbResponseAction('more_concise'), false)
  assert.equal(isBackendSupportedOrbResponseAction('shift_builder'), false)
})

test('standalone client exposes actions/run', () => {
  assert.match(clientSource, /actionsRun: '\/orb\/standalone\/actions\/run'/)
  assert.match(clientSource, /runStandaloneOrbAction/)
})

test('care companion calls runStandaloneOrbAction for supported follow-ups', () => {
  assert.match(companionSource, /runStandaloneOrbAction/)
  assert.match(companionSource, /isBackendSupportedOrbResponseAction/)
  assert.match(companionSource, /prefillOrbFollowUpComposer/)
})

test('backend supported set covers primary residential actions', () => {
  for (const action of [
    'what_missing',
    'recording_wording',
    'manager_oversight',
    'safeguarding_lens',
    'ofsted_lens'
  ] as const) {
    assert.ok(BACKEND_SUPPORTED_ORB_RESPONSE_ACTIONS.has(action))
  }
})
