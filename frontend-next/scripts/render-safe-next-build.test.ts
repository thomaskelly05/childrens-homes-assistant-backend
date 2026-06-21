import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_HEAP_MB,
  ensureMaxOldSpaceSize,
  formatBuildMemorySnapshot,
  resolveRenderBuildEnv
} from './render-safe-next-build.mjs'

describe('render-safe-next-build', () => {
  it('appends max-old-space-size when missing', () => {
    assert.equal(ensureMaxOldSpaceSize(''), `--max-old-space-size=${DEFAULT_HEAP_MB}`)
    assert.equal(ensureMaxOldSpaceSize('   '), `--max-old-space-size=${DEFAULT_HEAP_MB}`)
    assert.equal(
      ensureMaxOldSpaceSize('--expose-gc'),
      `--expose-gc --max-old-space-size=${DEFAULT_HEAP_MB}`
    )
  })

  it('does not duplicate when max-old-space-size is already present', () => {
    assert.equal(
      ensureMaxOldSpaceSize('--max-old-space-size=4096'),
      '--max-old-space-size=4096'
    )
    assert.equal(
      ensureMaxOldSpaceSize('--max-old-space-size=1536'),
      '--max-old-space-size=1536'
    )
    assert.equal(
      ensureMaxOldSpaceSize('--expose-gc --max-old-space-size=2048'),
      '--expose-gc --max-old-space-size=2048'
    )
  })

  it('resolveRenderBuildEnv sets production telemetry and heap defaults', () => {
    const env = resolveRenderBuildEnv({})
    assert.equal(env.NODE_ENV, 'production')
    assert.equal(env.NEXT_TELEMETRY_DISABLED, '1')
    assert.match(env.NODE_OPTIONS ?? '', /--max-old-space-size=2560/)
  })

  it('resolveRenderBuildEnv preserves explicit NODE_ENV and NODE_OPTIONS', () => {
    const env = resolveRenderBuildEnv({
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=6144',
      NEXT_TELEMETRY_DISABLED: '1'
    })
    assert.equal(env.NODE_ENV, 'production')
    assert.equal(env.NODE_OPTIONS, '--max-old-space-size=6144')
    assert.equal(env.NEXT_TELEMETRY_DISABLED, '1')
  })

  it('formatBuildMemorySnapshot reports rss and heap', () => {
    const line = formatBuildMemorySnapshot('test')
    assert.match(line, /\[render-safe-next-build\] test: rss=\d+MB heap=\d+MB\/\d+MB/)
  })
})
