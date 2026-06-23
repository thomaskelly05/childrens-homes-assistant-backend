#!/usr/bin/env node
/**
 * ORB PR #1729 live UI rerun — real backend session (no SSE mocks).
 * Usage: node scripts/run-orb-live-ui-rerun.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const REPORT_DIR = join(ROOT, 'reports')
const SHOT_DIR = join(REPORT_DIR, 'orb_live_ui_screenshots_pr1729')
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001'
const EMAIL = process.env.ORB_LIVE_UI_EMAIL || 'admin@indicare.co.uk'
const PASSWORD = process.env.ORB_LIVE_UI_PASSWORD || 'ChangeMe123456'

const PROMPTS = [
  { id: 'daily_recording', label: 'Daily recording', message: 'Help me write a daily record — calm breakfast, chose toast, watched TV before handover.' },
  { id: 'missing_from_care', label: 'Missing from care', message: 'A young person is missing from care right now. What should staff do?' },
  { id: 'allegations_lado', label: 'Allegation / LADO', message: 'A young person alleged a member of staff grabbed them.' },
  { id: 'self_harm_suicide', label: 'Self-harm', message: 'Young person disclosed self-harm and said they want to die.' },
  { id: 'medication_refusal_support', label: 'Medication refusal', message: 'A young person refused medication. What should we consider?' },
  { id: 'orb_communicate', label: 'ORB Communicate', message: 'Create a communication support pack for a hospital visit tomorrow.' },
  { id: 'regulation_45', label: 'Reg 45', message: 'What should a Reg 45 review cover this quarter?' },
  { id: 'aac_child_voice', label: 'Child voice / AAC', message: "How can I evidence a young person's voice when they communicate mainly through gestures and symbols?" },
  { id: 'physical_intervention_restraint', label: 'Physical intervention', message: 'Help me record a physical intervention used to guide a young person away from danger.' },
  { id: 'management_oversight_drift', label: 'Management oversight', message: 'What management oversight is needed when incident frequency is drifting up?' }
]

const MOCK_LEAK = /configure\s+openai_api_key|orb\s+mock\s+engine\s+response|mock\s+provider|placeholder\s+provider/i
const INTERNAL_LEAK = /adult profile preferences|default lenses|orb internal brain|sources \/ basis/i
const BROKEN_ADULT = /the adult present|the adult actions/i
const MED_ERROR = /medication error/i
const DSL_OUTSIDE = /\bdsl\b/i

function assess(categoryId, text, timing, ui) {
  const lower = (text || '').toLowerCase()
  const concerns = []
  const failures = []
  if (!text || text.trim().length < 20) failures.push('empty or very short assistant answer')
  if (MOCK_LEAK.test(text)) failures.push('mock/provider config leakage')
  if (INTERNAL_LEAK.test(text)) failures.push('internal prompt/profile leakage')
  if (BROKEN_ADULT.test(text)) failures.push('broken adult Present/Actions wording')
  if (/\bsources \/ basis\b/i.test(text)) failures.push('inline Source basis dump')
  if (categoryId === 'medication_refusal_support' && MED_ERROR.test(text)) failures.push('medication refusal mentions medication error')
  if (categoryId !== 'education' && DSL_OUTSIDE.test(text) && !/school|education|ehcp/.test(lower)) concerns.push('possible DSL wording outside education context')
  if (categoryId === 'orb_communicate') {
    if (/contact with someone important/i.test(text) && !/hospital visit|hospital appointment|going to hospital/i.test(text)) {
      failures.push('communicate pack uses contact wording instead of hospital visit')
    }
    if (!/hospital/i.test(lower)) concerns.push('communicate answer may lack hospital visit framing')
  }
  if (ui.duplicateInstant) failures.push('duplicated instant prelude line')
  if (!ui.bubbleVisible) failures.push('assistant bubble not visible')
  if (ui.firstVisibleMs != null && ui.firstVisibleMs > 500) concerns.push(`first_visible_ms=${ui.firstVisibleMs} (>500ms target)`)
  if (!ui.instantPreludeVisible && ['daily_recording', 'medication_refusal_support', 'missing_from_care', 'allegations_lado', 'self_harm_suicide'].includes(categoryId)) {
    concerns.push('instant prelude element not detected')
  }
  if (!timing?.first_visible_assistant_ms && !timing?.send_to_first_visible_assistant_ms) {
    concerns.push('missing first_visible_assistant_ms telemetry')
  }
  const verdict = failures.length ? 'fail' : concerns.length ? 'concern' : 'pass'
  return { verdict, concerns, failures }
}

async function loginIfNeeded(page) {
  const shell = page.locator('[data-orb-shell="true"]')
  if (await shell.isVisible().catch(() => false)) return
  const loginPage = page.locator('[data-orb-login-page]')
  if (!(await loginPage.isVisible().catch(() => false))) {
    await page.goto(`${BASE}/orb`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  }
  if (await shell.isVisible().catch(() => false)) return
  await page.waitForTimeout(800)
  const emailCollapsed = page.locator('[data-orb-email-collapsed]')
  if (await emailCollapsed.isVisible().catch(() => false)) {
    await emailCollapsed.click()
    await page.waitForTimeout(400)
  }
  await page.locator('[data-testid="orb-login-email"]').waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('[data-testid="orb-login-email"]').fill(EMAIL)
  await page.locator('[data-testid="orb-login-password"]').fill(PASSWORD)
  await page.locator('[data-testid="orb-login-submit"]').click()
  await shell.waitFor({ state: 'visible', timeout: 45_000 })
}

async function main() {
  mkdirSync(SHOT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()

  const timingEvents = []
  page.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('[orb-timing]')) {
      try {
        const json = text.replace(/^.*\[orb-timing\]\s+\w+\s*/, '')
        timingEvents.push(JSON.parse(json))
      } catch {
        timingEvents.push({ raw: text })
      }
    }
  })

  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('orb-cognition-debug', '1')
    } catch {}
  })

  await page.goto(`${BASE}/orb`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.locator('[data-orb-login-page], [data-orb-shell="true"]').first().waitFor({ state: 'visible', timeout: 30_000 })
  await loginIfNeeded(page)
  await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 30_000 })

  const navText = await page.locator('[data-orb-shell="true"]').innerText()
  const communicateHidden = !/\bCommunicate\b/.test(navText)

  const results = []
  for (const prompt of PROMPTS) {
    timingEvents.length = 0
    const composer = page.locator('[data-orb-composer-input]').first()
    await composer.waitFor({ state: 'visible', timeout: 20_000 })
    const started = Date.now()
    await composer.fill(prompt.message)
    await page.keyboard.press('Enter')

    const assistantText = page.locator('[data-orb-assistant-answer-text="true"]').last()
    const assistantBubble = page.locator('[data-orb-assistant-answer-card="true"]').last()
    const instantPrelude = page.locator('[data-orb-instant-prelude]').last()

    let firstVisibleMs = null
    try {
      await assistantText.waitFor({ state: 'visible', timeout: 90_000 })
      firstVisibleMs = Date.now() - started
    } catch {
      firstVisibleMs = null
    }

    await page.waitForTimeout(2500)
    const answerText = (await assistantText.innerText().catch(() => '')).trim()
    const preludeText = (await instantPrelude.innerText().catch(() => '')).trim()
    const duplicateInstant = preludeText && answerText.split(preludeText).length > 2
    const sourceChips = await page.locator('[data-orb-source-chip], [data-orb-practice-anchor], .orb-source-chip').count()
    const bannerVisible = await page.locator('[data-orb-safeguarding-urgent-banner]').isVisible().catch(() => false)

    const timing = timingEvents[timingEvents.length - 1] || {}
    const shotPath = join(SHOT_DIR, `${prompt.id}.png`)
    await page.screenshot({ path: shotPath, fullPage: false })

    const assessment = assess(prompt.id, answerText, timing, {
      firstVisibleMs,
      duplicateInstant,
      bubbleVisible: await assistantBubble.isVisible().catch(() => false),
      instantPreludeVisible: Boolean(preludeText)
    })

    results.push({
      category_id: prompt.id,
      label: prompt.label,
      message: prompt.message,
      verdict: assessment.verdict,
      concerns: assessment.concerns,
      failures: assessment.failures,
      first_visible_ms: firstVisibleMs,
      instant_line_visible_ms: timing.instant_line_visible_ms ?? timing.send_to_instant_line_ms ?? null,
      first_token_ms: timing.first_token_ms ?? timing.send_to_first_token_ms ?? null,
      send_to_first_visible_assistant_ms: timing.send_to_first_visible_assistant_ms ?? null,
      answer_chars: answerText.length,
      instant_prelude_text: preludeText.slice(0, 220),
      answer_preview: answerText.slice(0, 500),
      instant_preserved: preludeText ? answerText.includes(preludeText.split('\n')[0].slice(0, 40)) : false,
      source_chips_visible: sourceChips,
      safeguarding_banner_visible: bannerVisible,
      screenshot: shotPath.replace(`${ROOT}/`, ''),
      timing_snapshot: timing
    })
  }

  await browser.close()

  const report = {
    environment: 'thomaskelly05/childrens-homes-assistant-backend',
    commit: 'a6e33cc5',
    pr: '#1729',
    frontend: BASE,
    communicate_hidden_from_nav: communicateHidden,
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
    ai_provider_strict: process.env.AI_PROVIDER_STRICT === 'true',
    orb_live_sign_off: process.env.ORB_LIVE_SIGN_OFF === '1',
    prompts: results
  }

  const out = join(REPORT_DIR, 'orb_live_ui_browser_capture_pr1729.json')
  writeFileSync(out, JSON.stringify(report, null, 2))
  console.log(`Wrote ${out}`)
  console.log('| Category | Verdict | first_visible_ms | answer_chars |')
  console.log('|----------|---------|------------------|--------------|')
  for (const row of results) {
    console.log(`| ${row.label} | ${row.verdict} | ${row.first_visible_ms} | ${row.answer_chars} |`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
