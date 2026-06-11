# ORB Evaluation Browser Debug Snippet

Paste into the browser console on `/founder/orb-evaluation` while signed in as founder/admin.

Console-safe: no backticks or markdown inside the snippet.

```javascript
(async function orbEvaluationCsrfDebug() {
  function csrfFromCookie() {
    var m = document.cookie.match(/(?:^|;\s*)(?:__Host-indicare_csrf|indicare_csrf)=([^;]*)/);
    return m && m[1] ? decodeURIComponent(m[1]) : '';
  }
  function unsafeHeaders() {
    var h = { Accept: 'application/json', 'Content-Type': 'application/json' };
    var t = csrfFromCookie();
    if (t) h['X-CSRF-Token'] = t;
    return h;
  }
  async function step(label, fn) {
    console.log('--- ' + label + ' ---');
    try {
      var result = await fn();
      console.log(result);
      return result;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  await step('auth me', function() {
    return fetch('/backend/auth/me', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function(r) { return r.json().then(function(j) { return { status: r.status, body: j }; }); });
  });
  await step('debug security GET', function() {
    return fetch('/api/orb/evaluation/debug/security', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function(r) { return r.json().then(function(j) { return { status: r.status, body: j }; }); });
  });
  await step('debug security POST', function() {
    return fetch('/api/orb/evaluation/debug/security-post', {
      method: 'POST',
      credentials: 'include',
      headers: unsafeHeaders(),
      body: '{}'
    }).then(function(r) { return r.json().then(function(j) { return { status: r.status, body: j }; }); });
  });
  await step('evaluation runs POST internal-brain', function() {
    return fetch('/api/orb/evaluation/runs', {
      method: 'POST',
      credentials: 'include',
      headers: unsafeHeaders(),
      body: JSON.stringify({
        title: 'Console internal-brain high-risk probe',
        mode: 'internal-brain',
        pack_type: 'high-risk',
        limit: 1,
        scenarios: [{
          id: 'console-probe-1',
          domain: 'safeguarding',
          rolePerspective: 'residential-worker',
          category: 'missing-from-home',
          question: 'Synthetic probe scenario.',
          expectedResponseFocus: ['police'],
          requiredSafeguards: ['missing protocol'],
          requiredRegulatoryAnchors: ['Regulation 27'],
          requiredTone: ['calm'],
          riskLevel: 'critical',
          adversarialFlags: []
        }]
      })
    }).then(function(r) { return r.json().then(function(j) { return { status: r.status, body: j }; }); });
  });
  await step('evaluation runs GET', function() {
    return fetch('/api/orb/evaluation/runs', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function(r) { return r.json().then(function(j) { return { status: r.status, runCount: (j.data && j.data.runs && j.data.runs.length) || 0, body: j }; }); });
  });
  console.log('ORB evaluation CSRF debug complete');
})();
```

Expected healthy output:

- `auth me` → status 200, `ok: true`, user with founder/admin role
- `debug security GET` → `founderSessionResolved: true`, `hasIndicareCsrf` or `hasHostIndicareCsrf` true
- `debug security POST` → `csrfPassed: true`
- `evaluation runs POST` → status 200, `success: true`
- `evaluation runs GET` → `runCount` increased
