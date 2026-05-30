import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { AUTH_API_PROXY_PREFIX, getInternalBackendOrigin } from './api-base.ts'

const root = dirname(fileURLToPath(import.meta.url))

describe('auth api base', () => {
  it('resolves internal backend origin from INTERNAL_API_BASE_URL', () => {
    const previous = process.env.INTERNAL_API_BASE_URL
    process.env.INTERNAL_API_BASE_URL = 'https://api.indicare.co.uk'
    try {
      assert.equal(getInternalBackendOrigin(), 'https://api.indicare.co.uk')
    } finally {
      if (previous === undefined) delete process.env.INTERNAL_API_BASE_URL
      else process.env.INTERNAL_API_BASE_URL = previous
    }
  })

  it('browser client uses /backend when NEXT_PUBLIC_API_BASE_URL is cross-origin', () => {
    const source = readFileSync(join(root, 'api-base.ts'), 'utf8')
    assert.match(source, /AUTH_API_PROXY_PREFIX = '\/backend'/)
    assert.match(source, /isAbsoluteHttpUrl\(configured\)/)
    assert.match(source, /return AUTH_API_PROXY_PREFIX/)
  })

  it('auth fetch resolves paths through resolveAuthApiPath', () => {
    const api = readFileSync(join(root, 'api.ts'), 'utf8')
    assert.match(api, /resolveAuthApiPath\(path\)/)
  })
})
