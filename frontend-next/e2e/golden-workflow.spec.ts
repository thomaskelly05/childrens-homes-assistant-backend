import { expect, test } from '@playwright/test'

const e2eEmail = process.env.NEXT_PUBLIC_E2E_USER_EMAIL || 'e2e.manager@indicare.local'
const e2ePassword = process.env.NEXT_PUBLIC_E2E_USER_PASSWORD || 'ChangeMeForE2E123!'

test('child workspace shell stays live-empty, scoped, and clears sensitive state on logout', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1100 })
  const failedResponses: string[] = []
  const consoleErrors: string[] = []

  page.on('response', (response) => {
    const status = response.status()
    if (status === 401 || status === 403 || status >= 500) {
      failedResponses.push(`${status} ${response.url()}`)
    }
  })
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/login')
  await expect(page.getByTestId('login-form')).toBeVisible()
  await page.getByLabel('Email').fill(e2eEmail)
  await page.getByLabel('Password').fill(e2ePassword)
  await page.getByTestId('login-submit').click()

  await expect(page).toHaveURL(/\/command-centre$/)
  await expect(page.getByRole('heading', { name: 'One operational leadership workspace' })).toBeVisible()
  await expect(page.getByTestId('operational-navigation')).toContainText('Command Centre')
  await expect(page.getByTestId('operational-navigation')).toContainText('Children')
  await expect(page.getByTestId('operational-navigation')).toContainText('Workforce')
  await expect(page.getByTestId('contextual-orb-panel')).toContainText('Embedded operational intelligence')
  await expect(page.getByTestId('operational-alerts')).toContainText('Operational alerts')
  await expect(page.getByTestId('operational-quick-actions')).toContainText('Quick actions')

  await page.goto('/chronology')
  await expect(page.getByRole('heading', { name: 'Connected care chronology' })).toBeVisible()
  await expect(page.getByTestId('unified-chronology-timeline')).toBeVisible()
  await page.goto('/command-centre')

  await page.evaluate(() => {
    localStorage.setItem('indicare-recording-draft:5:daily-note', 'draft')
    localStorage.setItem('orb:session', 'orb-memory')
    localStorage.setItem('child-context:5', 'child-context')
    localStorage.setItem('report-draft:5', 'report')
    sessionStorage.setItem('assistant:session', 'assistant')
    sessionStorage.setItem('record-context:5', 'record')
  })

  await page.getByText('Profile', { exact: true }).click()
  await page.getByTestId('logout-button').click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByTestId('login-form')).toBeVisible()
  await expect(page.evaluate(() => ({
    dailyDraft: localStorage.getItem('indicare-recording-draft:5:daily-note'),
    orbMemory: localStorage.getItem('orb:session'),
    childContext: localStorage.getItem('child-context:5'),
    reportDraft: localStorage.getItem('report-draft:5'),
    assistantSession: sessionStorage.getItem('assistant:session'),
    recordContext: sessionStorage.getItem('record-context:5')
  }))).resolves.toEqual({
    dailyDraft: null,
    orbMemory: null,
    childContext: null,
    reportDraft: null,
    assistantSession: null,
    recordContext: null
  })

  expect(failedResponses).toEqual([])
  expect(consoleErrors).toEqual([])
})
