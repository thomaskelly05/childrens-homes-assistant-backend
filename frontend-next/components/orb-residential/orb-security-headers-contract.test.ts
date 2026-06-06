import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('ORB security headers contract', () => {
  it('middleware sets nosniff and CSP on ORB product paths', () => {
    const middleware = readFileSync(join(repoRoot, 'frontend-next/middleware.ts'), 'utf8')
    assert.match(middleware, /X-Content-Type-Options/)
    assert.match(middleware, /Content-Security-Policy-Report-Only|Content-Security-Policy/)
    assert.match(middleware, /isOrbProductPath/)
    assert.match(middleware, /no-store/)
  })

  it('backend security middleware documents CSP mode', () => {
    const backend = readFileSync(join(repoRoot, 'middleware/security_middleware.py'), 'utf8')
    assert.match(backend, /ORB_CSP_MODE/)
    assert.match(backend, /Content-Security-Policy-Report-Only/)
    assert.match(backend, /js\.stripe\.com/)
  })

  it('CSP documentation exists', () => {
    const doc = readFileSync(join(repoRoot, 'docs/orb-security-headers-csp.md'), 'utf8')
    assert.match(doc, /report-only/i)
    assert.match(doc, /Stripe/)
  })
})
