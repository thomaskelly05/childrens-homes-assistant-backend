/**
 * ORB PR #1724 live UI stream verification — mocked auth + stream route.
 * Uses mocked SSE (not staging session). For staging live-LLM sign-off, run
 * `ORB_LIVE_SIGN_OFF=1 python scripts/run_orb_live_ui_verification_pr1724.py`.
 */
import { test, expect } from '@playwright/test'
import { setupOrbE2eMocks } from './orb-audit-helpers'

const PROMPTS = [
  {
    id: 'daily_recording',
    message: 'Help me write a daily record — calm breakfast, chose toast, watched TV before handover.'
  },
  {
    id: 'medication_refusal',
    message: 'A young person refused medication. What should we consider?'
  },
  {
    id: 'communicate_pack',
    message: 'Create a communication support pack for a hospital visit tomorrow.'
  }
] as const

test.describe('ORB PR #1724 chat stream UI', () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    await setupOrbE2eMocks(page)
    const streamHandler = async (route: import('@playwright/test').Route) => {
      const post = route.request().postDataJSON() as { message?: string } | null
      const message = String(post?.message || '')
      let instant = 'I am treating this as a shift question.'
      let answer = 'Practical recording guidance for shift.'
      if (message.includes('daily record')) {
        instant = "I'm treating this as a daily recording question.\nStart with what happened, what the young person said or showed, how staff responded, and what happened next."
        answer = `${instant}\n\nCalm breakfast record: note toast choice, TV before handover, presentation and staff support. Keep factual, child-centred and proportionate.`
      } else if (message.includes('refused medication')) {
        instant = "I'm treating this as a medication refusal.\nRecord the refusal on the MAR, follow the home's medication policy, and seek health advice where risk is present."
        answer = `${instant}\n\nRecord refusal on MAR, monitor presentation, notify manager if policy requires, seek clinical advice if risk present. Do not treat as medication error.`
      } else if (message.includes('communication support pack')) {
        instant = 'I will build a communication support pack for this change.'
        answer = `## Easy-read explanation\nWhat is happening: hospital visit tomorrow.\n\n## Visual cards\nHospital | Waiting | Staff who help\n\n## Staff guidance\nUse observed language; support AAC if used.`
      }
      const body = [
        'event: token',
        `data: ${JSON.stringify({ delta: `${instant}\n\n` })}`,
        '',
        'event: token',
        `data: ${JSON.stringify({ delta: answer.slice(instant.length + 2) })}`,
        '',
        'event: metadata',
        `data: ${JSON.stringify({
          ok: true,
          answer,
          sources: [{ label: 'Recording quality', kind: 'practice_anchor' }],
          context_used: {
            timing: {
              instant_first_lines_ms: 0.12,
              instant_category: 'daily_recording',
              first_token_ms: 45,
              total_ms: 1200
            }
          }
        })}`,
        '',
        'event: done',
        'data: {"ok":true}',
        ''
      ].join('\n')
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body
      })
    }
    await page.route('**/orb/standalone/conversation/stream**', streamHandler)
    await page.route('**/backend/orb/standalone/conversation/stream**', streamHandler)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/orb', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await expect(page.locator('[data-orb-shell="true"]')).toBeVisible({ timeout: 20_000 })
  })

  test('communicate hidden from visible sidebar nav', async ({ page }) => {
    const navText = await page.locator('[data-orb-shell="true"]').innerText()
    expect(navText).not.toMatch(/\bCommunicate\b/)
    await page.goto('/orb?station=communicate', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-orb-shell="true"]')).toBeVisible({ timeout: 15_000 })
    const station = await page
      .locator('[data-orb-workspace-panel]')
      .first()
      .getAttribute('data-orb-workspace-panel')
      .catch(() => null)
    expect(station === 'communicate' || page.url().includes('station=communicate')).toBeTruthy()
  })

  for (const prompt of PROMPTS) {
    test(`streams response for ${prompt.id}`, async ({ page }) => {
      const composer = page.locator('[data-orb-composer-input]').first()
      await composer.waitFor({ state: 'visible', timeout: 15_000 })
      const started = Date.now()
      await composer.fill(prompt.message)
      await page.keyboard.press('Enter')

      const assistantBubble = page.locator('[data-orb-assistant-answer-card="true"]').last()
      const assistantText = page.locator('[data-orb-assistant-answer-text="true"]').last()
      await assistantText.waitFor({ state: 'visible', timeout: 45_000 })
      const firstVisibleMs = Date.now() - started

      await page.waitForTimeout(1500)
      const answerText = (await assistantText.innerText()).trim()
      expect(answerText.length).toBeGreaterThan(40)
      expect(answerText).not.toMatch(/mock engine response|configure openai_api_key/i)

      const sources = page.locator('[data-orb-source-chip], [data-orb-practice-anchor], .orb-source-chip')
      const sourceCount = await sources.count()

      await page.screenshot({
        path: `e2e/artifacts/orb-pr1724-${prompt.id}.png`,
        fullPage: false
      })

      await expect(assistantBubble).toBeVisible()

      console.log(
        JSON.stringify({
          id: prompt.id,
          first_visible_ms: firstVisibleMs,
          answer_chars: answerText.length,
          answer_preview: answerText.slice(0, 220),
          source_chips: sourceCount
        })
      )
    })
  }
})
