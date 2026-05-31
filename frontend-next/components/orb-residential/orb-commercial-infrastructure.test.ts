import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('billing modal includes plan, usage, spending cap and buy more', () => {
  const billing = readFileSync(
    new URL('../orb-standalone/orb-billing-modal.tsx', import.meta.url),
    'utf8'
  )
  assert.match(billing, /data-orb-billing-plan-card/)
  assert.match(billing, /data-orb-billing-usage/)
  assert.match(billing, /data-orb-billing-spending-cap/)
  assert.match(billing, /data-orb-billing-buy-more/)
  assert.match(billing, /saveOrbSpendingCap/)
  assert.match(billing, /startOrbTopUpCheckout/)
  assert.match(billing, /ORB Voice/)
  assert.doesNotMatch(billing, /almost ready — you can manage/)
})

test('billing client exposes usage and top-up endpoints', () => {
  const client = readFileSync(new URL('../../lib/orb/orb-billing-client.ts', import.meta.url), 'utf8')
  assert.match(client, /\/orb\/usage\/spending-cap/)
  assert.match(client, /\/orb\/usage\/top-up-checkout/)
  assert.match(client, /\/orb\/subscription\/portal/)
  assert.match(client, /billing=success/)
})

test('login uses auth providers discovery', () => {
  const login = readFileSync(new URL('./orb-login-screen.tsx', import.meta.url), 'utf8')
  assert.match(login, /authProviders/)
  assert.match(login, /orbOAuthStartUrl\('microsoft'/)
  assert.match(login, /data-orb-passkey-sign-in/)
})

test('standalone conversation sends project_memory', () => {
  const client = readFileSync(new URL('../../lib/orb/standalone-client.ts', import.meta.url), 'utf8')
  assert.match(client, /project_memory/)
})

test('projects client syncs to server', () => {
  const projects = readFileSync(new URL('../../lib/orb/orb-projects-client.ts', import.meta.url), 'utf8')
  assert.match(projects, /\/orb\/projects/)
  assert.match(projects, /syncOrbProjectsToServer/)
})

test('voice station requires explicit start', () => {
  const voice = readFileSync(
    new URL('../orb-standalone/orb-voice-station.tsx', import.meta.url),
    'utf8'
  )
  assert.match(voice, /Voice starts only when you press Start/)
  assert.match(voice, /data-orb-voice-start/)
  assert.match(voice, /Start conversation/)
})
