import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  assertSafePublicCopy,
  canClaimLocalFirstPublicly,
  highSensitivityRequiresAdultControl,
  isUnsafePublicClaim,
  privateComputeRoadmap,
  safePublicCopy,
  unsafeClaims
} from './orb-private-compute-framework.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

describe('orb-private-compute-framework', () => {
  it('blocks unsafe Apple/E2EE/local-only claims', () => {
    for (const claim of unsafeClaims) {
      assert.equal(isUnsafePublicClaim(claim), true)
      assert.throws(() => assertSafePublicCopy(claim))
    }
  })

  it('allows truthful local-first copy', () => {
    assert.equal(canClaimLocalFirstPublicly(), true)
    assert.equal(assertSafePublicCopy(safePublicCopy), safePublicCopy)
  })

  it('marks private compute enclave and Apple PCC as not claimable', () => {
    const enclave = privateComputeRoadmap.find((item) => item.id === 'private_compute_enclave')
    const apple = privateComputeRoadmap.find((item) => item.id === 'apple_private_cloud_compute')
    assert.equal(enclave?.status, 'not_implemented')
    assert.equal(apple?.status, 'not_claimable')
  })

  it('marks local model inference as roadmap and ORB brain as cloud required', () => {
    assert.equal(privateComputeRoadmap.find((item) => item.id === 'local_model_inference')?.status, 'roadmap')
    assert.equal(privateComputeRoadmap.find((item) => item.id === 'orb_brain_cloud')?.status, 'implemented')
  })

  it('requires adult control for high-sensitivity capabilities', () => {
    assert.equal(highSensitivityRequiresAdultControl('upload_on_user_action'), true)
    assert.equal(highSensitivityRequiresAdultControl('orb_brain_cloud'), true)
    assert.equal(highSensitivityRequiresAdultControl('on_device_settings'), false)
  })

  it('settings privacy section remains accessible', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /Privacy & data/)
    assert.match(settings, /OrbPrivacyDataSettingsSection/)
  })
})
