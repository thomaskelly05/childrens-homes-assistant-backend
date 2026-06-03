import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_APPEARANCE_STORAGE_KEY,
  readOrbAppearanceMode,
  resolveOrbTheme,
  resolveOrbThemeFromTimeOfDay
} from '../../lib/orb/orb-appearance.ts'
import { orbPersonalisedGreeting } from '../../lib/orb/orb-personalised-greeting.ts'
import { buildOrbReviewPrompt } from '../../lib/orb/orb-review-prompt.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB appearance system default', () => {
  it('defaults to system when storage is empty', () => {
    assert.equal(readOrbAppearanceMode(), 'system')
  })

  it('resolves system theme from local time of day when window is available', () => {
    const originalWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
    try {
      const evening = new Date('2026-06-03T21:00:00')
      const morning = new Date('2026-06-03T09:00:00')
      assert.equal(resolveOrbTheme('system'), resolveOrbThemeFromTimeOfDay())
      assert.equal(resolveOrbThemeFromTimeOfDay(evening), 'dark')
      assert.equal(resolveOrbThemeFromTimeOfDay(morning), 'light')
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
      } else {
        Reflect.deleteProperty(globalThis, 'window')
      }
    }
  })

  it('explicit light and dark override system', () => {
    assert.equal(resolveOrbTheme('light'), 'light')
    assert.equal(resolveOrbTheme('dark'), 'dark')
  })

  it('does not force dark lock on ORB Residential root CSS', () => {
    const tokens = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(tokens, /data-orb-theme='dark'\]/)
    assert.doesNotMatch(tokens, /ORB Residential launch lock/)
    assert.match(tokens, /--orb-res-bg/)
  })

  it('exposes appearance QA markers on shell and hook', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const hook = readComponent('components/orb-standalone/use-orb-appearance.ts')
    const appearance = readComponent('lib/orb/orb-appearance.ts')
    assert.match(companion, /data-orb-appearance-mode/)
    assert.match(companion, /data-orb-appearance=/)
    assert.match(companion, /data-orb-system-theme/)
    assert.match(hook, /data-orb-appearance-mode/)
    assert.match(appearance, /data-orb-appearance/)
  })
})

describe('ORB personalised greeting', () => {
  it('varies by time of day with first name', () => {
    assert.match(orbPersonalisedGreeting({ firstName: 'Tom', hour: 9 }).heading, /Good morning, Tom/)
    assert.match(orbPersonalisedGreeting({ firstName: 'Tom', hour: 14 }).heading, /Good afternoon, Tom/)
    assert.match(orbPersonalisedGreeting({ firstName: 'Tom', hour: 19 }).heading, /Good evening, Tom/)
  })
})

describe('ORB mobile shell layout', () => {
  it('mobile shell avoids horizontal overflow and offsets', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(mobileCss, /overflow-x:\s*hidden/)
    assert.match(mobileCss, /max-width:\s*100vw/)
    assert.match(mobileCss, /\.orb-chat-shell/)
    assert.match(companion, /data-orb-mobile-shell/)
    assert.match(companion, /data-orb-chat-layout/)
  })

  it('composer respects safe area on mobile', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(mobileCss, /safe-area-inset-bottom/)
  })

  it('sidebar closed uses translate off-screen without main offset', () => {
    const layout = readComponent('components/orb/orb-layout.tsx')
    assert.match(layout, /-translate-x-full/)
    assert.match(layout, /orb-chat-main/)
  })
})

describe('ORB settings premium layout', () => {
  it('defaults appearance to system and renders personalisation controls', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /appearanceMode = 'system'/)
    assert.match(settings, /data-orb-settings-layout="premium-cards"/)
    assert.match(settings, /data-orb-settings-preferred-name/)
    assert.match(settings, /data-orb-settings-greeting-style/)
    const appearance = readComponent('components/orb-standalone/orb-appearance-control.tsx')
    assert.match(appearance, /orb-appearance-segmented/)
  })

  it('settings mobile layout does not use wide two-pane only', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /data-orb-settings-nav-mobile/)
    assert.match(settings, /overflow-x-hidden/)
  })
})

describe('ORB review therapeutic input', () => {
  it('renders therapeutic section and chips', () => {
    const review = readComponent('components/orb-standalone/orb-review-panel.tsx')
    assert.match(review, /data-orb-review-therapeutic-input/)
    assert.match(review, /data-orb-review-therapeutic-chips/)
    assert.match(review, /Therapeutic language/)
  })

  it('review prompt payload includes therapeutic context', () => {
    const prompt = buildOrbReviewPrompt({
      text: 'Incident note',
      therapeuticContext: 'Needs co-regulation after transitions.',
      chips: ['child_centred']
    })
    assert.match(prompt, /Needs co-regulation/)
    assert.match(prompt, /child-centred/i)
  })
})

describe('ORB modals and account polish', () => {
  it('account hides Sign in when signed in', () => {
    const account = readComponent('components/orb-standalone/orb-account-modal.tsx')
    assert.match(account, /isSignedIn/)
    assert.match(account, /!isSignedIn \?/)
  })

  it('billing primary CTA is sticky with safe area', () => {
    const billing = readComponent('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-billing-upgrade/)
    assert.match(billing, /data-orb-billing-cta-bar/)
    assert.match(billing, /safe-area-inset-bottom/)
  })

  it('modal shell has mobile safe-area and rounded top corners', () => {
    const shell = readComponent('components/orb-standalone/orb-app-panel-shell.tsx')
    assert.match(shell, /safe-area-inset/)
    assert.match(shell, /rounded-t-\[1\.35rem\]/)
  })
})

describe('ORB flight recorder debug polish', () => {
  it('only renders with debugVoice and has hide/collapse', () => {
    const recorder = readComponent('components/orb-standalone/orb-client-flight-recorder.tsx')
    const page = readComponent('app/orb/page.tsx')
    assert.match(recorder, /debugVoice/)
    assert.match(recorder, /data-orb-flight-recorder/)
    assert.match(recorder, /data-orb-flight-recorder-hide/)
    assert.match(recorder, /data-orb-flight-recorder-toggle/)
    assert.match(page, /OrbClientFlightRecorder/)
  })

  it('positions recorder away from bottom CTAs on mobile', () => {
    const recorder = readComponent('components/orb-standalone/orb-client-flight-recorder.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(recorder, /top-\[max/)
    assert.match(mobileCss, /\.orb-flight-recorder/)
  })
})

describe('ORB QA storage key', () => {
  it('uses orb-appearance-mode localStorage key', () => {
    assert.equal(ORB_APPEARANCE_STORAGE_KEY, 'orb-appearance-mode')
  })
})
