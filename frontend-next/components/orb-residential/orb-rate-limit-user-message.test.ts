import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('ORB rate limit user message contract', () => {
  it('rate limit policy documents safe 429 shape', () => {
    const policy = readFileSync(join(repoRoot, 'docs/orb-rate-limiting-policy.md'), 'utf8')
    assert.match(policy, /rate_limit_exceeded/)
    assert.match(policy, /Too many requests/)
    assert.match(policy, /webhook.*[Ee]xempt|Exempt routes/)
  })

  it('AI abuse guard exposes user-facing limit messages', () => {
    const guard = readFileSync(join(repoRoot, 'services/orb_ai_abuse_guard_service.py'), 'utf8')
    assert.match(guard, /daily_ai_limit/)
    assert.match(guard, /USER_MESSAGES/)
    assert.match(guard, /Please try again/)
  })

  it('rate limit middleware returns JSON without stack traces', () => {
    const middleware = readFileSync(join(repoRoot, 'middleware/orb_rate_limit_middleware.py'), 'utf8')
    assert.match(middleware, /JSONResponse/)
    assert.match(middleware, /rate_limit_exceeded_response/)
  })
})
