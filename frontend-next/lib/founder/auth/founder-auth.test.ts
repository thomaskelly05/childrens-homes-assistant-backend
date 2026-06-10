import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { userHasFounderAccessFromProfile } from '../access.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder auth access', () => {
  it('accepts admin role from nested /auth/me user envelope', () => {
    assert.equal(
      userHasFounderAccessFromProfile({
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        permissions: ['settings:manage']
      }),
      true
    )
  })

  it('accepts founder aliases and flags', () => {
    assert.equal(userHasFounderAccessFromProfile({ role: 'founder' }), true)
    assert.equal(userHasFounderAccessFromProfile({ role: 'super_admin' }), true)
    assert.equal(userHasFounderAccessFromProfile({ isFounder: true }), true)
    assert.equal(userHasFounderAccessFromProfile({ is_admin: true }), true)
    assert.equal(userHasFounderAccessFromProfile({ roles: ['owner'] }), true)
  })

  it('rejects staff roles', () => {
    assert.equal(userHasFounderAccessFromProfile({ role: 'support_worker' }), false)
    assert.equal(userHasFounderAccessFromProfile({ role: 'manager' }), false)
  })

  it('session module parses /auth/me user envelope', () => {
    const session = read('lib/founder/auth/founder-session.ts')
    assert.match(session, /body\.user/)
    assert.match(session, /cache\(/)
    assert.match(session, /userHasFounderAccessFromProfile/)
  })

  it('founder API client blocks direct backend admin paths', () => {
    const client = read('lib/founder/api/founder-api-client.ts')
    assert.match(client, /\/orb\/admin\//)
    assert.match(client, /credentials: 'include'/)
    assert.match(client, /Founder access required/)
  })
})
