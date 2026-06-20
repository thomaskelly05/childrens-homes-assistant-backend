import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { findOrbDictateMatches, replaceOrbDictateAll } from '../../lib/orb/dictate/orb-dictate-find-replace.ts'
import { calculateOrbDictateReadiness } from '../../lib/orb/dictate/orb-dictate-readiness.ts'
import { diffOrbDictateSections } from '../../lib/orb/dictate/orb-dictate-diff.ts'
import { builtinResourcesForTab } from '../../lib/orb/orb-knowledge-builtin.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB reliability pass', () => {
  it('OAuth start uses window navigation not Link fetch', () => {
    const authButton = readComponent('components/orb-residential/ui/orb-auth-button.tsx')
    const nav = readComponent('lib/orb/orb-oauth-navigation.ts')
    assert.match(authButton, /navigateOrbOAuthStart/)
    assert.match(authButton, /window\.location\.assign|navigateOrbOAuthStart/)
    assert.match(nav, /window\.location\.assign/)
    assert.match(nav, /orbOAuthStartUrl/)
  })

  it('session gate module exists and is wired to auth context', () => {
    const gate = readComponent('lib/orb/orb-session-gate.ts')
    const auth = readComponent('contexts/auth-context.tsx')
    assert.match(gate, /shouldSkipAuthenticatedOrbFetch/)
    assert.match(auth, /markOrbBackendDegraded/)
    assert.match(auth, /markOrbBackendReady/)
  })

  it('seed project ids are not synced to API', () => {
    const resilience = readComponent('lib/orb/orb-projects-resilience.ts')
    assert.match(resilience, /isOrbSeedProjectId/)
    assert.match(resilience, /isValidOrbProjectIdForApi/)
    assert.match(resilience, /orb-residential-seed/)
  })

  it('knowledge built-in library includes residential resources on failure path', () => {
    const official = builtinResourcesForTab('official')
    assert.ok(official.some((r) => r.title.includes('Regulations')))
    const safeguarding = builtinResourcesForTab('safeguarding')
    assert.ok(safeguarding.some((r) => /Missing from care|Contextual|Complaints/i.test(r.title)))
  })

  it('find replace counts matches and replaces all', () => {
    const text = 'Tom met Tom at the home.'
    const matches = findOrbDictateMatches(text, 'Tom')
    assert.equal(matches.length, 2)
    const replaced = replaceOrbDictateAll(text, 'Tom', 'Staff member')
    assert.equal(replaced.replaced, 2)
    assert.match(replaced.text, /Staff member/)
  })

  it('readiness status is calculated without implying approval', () => {
    const result = calculateOrbDictateReadiness('Short note.', {})
    assert.ok(['not_ready', 'needs_review', 'good_draft', 'strong_draft'].includes(result.label))
  })

  it('section diff highlights changed sections', () => {
    const before = '## Facts\nOld text\n\n## Actions\nNone'
    const after = '## Facts\nNew text\n\n## Actions\nFollow up'
    const changes = diffOrbDictateSections(before, after)
    assert.ok(changes.length >= 1)
  })

  it('saved outputs panel uses resilient list client', () => {
    const panel = readComponent('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /listOrbSavedOutputsResilient/)
    assert.match(panel, /getOrbLocalSavedOutput/)
  })

  it('dictate studio has find replace, tone lock, readiness, sync prompt', () => {
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    assert.match(studio, /OrbDictateFindReplacePanel/)
    assert.match(studio, /data-orb-dictate-tone-lock/)
    assert.match(studio, /data-orb-dictate-readiness-status/)
    assert.match(studio, /OrbDictateDraftSyncPrompt/)
    assert.match(studio, /data-orb-dictate-save-now/)
  })

  it('edit preview requires apply and supports keep suggestion', () => {
    const assistant = readComponent('components/orb-standalone/orb-dictate-studio-assistant.tsx')
    assert.match(assistant, /data-orb-dictate-apply-edit/)
    assert.match(assistant, /data-orb-dictate-keep-suggestion/)
    assert.match(assistant, /data-orb-dictate-section-diff/)
  })

  it('modal viewport uses dvh safe area for xlarge dictate', () => {
    const shell = readComponent('components/orb-standalone/orb-app-panel-shell.tsx')
    const css = readFileSync(join(root, 'app/orb/_legacy-ui-archive/orb-premium-tokens.css'), 'utf8')
    assert.match(shell, /100dvh/)
    assert.match(css, /orb-dictate-studio-scroll/)
  })

  it('account modal explains local content mode', () => {
    const modal = readComponent('components/orb-standalone/orb-account-modal.tsx')
    assert.match(modal, /data-orb-account-local-mode/)
    assert.match(modal, /local ORB content/)
  })
})
