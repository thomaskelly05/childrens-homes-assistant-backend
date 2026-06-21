import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('production build excludes', () => {
  it('tsconfig excludes test, spec, e2e, playwright, and coverage paths', () => {
    const tsconfig = JSON.parse(read('tsconfig.json')) as { exclude?: string[] }
    const exclude = tsconfig.exclude ?? []
    for (const pattern of [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'e2e/**',
      'playwright/**',
      'test-results/**',
      'coverage/**',
      'lib/orb/evals/**'
    ]) {
      assert.ok(exclude.includes(pattern), `missing tsconfig exclude: ${pattern}`)
    }
  })

  it('tailwind content globs exclude test and e2e sources', () => {
    const tailwind = read('tailwind.config.ts')
    assert.match(tailwind, /!\.\/components\/\*\*\/\*\.test\.\{ts,tsx\}/)
    assert.match(tailwind, /!\.\/lib\/\*\*\/\*\.test\.\{ts,tsx\}/)
    assert.match(tailwind, /!\.\/e2e\/\*\*/)
  })

  it('next config enables webpack memory optimisations and build-time guards', () => {
    const nextConfig = read('next.config.ts')
    assert.match(nextConfig, /webpackMemoryOptimizations:\s*true/)
    assert.match(nextConfig, /memoryBasedWorkersCount:\s*true/)
    assert.match(nextConfig, /productionBrowserSourceMaps:\s*false/)
    assert.match(nextConfig, /typescript:[\s\S]*ignoreBuildErrors:\s*true/)
    assert.match(nextConfig, /cpus:\s*1/)
    assert.match(nextConfig, /config\.parallelism\s*=\s*1/)
    assert.match(nextConfig, /config\.cache\s*=\s*false/)
  })

  it('orb shell lazy-loads care companion', () => {
    const shell = read('components/orb/orb-shell.tsx')
    assert.match(shell, /import dynamic from 'next\/dynamic'/)
    assert.match(shell, /import\('@\/components\/orb-standalone\/orb-care-companion'\)/)
  })

  it('runtime ORB shell does not statically import heavy stations', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /import dynamic from 'next\/dynamic'/)
    for (const station of [
      'orb-voice-station',
      'orb-dictate-station',
      'orb-write-standalone-panel',
      'orb-billing-modal',
      'orb-standalone-settings-panel',
      'orb-saved-outputs-panel',
      'orb-templates-panel',
      'orb-document-panel'
    ]) {
      assert.doesNotMatch(
        companion,
        new RegExp(`^import\\s+\\{[^}]*\\}\\s+from\\s+['"]@/components/[^'"]*${station}['"]`, 'm')
      )
    }
    assert.match(companion, /dynamic\(\s*\(\)\s*=>\s*\n?\s*import\('@\/components\/orb-standalone\/orb-voice-station'\)/)
  })

  it('plus menus import lightweight upload actions, not foundation registry', () => {
    const desktopMenu = read('components/orb-standalone/orb-composer-plus-menu.tsx')
    const mobileSheet = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    for (const source of [desktopMenu, mobileSheet]) {
      assert.match(source, /@\/lib\/orb\/orb-composer-upload-actions/)
      assert.doesNotMatch(source, /orb-foundation-capabilities/)
    }
    assert.ok(existsSync(join(root, 'lib/orb/orb-composer-upload-actions.ts')))
  })
})

function existsSync(path: string) {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}
