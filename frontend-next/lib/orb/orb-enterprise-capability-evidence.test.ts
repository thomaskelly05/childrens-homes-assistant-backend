import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_ENTERPRISE_CAPABILITY_EVIDENCE,
  validateEnterpriseEvidenceTruthfulness
} from './orb-enterprise-capability-evidence.ts'

describe('ORB enterprise capability evidence', () => {
  it('has no truthfulness violations', () => {
    assert.deepEqual(validateEnterpriseEvidenceTruthfulness(), [])
  })

  it('HIPAA is never publicly claimable', () => {
    const hipaa = ORB_ENTERPRISE_CAPABILITY_EVIDENCE.find((e) => e.id === 'hipaa')
    assert.ok(hipaa)
    assert.equal(hipaa!.safeToClaimPublicly, false)
    assert.equal(hipaa!.status, 'not_applicable')
  })

  it('ISO/SOC2 not claimable without certification', () => {
    const iso = ORB_ENTERPRISE_CAPABILITY_EVIDENCE.find((e) => e.id === 'iso_soc2')
    assert.ok(iso)
    assert.equal(iso!.safeToClaimPublicly, false)
    assert.equal(iso!.status, 'missing')
  })

  it('MFA and OAuth are implemented with evidence files', () => {
    const mfa = ORB_ENTERPRISE_CAPABILITY_EVIDENCE.find((e) => e.id === 'mfa')
    const oauth = ORB_ENTERPRISE_CAPABILITY_EVIDENCE.find((e) => e.id === 'sso_oauth')
    assert.equal(mfa!.status, 'implemented')
    assert.ok(mfa!.implementationFiles.length > 0)
    assert.equal(oauth!.status, 'implemented')
  })

  it('UK storage guarantee is not claimed', () => {
    const region = ORB_ENTERPRISE_CAPABILITY_EVIDENCE.find((e) => e.id === 'region_storage')
    assert.ok(region)
    assert.equal(region!.safeToClaimPublicly, false)
    assert.equal(region!.status, 'missing')
  })
})
