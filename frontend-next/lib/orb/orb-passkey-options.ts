type UserVerificationRequirement = PublicKeyCredentialRequestOptions['userVerification']

function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const raw = window.atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readBase64UrlField(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value === 'string' && value.trim()) return value
  return ''
}

function mapCredentialDescriptors(
  items: unknown,
  idKey = 'id'
): PublicKeyCredentialDescriptor[] | undefined {
  if (!Array.isArray(items)) return undefined
  return items.map((item) => {
    const descriptor = asRecord(item) || {}
    const mapped: PublicKeyCredentialDescriptor = {
      type: (descriptor.type as PublicKeyCredentialDescriptor['type']) || 'public-key',
      id: base64UrlToBuffer(readBase64UrlField(descriptor, idKey))
    }
    if (typeof descriptor.transports === 'string') {
      mapped.transports = [descriptor.transports] as AuthenticatorTransport[]
    } else if (Array.isArray(descriptor.transports)) {
      mapped.transports = descriptor.transports as AuthenticatorTransport[]
    }
    return mapped
  })
}

export function unwrapPublicKeyOptions(value: unknown): Record<string, unknown> {
  const record = asRecord(value)
  if (!record) {
    throw new Error('Invalid passkey options payload.')
  }

  const nestedPublicKey = asRecord(record.publicKey) || asRecord(record.public_key)
  if (nestedPublicKey) return nestedPublicKey

  const options = asRecord(record.options)
  if (options) {
    const optionsPublicKey = asRecord(options.publicKey) || asRecord(options.public_key)
    if (optionsPublicKey) return optionsPublicKey
    return options
  }

  return record
}

export function parseOrbPasskeyRequestOptions(options: unknown): PublicKeyCredentialRequestOptions {
  const raw = unwrapPublicKeyOptions(options)
  const challengeValue = readBase64UrlField(raw, 'challenge')
  if (!challengeValue) {
    throw new Error('Passkey sign-in could not start because the server did not return a challenge.')
  }

  const parsed: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(challengeValue),
    allowCredentials: mapCredentialDescriptors(raw.allowCredentials)
  }

  if (typeof raw.rpId === 'string' && raw.rpId) parsed.rpId = raw.rpId
  if (typeof raw.timeout === 'number' && Number.isFinite(raw.timeout)) parsed.timeout = raw.timeout
  if (raw.userVerification === 'required' || raw.userVerification === 'preferred' || raw.userVerification === 'discouraged') {
    parsed.userVerification = raw.userVerification as UserVerificationRequirement
  }

  return parsed
}

export function parseOrbPasskeyCreationOptions(options: unknown): PublicKeyCredentialCreationOptions {
  const raw = unwrapPublicKeyOptions(options)
  const challengeValue = readBase64UrlField(raw, 'challenge')
  const userRecord = asRecord(raw.user) || {}
  const userIdValue = readBase64UrlField(userRecord, 'id')

  if (!challengeValue || !userIdValue) {
    throw new Error('Passkey setup could not start because the server did not return complete setup options.')
  }

  const rpRecord = asRecord(raw.rp) || {}
  const parsed: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlToBuffer(challengeValue),
    rp: {
      name: typeof rpRecord.name === 'string' ? rpRecord.name : '',
      id: typeof rpRecord.id === 'string' ? rpRecord.id : undefined
    },
    user: {
      id: base64UrlToBuffer(userIdValue),
      name: typeof userRecord.name === 'string' ? userRecord.name : '',
      displayName: typeof userRecord.displayName === 'string' ? userRecord.displayName : ''
    },
    pubKeyCredParams: Array.isArray(raw.pubKeyCredParams)
      ? (raw.pubKeyCredParams as PublicKeyCredentialParameters[])
      : [{ type: 'public-key', alg: -7 }]
  }

  if (typeof raw.timeout === 'number' && Number.isFinite(raw.timeout)) parsed.timeout = raw.timeout
  if (raw.attestation === 'none' || raw.attestation === 'indirect' || raw.attestation === 'direct' || raw.attestation === 'enterprise') {
    parsed.attestation = raw.attestation
  }
  const authenticatorSelection = asRecord(raw.authenticatorSelection)
  if (authenticatorSelection) {
    parsed.authenticatorSelection = authenticatorSelection as AuthenticatorSelectionCriteria
  }
  parsed.excludeCredentials = mapCredentialDescriptors(raw.excludeCredentials)

  return parsed
}

export function extractPasskeyOptionsPayload(payload: unknown): unknown {
  const record = asRecord(payload)
  if (!record) return null

  if (record.options !== undefined) return record.options
  if (record.publicKey !== undefined || record.public_key !== undefined) return payload
  if ('challenge' in record) return payload

  return null
}

export { base64UrlToBuffer }
