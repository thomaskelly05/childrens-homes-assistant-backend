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

  const theme = {
    orb_theme: localStorage.getItem('orb-theme'),
    orb_appearance: localStorage.getItem('orb-appearance'),
    data_orb_theme: document.documentElement.getAttribute('data-orb-theme'),
    layout_class: document.querySelector('.orb-chat-layout')?.className ?? null
  }

  const voiceReadiness = {
    speech_recognition: Boolean(
      window.SpeechRecognition || window.webkitSpeechRecognition
    ),
    media_recorder: typeof MediaRecorder !== 'undefined',
    secure_context: window.isSecureContext
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

  const ui = {
    dictate_paste_tile: Boolean(document.querySelector('[data-orb-dictate-start="paste"]')),
    dictate_record_note: Boolean(document.querySelector('[data-orb-dictate-start="record_note"]')),
    composer_mic: Boolean(document.querySelector('[data-orb-composer-mic]')),
    voice_start: document.querySelector('[data-orb-voice-start]'),
    voice_start_disabled_reason: document
      .querySelector('[data-orb-voice-start]')
      ?.getAttribute('data-orb-voice-start-disabled-reason'),
    open_dictate_instead: Boolean(document.querySelector('[data-orb-voice-open-dictate]'))
  }

  const results = {
    passkeys: await get('/auth/passkeys/status'),
    projects: await get('/orb/projects'),
    usage: await get('/orb/usage'),
    seed_project: await get('/orb/projects/project-general'),
    theme,
    voiceReadiness,
    micHold,
    ui
  }

  console.table([
    { check: 'passkeys', status: results.passkeys.status },
    { check: 'projects', status: results.projects.status },
    { check: 'usage', status: results.usage.status },
    { check: 'seed project', status: results.seed_project.status },
    { check: 'speech_recognition', ok: results.voiceReadiness.speech_recognition },
    { check: 'media_recorder', ok: results.voiceReadiness.media_recorder },
    { check: 'mic 2s hold', ok: results.micHold.ok },
    { check: 'dictate paste tile', ok: results.ui.dictate_paste_tile },
    { check: 'dictate record note', ok: results.ui.dictate_record_note },
    { check: 'composer mic', ok: results.ui.composer_mic },
    { check: 'open dictate instead', ok: results.ui.open_dictate_instead }
  ])
  console.log('ORB QA detail', results)
  return results
})()
```

## Manual checklist (after deploy)

| Check | Expected |
|-------|----------|
| `/backend/orb/usage` | 200 |
| Light mode | White / pale blue surfaces; modals not black |
| Dark mode | Premium navy / blue glow retained |
| System mode | Follows device preference |
| Voice inactive subscription | Start disabled; Open Dictate enabled |
| Voice Safari / no SpeechRecognition | Routes to Dictate; no dead Speak |
| Voice session | Active only when realtime mic or SpeechRecognition started |
| Composer mic | Always opens Voice or Dictate |
| Dictate paste flow | Paste → Use pasted text → Generate → output or local draft |
| Dictate record | Starts speech or honest audio-only message |
| Stop dictation | Keeps transcript visible |
| No dead controls | No clickable buttons that do nothing |
