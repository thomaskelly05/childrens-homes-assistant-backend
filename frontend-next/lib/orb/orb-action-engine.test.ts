import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  BACKEND_ORB_STANDALONE_ACTION_IDS,
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

test('transform and shift actions are backend-supported', () => {
  for (const action of [
    'more_concise',
    'more_detailed',
    'child_voice',
    'shift_builder'
  ] as const) {
    assert.equal(isBackendSupportedOrbResponseAction(action), true, action)
    assert.ok(backendOrbActionIdForFollowUp(action), action)
  }
  assert.equal(backendOrbActionIdForFollowUp('shift_builder'), 'build_shift_plan')
  assert.equal(backendOrbActionIdForFollowUp('more_concise'), 'make_more_concise')
  assert.equal(backendOrbActionIdForFollowUp('child_voice'), 'add_child_voice_prompt')
})

test('standalone client exposes actions/run', () => {
  assert.match(clientSource, /actionsRun: '\/orb\/standalone\/actions\/run'/)
  assert.match(clientSource, /runStandaloneOrbAction/)
})

test('care companion calls runStandaloneOrbAction for supported follow-ups', () => {
  assert.match(companionSource, /runStandaloneOrbAction/)
  assert.match(companionSource, /runBackendOrbAction/)
  assert.match(companionSource, /isBackendSupportedOrbResponseAction/)
  assert.match(companionSource, /prefillOrbFollowUpComposer/)
})

test('shift builder follow-up uses actions/run via build_shift_plan', () => {
  assert.equal(backendOrbActionIdForFollowUp('shift_builder'), 'build_shift_plan')
  assert.match(companionSource, /build_shift_plan|shift_builder/)
})

test('supervision toolbar uses backend supervision_prompt', () => {
  assert.equal(BACKEND_ORB_STANDALONE_ACTION_IDS.supervision_prompt, 'supervision_prompt')
  assert.match(companionSource, /BACKEND_ORB_STANDALONE_ACTION_IDS\.supervision_prompt/)
})

test('backend supported set covers primary residential actions', () => {
  for (const action of [
    'what_missing',
    'recording_wording',
    'manager_oversight',
    'safeguarding_lens',
    'ofsted_lens',
    'checklist',
    'more_concise',
    'shift_builder'
  ] as const) {
    assert.ok(BACKEND_SUPPORTED_ORB_RESPONSE_ACTIONS.has(action), action)
  }
})
