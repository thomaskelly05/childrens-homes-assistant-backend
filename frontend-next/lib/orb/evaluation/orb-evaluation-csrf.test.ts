import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = join(process.cwd(), 'lib/orb/evaluation')
const securityRoot = join(process.cwd(), 'lib/security')
const appRoot = join(process.cwd(), 'app/api/orb/evaluation')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

test('evaluation client uses shared CSRF helper and correct cookie pattern', () => {
  const client = read(join(root, 'orb-evaluation-client.ts'))
  const csrfClient = read(join(securityRoot, 'csrf-client.ts'))
  const authApi = read(join(process.cwd(), 'lib/auth/api.ts'))

  assert.match(client, /applyCsrfHeaders/)
  assert.match(client, /credentials:\s*'include'/)
  assert.doesNotMatch(client, /csrf_token=/)
  assert.match(authApi, /__Host-indicare_csrf|indicare_csrf/)
  assert.match(csrfClient, /EVALUATION_CSRF_REFRESH_MESSAGE/)
})

test('internal brain high-risk POST includes CSRF header', () => {
  const client = read(join(root, 'orb-evaluation-client.ts'))
  assert.match(client, /postEvaluationRun/)
  assert.match(client, /applyCsrfHeaders/)
  assert.match(client, /\/api\/orb\/evaluation\/runs/)
})

test('generate scenarios POST includes CSRF header', () => {
  const client = read(join(root, 'orb-evaluation-client.ts'))
  assert.match(client, /postEvaluationScenariosGenerate/)
  assert.match(client, /\/api\/orb\/evaluation\/scenarios\/generate/)
})

test('retest POST includes CSRF header', () => {
  const client = read(join(root, 'orb-evaluation-client.ts'))
  assert.match(client, /postEvaluationRetest/)
  assert.match(client, /\/retest/)
})

test('create-fix POST includes CSRF header', () => {
  const client = read(join(root, 'orb-evaluation-client.ts'))
  assert.match(client, /postEvaluationCreateFix/)
  assert.match(client, /\/create-fix/)
})

test('csrf_failed shows clear refresh sign-in message', () => {
  const client = read(join(root, 'orb-evaluation-client.ts'))
  const page = read(join(process.cwd(), 'components/founder/founder-orb-evaluation-page.tsx'))
  const csrfClient = read(join(securityRoot, 'csrf-client.ts'))

  assert.match(client, /isCsrfFailedPayload/)
  assert.match(client, /EVALUATION_CSRF_REFRESH_MESSAGE/)
  assert.match(page, /isEvaluationCsrfError/)
  assert.match(page, /EVALUATION_CSRF_REFRESH_MESSAGE/)
  assert.match(csrfClient, /not being forwarded correctly/)
})

test('success path requires saved run before complete toast', () => {
  const page = read(join(process.cwd(), 'components/founder/founder-orb-evaluation-page.tsx'))
  assert.match(page, /requireSavedRun/)
  assert.match(page, /assertCompletedEvaluationRunSaved/)
  assert.match(page, /\$\{label\} complete/)
})

test('POST proxy forwards Cookie and CSRF via mergeFounderProxyHeaders', () => {
  const api = read(join(root, 'orb-evaluation-api.ts'))
  const founderSession = read(join(process.cwd(), 'lib/founder/auth/founder-session.ts'))
  const csrfServer = read(join(securityRoot, 'csrf-server.ts'))
  const runsRoute = read(join(appRoot, 'runs/route.ts'))

  assert.match(api, /mergeFounderProxyHeaders/)
  assert.match(api, /cookieStore/)
  assert.match(founderSession, /headers\.set\('cookie', cookieHeader\)/)
  assert.match(founderSession, /resolveProxyCsrfToken/)
  assert.match(csrfServer, /x-csrf-token/)
  assert.match(runsRoute, /handleEvaluationRunsPost/)
})

test('proxy preserves backend csrf_failed instead of generic success', () => {
  const api = read(join(root, 'orb-evaluation-api.ts'))
  const generateRoute = read(join(appRoot, 'scenarios/generate/route.ts'))

  assert.match(api, /parseUpstreamFailure/)
  assert.match(api, /csrf_failed/)
  assert.match(api, /code: result\.code/)
  assert.doesNotMatch(generateRoute, /stored: false/)
  assert.match(generateRoute, /storeHeaders\.set\('x-csrf-token'/)
})

test('run service removes pending run on CSRF failure', () => {
  const service = read(join(root, 'orb-evaluation-run-service.ts'))
  assert.match(service, /isEvaluationCsrfError/)
  assert.match(service, /removeEvaluationRun/)
  assert.match(service, /abortPendingRun/)
})

test('evaluation client does not call backend admin routes directly', () => {
  const client = read(join(root, 'orb-evaluation-client.ts'))
  assert.doesNotMatch(client, /\/orb\/admin\/evaluation/)
})
