import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import {
  getCsrfTokenFromCookieString,
  resolveProxyCsrfToken
} from '../../security/csrf-server.ts'

const founderSessionSource = readFileSync(
  join(process.cwd(), 'lib/founder/auth/founder-session.ts'),
  'utf8'
)

test('founder-session uses resolveProxyCsrfToken for proxy headers', () => {
  assert.match(founderSessionSource, /resolveProxyCsrfToken/)
  assert.match(founderSessionSource, /headers\.set\('x-csrf-token', csrf\)/)
  assert.match(founderSessionSource, /headers\.set\('cookie', cookieHeader\)/)
  assert.doesNotMatch(founderSessionSource, /\.\.\.headers/)
})

test('mergeFounderProxyHeaders passes cookieStore through to buildFounderProxyHeaders', () => {
  assert.match(founderSessionSource, /buildFounderProxyHeaders\(request, cookieHeader, cookieStore\)/)
})

test('proxy CSRF fallback reads cookie string when header missing', () => {
  const request = new Request('https://app.example/api', { method: 'POST' })
  const token = resolveProxyCsrfToken(request, 'indicare_csrf=proxy-token')
  assert.equal(token, 'proxy-token')
})

test('proxy CSRF cookie parsing matches indicare_csrf name', () => {
  assert.equal(getCsrfTokenFromCookieString('indicare_csrf=abc'), 'abc')
})
