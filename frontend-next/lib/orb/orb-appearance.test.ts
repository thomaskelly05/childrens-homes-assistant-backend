import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_APPEARANCE_MIGRATION_KEY,
  ORB_APPEARANCE_STORAGE_KEY,
  ORB_RESIDENTIAL_APPEARANCE_MIGRATION_KEY,
  ORB_SYSTEM_DARK_START_HOUR,
  ORB_SYSTEM_LIGHT_START_HOUR,
  ORB_APPEARANCE_BOOTSTRAP_SCRIPT,
  migrateOrbAppearanceForSystemDefault,
  migrateOrbResidentialLightDefault,
  msUntilNextOrbSystemThemeBoundary,
  readOrbAppearanceMode,
  resolveOrbTheme,
  resolveOrbThemeFromTimeOfDay,
  writeOrbAppearanceMode
} from './orb-appearance.ts'
import { placeholderForMode } from './residential-agents.ts'

function mockBrowserStorage() {
  const bag: Record<string, string> = {}
  const mockStorage = {
    getItem: (key: string) => bag[key] ?? null,
    setItem: (key: string, value: string) => {
      bag[key] = value
    }
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true })
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
  return bag
}

describe('orb appearance', () => {
  it('defaults to system when storage is empty', () => {
    assert.equal(readOrbAppearanceMode(), 'system')
  })

  it('resolves system theme from time of day without window', () => {
    assert.equal(resolveOrbThemeFromTimeOfDay(new Date('2026-06-03T10:00:00')), 'light')
    assert.equal(resolveOrbThemeFromTimeOfDay(new Date('2026-06-03T20:00:00')), 'dark')
    assert.equal(resolveOrbThemeFromTimeOfDay(new Date('2026-06-03T06:30:00')), 'dark')
    assert.equal(resolveOrbTheme('system'), resolveOrbThemeFromTimeOfDay())
  })

  it('uses configured day/night hour boundaries', () => {
    assert.equal(ORB_SYSTEM_LIGHT_START_HOUR, 7)
    assert.equal(ORB_SYSTEM_DARK_START_HOUR, 19)
  })

  it('schedules next system theme boundary after morning or evening', () => {
    const morning = msUntilNextOrbSystemThemeBoundary(new Date('2026-06-03T08:00:00'))
    const evening = msUntilNextOrbSystemThemeBoundary(new Date('2026-06-03T21:00:00'))
    assert.ok(morning > 0)
    assert.ok(evening > 0)
    assert.ok(morning < 12 * 60 * 60 * 1000)
    assert.ok(evening < 12 * 60 * 60 * 1000)
  })

  it('persists appearance mode in localStorage', () => {
    const bag = mockBrowserStorage()
    try {
      writeOrbAppearanceMode('dark')
      assert.equal(readOrbAppearanceMode(), 'dark')
      writeOrbAppearanceMode('light')
      assert.equal(bag[ORB_APPEARANCE_STORAGE_KEY], 'light')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('persists residential appearance after reload', () => {
    const bag = mockBrowserStorage()
    try {
      bag[ORB_RESIDENTIAL_APPEARANCE_MIGRATION_KEY] = 'done'
      writeOrbAppearanceMode('dark')
      assert.equal(readOrbAppearanceMode({ residential: true }), 'dark')
      writeOrbAppearanceMode('system')
      assert.equal(readOrbAppearanceMode({ residential: true }), 'system')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('migrates legacy users without stored preference to system once', () => {
    const bag = mockBrowserStorage()
    try {
      migrateOrbAppearanceForSystemDefault()
      assert.equal(bag[ORB_APPEARANCE_STORAGE_KEY], 'system')
      assert.equal(bag[ORB_APPEARANCE_MIGRATION_KEY], 'done')
      bag[ORB_APPEARANCE_STORAGE_KEY] = 'dark'
      migrateOrbAppearanceForSystemDefault()
      assert.equal(bag[ORB_APPEARANCE_STORAGE_KEY], 'dark')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('preserves explicit light or dark choices after migration', () => {
    const bag = mockBrowserStorage()
    try {
      bag[ORB_APPEARANCE_STORAGE_KEY] = 'light'
      bag[ORB_APPEARANCE_MIGRATION_KEY] = 'done'
      assert.equal(readOrbAppearanceMode(), 'light')
      bag[ORB_APPEARANCE_STORAGE_KEY] = 'dark'
      assert.equal(readOrbAppearanceMode(), 'dark')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('migrateOrbAppearanceForSystemDefault is idempotent', () => {
    const bag = mockBrowserStorage()
    try {
      migrateOrbAppearanceForSystemDefault()
      migrateOrbAppearanceForSystemDefault()
      assert.equal(bag[ORB_APPEARANCE_MIGRATION_KEY], 'done')
      assert.equal(bag[ORB_APPEARANCE_STORAGE_KEY], 'system')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('bootstrap script resolves system theme from local time not prefers-color-scheme', () => {
    assert.match(ORB_APPEARANCE_BOOTSTRAP_SCRIPT, /function timeTheme\(\)/)
    assert.doesNotMatch(ORB_APPEARANCE_BOOTSTRAP_SCRIPT, /prefers-color-scheme/)
  })
})

describe('orb placeholders', () => {
  it('uses Ask anything for default agent', () => {
    assert.equal(placeholderForMode('Ask ORB'), 'Ask anything')
  })

  it('uses safeguarding placeholder copy', () => {
    assert.match(placeholderForMode('Safeguarding Thinking'), /think it through/i)
  })
})
