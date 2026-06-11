import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LIVE_LLM_PROVIDER_FAILURE_MESSAGE,
  OPENAI_REQUEST_HEADERS_TOO_LARGE_CODE,
  UPSTREAM_502_CODE,
  isHtmlErrorBody,
  mapEvaluationInfrastructureError
} from './orb-evaluation-infrastructure-errors.ts'

test('detects raw HTML upstream bodies', () => {
  assert.equal(isHtmlErrorBody('<!DOCTYPE html><html><body>502</body></html>'), true)
  assert.equal(isHtmlErrorBody('{"error":"ok"}'), false)
})

test('maps 502 HTML to clean provider failure message and code', () => {
  const mapped = mapEvaluationInfrastructureError('<!DOCTYPE html><html></html>', 502)
  assert.equal(mapped.message, LIVE_LLM_PROVIDER_FAILURE_MESSAGE)
  assert.equal(mapped.code, UPSTREAM_502_CODE)
  assert.equal(mapped.message.includes('<!DOCTYPE'), false)
})

test('maps OpenAI 431 header failures to openai_request_headers_too_large', () => {
  const mapped = mapEvaluationInfrastructureError(
    'openai.APIStatusError: Error code: 431 request_headers_too_large',
    502
  )
  assert.equal(mapped.message, LIVE_LLM_PROVIDER_FAILURE_MESSAGE)
  assert.equal(mapped.code, OPENAI_REQUEST_HEADERS_TOO_LARGE_CODE)
})
