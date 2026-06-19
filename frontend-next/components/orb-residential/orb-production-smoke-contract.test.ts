import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readDoc(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

const REQUIRED_SMOKE_CHECKS = [
  'Incognito `/orb`',
  'Incognito `/orb/write`',
  'Incognito `/orb?station=dictate`',
  'Login',
  'Active subscriber',
  'Inactive',
  'Billing checkout',
  'Safety acceptance',
  'Chat',
  'Dictate',
  'Voice',
  'ORB Write',
  'Templates',
  'Documents',
  'Records & Drafts',
  'Settings',
  'Sign out',
  'Browser back',
  'Unsafe upload',
  'Brain metadata',
  'Console secrets',
  'Network while logged out',
]

describe('ORB production smoke test contract', () => {
  it('smoke test document exists with required manual checks', () => {
    const doc = readDoc('docs/orb-production-smoke-test.md')
    assert.match(doc, /# ORB Production Smoke Test Contract/)
    for (const check of REQUIRED_SMOKE_CHECKS) {
      assert.match(doc, new RegExp(check.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
  })

  it('smoke test doc does not expose secret placeholders', () => {
    const doc = readDoc('docs/orb-production-smoke-test.md')
    assert.doesNotMatch(doc, /SESSION_SECRET\s*=\s*['"][^'"]+['"]/)
    assert.doesNotMatch(doc, /sk_live_/)
    assert.doesNotMatch(doc, /OPENAI_API_KEY\s*=\s*/)
  })

  it('follow-up audit documents WebSocket and revocation fixes', () => {
    const audit = readDoc('docs/orb-security-follow-up-audit.md')
    assert.match(audit, /websocket_auth/)
    assert.match(audit, /session revocation/)
    assert.match(audit, /OrbAuthGate/)
  })
})
