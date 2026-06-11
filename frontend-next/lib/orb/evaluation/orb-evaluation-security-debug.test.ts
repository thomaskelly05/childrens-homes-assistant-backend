import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = join(process.cwd(), 'lib/orb/evaluation')
const appRoot = join(process.cwd(), 'app/api/orb/evaluation/debug')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

test('debug security routes are founder-gated and do not expose full tokens', () => {
  const debug = read(join(root, 'orb-evaluation-security-debug.ts'))
  const getRoute = read(join(appRoot, 'security/route.ts'))
  const postRoute = read(join(appRoot, 'security-post/route.ts'))

  assert.match(debug, /requireFounderSession/)
  assert.match(debug, /csrfTokenPrefix/)
  assert.match(debug, /csrfCookiePrefix/)
  assert.doesNotMatch(debug, /csrfToken[^P]/)
  assert.doesNotMatch(debug, /fullToken/)
  assert.match(getRoute, /handleEvaluationSecurityDebugGet/)
  assert.match(postRoute, /handleEvaluationSecurityDebugPost/)
})

test('debug GET returns expected diagnostic shape fields', () => {
  const debug = read(join(root, 'orb-evaluation-security-debug.ts'))
  assert.match(debug, /hasCookieHeader/)
  assert.match(debug, /visibleCookieNames/)
  assert.match(debug, /hasXCsrfToken/)
  assert.match(debug, /founderSessionResolved/)
  assert.match(debug, /csrfHeaderNamesAccepted/)
  assert.match(debug, /csrfCookieNamesAccepted/)
})

test('debug POST uses same proxy CSRF mechanism as evaluation runs', () => {
  const debug = read(join(root, 'orb-evaluation-security-debug.ts'))
  const api = read(join(root, 'orb-evaluation-api.ts'))

  assert.match(debug, /mergeFounderProxyHeaders/)
  assert.match(debug, /cookieStore/)
  assert.match(api, /mergeFounderProxyHeaders/)
  assert.match(api, /cookieStore/)
})

test('debug POST preserves csrf_failed from backend', () => {
  const debug = read(join(root, 'orb-evaluation-security-debug.ts'))
  assert.match(debug, /csrf_failed/)
  assert.match(debug, /csrfPassed: false/)
})
