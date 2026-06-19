import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { canMountOrbDevTools, isOrbDevBuild, isOrbProductionDebugEnabled } from './orb-production-debug.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-production-debug', () => {
  it('does not mount dev tools in production without explicit flag', () => {
    const prevNodeEnv = process.env.NODE_ENV
    const prevDebug = process.env.NEXT_PUBLIC_ORB_DEBUG
    try {
      process.env.NODE_ENV = 'production'
      delete process.env.NEXT_PUBLIC_ORB_DEBUG
      assert.equal(isOrbDevBuild(), false)
      assert.equal(isOrbProductionDebugEnabled(), false)
      assert.equal(canMountOrbDevTools(), false)
    } finally {
      process.env.NODE_ENV = prevNodeEnv
      if (prevDebug === undefined) delete process.env.NEXT_PUBLIC_ORB_DEBUG
      else process.env.NEXT_PUBLIC_ORB_DEBUG = prevDebug
    }
  })

  it('allows dev tools in production only when NEXT_PUBLIC_ORB_DEBUG=1', () => {
    const prevNodeEnv = process.env.NODE_ENV
    const prevDebug = process.env.NEXT_PUBLIC_ORB_DEBUG
    try {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_ORB_DEBUG = '1'
      assert.equal(canMountOrbDevTools(), true)
    } finally {
      process.env.NODE_ENV = prevNodeEnv
      if (prevDebug === undefined) delete process.env.NEXT_PUBLIC_ORB_DEBUG
      else process.env.NEXT_PUBLIC_ORB_DEBUG = prevDebug
    }
  })

  it('OrbDevToolsMount gates panels via canMountOrbDevTools', () => {
    const mount = readSource('components/orb-standalone/orb-dev-tools-mount.tsx')
    const page = readSource('app/orb/page.tsx')
    assert.match(mount, /canMountOrbDevTools\(\)/)
    assert.match(page, /OrbDevToolsMount/)
    assert.doesNotMatch(page, /OrbVisualDebugPanel/)
    assert.doesNotMatch(page, /OrbClientFlightRecorder/)
  })
})
