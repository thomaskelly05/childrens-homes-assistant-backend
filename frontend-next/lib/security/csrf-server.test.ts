import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CSRF_COOKIE_NAMES,
  CSRF_HEADER_NAMES,
  getCsrfTokenFromCookieString,
  getIncomingCsrfHeader,
  resolveProxyCsrfToken
} from './csrf-server.ts'

test('CSRF cookie names match backend auth settings', () => {
  assert.deepEqual(CSRF_COOKIE_NAMES, ['__Host-indicare_csrf', 'indicare_csrf'])
  assert.ok(CSRF_HEADER_NAMES.includes('x-csrf-token'))
  assert.ok(CSRF_HEADER_NAMES.includes('X-CSRF-Token'))
})

test('getCsrfTokenFromCookieString reads indicare and Host-prefixed cookies', () => {
  assert.equal(
    getCsrfTokenFromCookieString('indicare_session=abc; indicare_csrf=token-dev'),
    'token-dev'
  )
  assert.equal(
    getCsrfTokenFromCookieString('__Host-indicare_csrf=host-token; other=1'),
    'host-token'
  )
})

test('getIncomingCsrfHeader accepts common spellings', () => {
  const request = new Request('https://app.example/api', {
    headers: { 'X-CSRF-Token': 'header-token' }
  })
  assert.equal(getIncomingCsrfHeader(request), 'header-token')
})

test('resolveProxyCsrfToken prefers header over cookie', () => {
  const request = new Request('https://app.example/api', {
    headers: { 'x-csrf-token': 'from-header' }
  })
  const token = resolveProxyCsrfToken(request, 'indicare_csrf=from-cookie')
  assert.equal(token, 'from-header')
})

test('resolveProxyCsrfToken falls back to cookie store', () => {
  const request = new Request('https://app.example/api')
  const cookieStore = {
    get: (name: string) => (name === 'indicare_csrf' ? { value: 'from-store' } : undefined)
  }
  const token = resolveProxyCsrfToken(request, '', cookieStore)
  assert.equal(token, 'from-store')
})

test('resolveProxyCsrfToken falls back to cookie header string', () => {
  const request = new Request('https://app.example/api')
  const token = resolveProxyCsrfToken(request, 'indicare_csrf=from-string')
  assert.equal(token, 'from-string')
})
