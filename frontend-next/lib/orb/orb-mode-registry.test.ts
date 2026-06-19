import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getOrbModeByLabel,
  modeRequiresGuardedStream,
  ORB_MODE_REGISTRY,
  STANDALONE_ORB_MODES
} from './orb-mode-registry.ts'

const EXPECTED_MODE_IDS = [
  'ask_orb',
  'safeguarding_thinking',
  'ofsted_lens',
  'record_this_properly',
  'therapeutic_reframe',
  'manager_copilot',
  'staff_coach',
  'reg_44_45_prep',
  'reflect_with_orb',
  'behaviour_support',
  'policy_explainer',
  'scenario_simulator'
] as const

describe('orb-mode-registry', () => {
  it('lists twelve modes aligned with backend', () => {
    assert.equal(STANDALONE_ORB_MODES.length, 12)
    assert.ok(STANDALONE_ORB_MODES.includes('Reflect with ORB'))
    assert.ok(STANDALONE_ORB_MODES.includes('Safeguarding Thinking'))
  })

  it('contains all twelve canonical mode ids', () => {
    const ids = ORB_MODE_REGISTRY.map((mode) => mode.id)
    assert.deepEqual([...ids].sort(), [...EXPECTED_MODE_IDS].sort())
  })

  it('flags safeguarding mode for guarded stream preference', () => {
    assert.equal(modeRequiresGuardedStream('Safeguarding Thinking'), true)
    assert.equal(modeRequiresGuardedStream('Ask ORB'), false)
  })

  it('resolves mode metadata by label', () => {
    const mode = getOrbModeByLabel('Record This Properly')
    assert.ok(mode)
    assert.equal(mode?.id, 'record_this_properly')
    assert.match(mode?.suggestedUiCopy ?? '', /review/i)
  })
})
