export const OPENAI_REQUEST_HEADERS_TOO_LARGE_CODE = 'openai_request_headers_too_large'
export const UPSTREAM_502_CODE = 'upstream_502'
export const UPSTREAM_NON_JSON_CODE = 'upstream_non_json'

export const LIVE_LLM_PROVIDER_FAILURE_MESSAGE =
  'High-risk pack could not complete because the live LLM provider request failed. No safety result was recorded for this run.'

const INFRASTRUCTURE_ERROR_PREFIX = 'infrastructure_error:'

export function isHtmlErrorBody(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')
}

export function isInfrastructureErrorMessage(message: string | undefined): boolean {
  return Boolean(message?.trim().startsWith(INFRASTRUCTURE_ERROR_PREFIX))
}

export function infrastructureErrorCodeFromMessage(message: string | undefined): string | undefined {
  if (!isInfrastructureErrorMessage(message)) return undefined
  const code = message!.slice(INFRASTRUCTURE_ERROR_PREFIX.length).trim()
  return code || undefined
}

export function mapEvaluationInfrastructureError(
  detail: string,
  status: number
): { message: string; code: string } {
  const trimmed = detail.trim()

  if (isHtmlErrorBody(trimmed)) {
    return {
      message: LIVE_LLM_PROVIDER_FAILURE_MESSAGE,
      code: status === 502 ? UPSTREAM_502_CODE : UPSTREAM_NON_JSON_CODE
    }
  }

  const lowered = trimmed.toLowerCase()
  if (
    lowered.includes('request_headers_too_large') ||
    lowered.includes('openai_request_headers_too_large') ||
    /\b431\b/.test(lowered)
  ) {
    return {
      message: LIVE_LLM_PROVIDER_FAILURE_MESSAGE,
      code: OPENAI_REQUEST_HEADERS_TOO_LARGE_CODE
    }
  }

  if (status === 502) {
    return {
      message: LIVE_LLM_PROVIDER_FAILURE_MESSAGE,
      code: UPSTREAM_502_CODE
    }
  }

  return {
    message: trimmed.slice(0, 240) || LIVE_LLM_PROVIDER_FAILURE_MESSAGE,
    code: UPSTREAM_NON_JSON_CODE
  }
}

export class EvaluationInfrastructureError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'EvaluationInfrastructureError'
    this.code = code
  }
}
