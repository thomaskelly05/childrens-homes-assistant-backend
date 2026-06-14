import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  defaultStandaloneOrbAccessibility,
  loadStandaloneOrbAccessibility,
  saveStandaloneOrbAccessibility,
  STANDALONE_ORB_A11Y_STORAGE_KEY,
  standaloneOrbAccessibilityClassNames
} from './standalone-accessibility.ts'

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

describe('standalone orb accessibility preferences', () => {
  it('persists large text preference', () => {
    const bag = mockBrowserStorage()
    try {
      saveStandaloneOrbAccessibility({ ...defaultStandaloneOrbAccessibility, largeText: true })
      const loaded = loadStandaloneOrbAccessibility()
      assert.equal(loaded.largeText, true)
      assert.match(bag[STANDALONE_ORB_A11Y_STORAGE_KEY] || '', /"largeText":true/)
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('persists reduce motion preference', () => {
    mockBrowserStorage()
    try {
      saveStandaloneOrbAccessibility({ ...defaultStandaloneOrbAccessibility, reducedMotion: true })
      assert.equal(loadStandaloneOrbAccessibility().reducedMotion, true)
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('applies reduced motion class names', () => {
    assert.match(
      standaloneOrbAccessibilityClassNames({ reducedMotion: true }),
      /orb-reduced-motion/
    )
  })

  it('falls back safely when localStorage is unavailable', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {
          throw new Error('blocked')
        }
      },
      configurable: true
    })
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
    try {
      assert.deepEqual(loadStandaloneOrbAccessibility(), defaultStandaloneOrbAccessibility)
      assert.doesNotThrow(() =>
        saveStandaloneOrbAccessibility({ ...defaultStandaloneOrbAccessibility, largeText: true })
      )
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })
})
