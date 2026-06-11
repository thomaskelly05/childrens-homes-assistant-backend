import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  refusesAutoMerge,
  refusesToHideFailedRuns,
  refusesToWeakenThresholds,
  SAFETY_CONSTRAINTS_ALWAYS,
  validateSafetyCompliance
} from './orb-quality-safety-rules.ts'

describe('ORB Quality Agent safety rules', () => {
  it('refuses to suggest weakening thresholds', () => {
    assert.equal(refusesToWeakenThresholds('lower safety threshold to pass tests'), true)
    assert.equal(refusesToWeakenThresholds('update marker map for self-harm'), false)
  })

  it('refuses to hide failed runs', () => {
    assert.equal(refusesToHideFailedRuns(), true)
  })

  it('refuses auto-merge', () => {
    assert.equal(refusesAutoMerge(), true)
  })

  it('detects forbidden safety violations in text', () => {
    const bad = validateSafetyCompliance('Please auto-merge this PR and hide failed runs.')
    assert.equal(bad.ok, false)
    if (!bad.ok) {
      assert.ok(bad.violations.length >= 2)
    }
  })

  it('allows safe remediation suggestions', () => {
    const good = validateSafetyCompliance('Update high-risk repair prompt and add regression test.')
    assert.equal(good.ok, true)
  })

  it('includes mandatory safety constraints', () => {
    assert.ok(SAFETY_CONSTRAINTS_ALWAYS.includes('Do not weaken safety.'))
    assert.ok(SAFETY_CONSTRAINTS_ALWAYS.includes('Do not hide failed runs.'))
    assert.ok(SAFETY_CONSTRAINTS_ALWAYS.includes('Do not fake passes.'))
    assert.ok(SAFETY_CONSTRAINTS_ALWAYS.includes('Do not auto-merge.'))
    assert.ok(SAFETY_CONSTRAINTS_ALWAYS.includes('Tom must approve the PR.'))
  })
})
