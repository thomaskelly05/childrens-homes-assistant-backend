import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  scenarios: {
    assistant_text_streams: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 }
      ],
      exec: 'textStreamScenario'
    },
    assistant_health_checks: {
      executor: 'constant-vus',
      vus: 10,
      duration: '9m',
      exec: 'healthScenario'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<5000']
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'
const AUTH_COOKIE = __ENV.AUTH_COOKIE || ''

function headers() {
  return {
    'Content-Type': 'application/json',
    Cookie: AUTH_COOKIE
  }
}

export function healthScenario() {
  const realtime = http.get(`${BASE_URL}/assistant/realtime/health`, {
    headers: headers()
  })

  check(realtime, {
    'realtime health responds': (response) => response.status < 500
  })

  sleep(3)
}

export function textStreamScenario() {
  const payload = JSON.stringify({
    message: 'Summarise tonight\'s handover risks and identify any safeguarding points.',
    assistant_surface: 'load-test',
    assistant_mode: 'assistant',
    conversation_id: `load-test-${__VU}`,
    history: []
  })

  const response = http.post(`${BASE_URL}/assistant/general/stream`, payload, {
    headers: headers(),
    timeout: '30s'
  })

  check(response, {
    'assistant stream accepted': (res) => res.status === 200,
    'assistant stream returns data': (res) => String(res.body || '').includes('data:') || String(res.body || '').includes('[DONE]')
  })

  sleep(2)
}
