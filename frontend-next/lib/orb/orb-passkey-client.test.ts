import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, before } from 'node:test'

import {
  base64UrlToBuffer,
  parseOrbPasskeyCreationOptions,
  parseOrbPasskeyRequestOptions,
  unwrapPublicKeyOptions
} from './orb-passkey-options.ts'

const SAMPLE_CHALLENGE = 'AQIDBAUGBwgJCgsMDQ4PEA'
const SAMPLE_CREDENTIAL_ID = 'AQIDBAU'
const SAMPLE_USER_ID = 'aW5kaWNhcmUtdXNlcjE'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function installBrowserBase64Shim() {
  const g = globalThis as typeof globalThis & {
    window?: { atob: typeof atob; btoa: typeof btoa }
    atob?: typeof atob
    btoa?: typeof btoa
  }

  g.atob = (value: string) => Buffer.from(value, 'base64').toString('binary')
  g.btoa = (value: string) => Buffer.from(value, 'binary').toString('base64')
  g.window = { atob: g.atob, btoa: g.btoa }
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('hex')
}

describe('orb passkey client option parsing', () => {
  before(() => {
    installBrowserBase64Shim()
  })

  it('unwrapPublicKeyOptions accepts { options: ... }', () => {
    const payload = {
      ok: true,
      options: {
        challenge: SAMPLE_CHALLENGE,
        rpId: 'localhost'
      }
    }
    const unwrapped = unwrapPublicKeyOptions(payload)
    assert.equal(unwrapped.challenge, SAMPLE_CHALLENGE)
    assert.equal(unwrapped.rpId, 'localhost')
  })

  it('unwrapPublicKeyOptions accepts { publicKey: ... }', () => {
    const payload = {
      publicKey: {
        challenge: SAMPLE_CHALLENGE,
        rpId: 'example.com'
      }
    }
    const unwrapped = unwrapPublicKeyOptions(payload)
    assert.equal(unwrapped.challenge, SAMPLE_CHALLENGE)
    assert.equal(unwrapped.rpId, 'example.com')
  })

  it('unwrapPublicKeyOptions accepts { options: { publicKey: ... } }', () => {
    const payload = {
      options: {
        publicKey: {
          challenge: SAMPLE_CHALLENGE,
          rpId: 'orb.test'
        }
      }
    }
    const unwrapped = unwrapPublicKeyOptions(payload)
    assert.equal(unwrapped.challenge, SAMPLE_CHALLENGE)
    assert.equal(unwrapped.rpId, 'orb.test')
  })

  it('parseOrbPasskeyRequestOptions converts challenge to ArrayBuffer', () => {
    const parsed = parseOrbPasskeyRequestOptions({
      challenge: SAMPLE_CHALLENGE,
      rpId: 'localhost',
      timeout: 60000,
      userVerification: 'preferred'
    })
    assert.ok(parsed.challenge instanceof ArrayBuffer)
    assert.equal(bufferToHex(parsed.challenge), bufferToHex(base64UrlToBuffer(SAMPLE_CHALLENGE)))
    assert.equal(parsed.rpId, 'localhost')
    assert.equal(parsed.timeout, 60000)
    assert.equal(parsed.userVerification, 'preferred')
  })

  it('parseOrbPasskeyRequestOptions converts allowCredentials ids to ArrayBuffer', () => {
    const parsed = parseOrbPasskeyRequestOptions({
      challenge: SAMPLE_CHALLENGE,
      allowCredentials: [{ type: 'public-key', id: SAMPLE_CREDENTIAL_ID }]
    })
    assert.ok(Array.isArray(parsed.allowCredentials))
    assert.equal(parsed.allowCredentials?.length, 1)
    const first = parsed.allowCredentials?.[0]
    assert.ok(first?.id instanceof ArrayBuffer)
    assert.equal(bufferToHex(first.id), bufferToHex(base64UrlToBuffer(SAMPLE_CREDENTIAL_ID)))
  })

  it('parseOrbPasskeyCreationOptions converts user.id to ArrayBuffer', () => {
    const parsed = parseOrbPasskeyCreationOptions({
      challenge: SAMPLE_CHALLENGE,
      rp: { name: 'ORB Residential', id: 'localhost' },
      user: {
        id: SAMPLE_USER_ID,
        name: 'user@example.com',
        displayName: 'user@example.com'
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }]
    })
    assert.ok(parsed.user.id instanceof ArrayBuffer)
    assert.equal(bufferToHex(parsed.user.id), bufferToHex(base64UrlToBuffer(SAMPLE_USER_ID)))
  })

  it('parseOrbPasskeyRequestOptions throws readable error when challenge is missing', () => {
    assert.throws(
      () => parseOrbPasskeyRequestOptions({ rpId: 'localhost' }),
      /Passkey sign-in could not start because the server did not return a challenge\./
    )
  })

  it('parseOrbPasskeyCreationOptions throws readable error when user.id is missing', () => {
    assert.throws(
      () =>
        parseOrbPasskeyCreationOptions({
          challenge: SAMPLE_CHALLENGE,
          rp: { name: 'ORB Residential', id: 'localhost' },
          user: { name: 'user@example.com', displayName: 'user@example.com' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }]
        }),
      /Passkey setup could not start because the server did not return complete setup options\./
    )
  })

  it('does not rely on native WebAuthn JSON parser methods', () => {
    const clientSource = readFileSync(join(root, 'lib/orb/orb-passkey-client.ts'), 'utf8')
    const optionsSource = readFileSync(join(root, 'lib/orb/orb-passkey-options.ts'), 'utf8')
    assert.doesNotMatch(clientSource, /parseRequestOptionsFromJSON/)
    assert.doesNotMatch(clientSource, /parseCreationOptionsFromJSON/)
    assert.doesNotMatch(optionsSource, /parseRequestOptionsFromJSON/)
    assert.doesNotMatch(optionsSource, /parseCreationOptionsFromJSON/)
  })
})
