# ORB browser QA console helper

Paste into the browser devtools console on `/orb` while signed in. Does not print cookies or tokens.

```javascript
(async function orbResidentialQa() {
  const base = '/backend'
  const get = async (path) => {
    const r = await fetch(`${base}${path}`, { credentials: 'include' })
    let body = null
    try {
      body = await r.json()
    } catch {
      body = null
    }
    return { path, status: r.status, body }
  }

  const theme =
    typeof localStorage !== 'undefined'
      ? {
          orb_theme: localStorage.getItem('orb-theme'),
          orb_appearance: localStorage.getItem('orb-appearance')
        }
      : {}

  const { assessOrbVoiceReadiness, detectSpeechRecognitionSupported, detectMediaRecorderSupported } =
    await import('/_next/static/chunks/').catch(() => ({}))

  const voiceReadiness = {
    speech_recognition: typeof window !== 'undefined' && Boolean(
      window.SpeechRecognition || window.webkitSpeechRecognition
    ),
    media_recorder: typeof MediaRecorder !== 'undefined',
    secure_context: typeof window !== 'undefined' ? window.isSecureContext : false
  }

  const micHold = await (async () => {
    if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: 'no_getUserMedia' }
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      await new Promise((r) => setTimeout(r, 2000))
      stream.getTracks().forEach((t) => t.stop())
      return { ok: true, held_ms: 2000 }
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.name : 'error' }
    }
  })()

  const dictateProbe = await (async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      return { ok: false, reason: 'unsupported' }
    }
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.start(200)
      await new Promise((r) => setTimeout(r, 400))
      rec.stop()
      await new Promise((r) => {
        rec.onstop = r
      })
      stream.getTracks().forEach((t) => t.stop())
      return { ok: true, bytes: chunks.reduce((n, c) => n + c.size, 0) }
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop())
      return { ok: false, reason: e instanceof Error ? e.name : 'error' }
    }
  })()

  const results = {
    passkeys: await get('/auth/passkeys/status'),
    projects: await get('/orb/projects'),
    usage: await get('/orb/usage'),
    seed_project: await get('/orb/projects/project-general'),
    theme,
    voiceReadiness,
    micHold,
    dictateProbe
  }

  console.table([
    { check: 'passkeys', status: results.passkeys.status },
    { check: 'projects', status: results.projects.status },
    { check: 'usage', status: results.usage.status },
    { check: 'seed project', status: results.seed_project.status }
  ])
  console.log('ORB QA detail', results)
  return results
})()
```

Expected when signed in:

| Check | Status |
|-------|--------|
| passkeys | 200 |
| projects | 200 |
| usage | 200 |
| seed project | 404 (acceptable) |
