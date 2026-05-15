import { expect, test } from '@playwright/test'

const e2eEmail = process.env.NEXT_PUBLIC_E2E_USER_EMAIL || 'manager.demo@indicare.local'
const e2ePassword = process.env.NEXT_PUBLIC_E2E_USER_PASSWORD || 'IndiCareDemo123!'

test('child workspace shell stays live-empty, scoped, and clears sensitive state on logout', async ({ page }) => {
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

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { name: 'No young people are available' })).toBeVisible()
  await expect(page.getByText('Check your home access or ask a manager')).toBeVisible()
  await expect(page.getByText('No records found yet.')).toHaveCount(2)
  await expect(page.getByText('Last recorded note')).toHaveCount(0)

  await page.goto('/chronology')
  await expect(page.getByText('Select a child before opening detailed records')).toBeVisible()
  await page.goto('/home')

  await page.evaluate(() => {
    localStorage.setItem('indicare-recording-draft:5:daily-note', 'draft')
    localStorage.setItem('orb:session', 'orb-memory')
    localStorage.setItem('child-context:5', 'child-context')
    localStorage.setItem('report-draft:5', 'report')
    sessionStorage.setItem('assistant:session', 'assistant')
    sessionStorage.setItem('record-context:5', 'record')
  })

  await page.getByText('Profile').click()
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
