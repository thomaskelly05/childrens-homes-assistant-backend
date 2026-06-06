import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { isOrbAccessContractCompatible, ORB_ACCESS_CONTRACT_VERSION } from './orb-access-contract.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB access contract mismatch', () => {
  it('expected contract version is orb_access_v2', () => {
    assert.equal(ORB_ACCESS_CONTRACT_VERSION, 'orb_access_v2')
  })

  it('rejects payload without contract_version', () => {
    assert.equal(isOrbAccessContractCompatible({ can_use_orb: false }), false)
  })

  it('accepts matching contract_version', () => {
    assert.equal(isOrbAccessContractCompatible({ contract_version: 'orb_access_v2' }), true)
  })

  it('billing client validates contract on fetch', () => {
    const client = read('lib/orb/orb-billing-client.ts')
    assert.match(client, /isOrbAccessContractCompatible/)
    assert.match(client, /access_contract_mismatch/)
  })

  it('backend access payload includes contract_version', () => {
    const service = readFileSync(join(root, '../services/orb_access_service.py'), 'utf8')
    assert.match(service, /"contract_version": "orb_access_v2"/)
  })
})
