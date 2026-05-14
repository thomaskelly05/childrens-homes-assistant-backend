import { expect, test } from '@playwright/test'

const e2eEmail = process.env.NEXT_PUBLIC_E2E_USER_EMAIL || 'manager.demo@indicare.local'
const e2ePassword = process.env.NEXT_PUBLIC_E2E_USER_PASSWORD || 'IndiCareDemo123!'

test('Jamie golden workflow is smooth, explicit, and clears sensitive state on logout', async ({ page }) => {
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
  await expect(page.getByTestId('child-selector')).toBeVisible()
  await page.getByTestId('child-card-yp-jamie').click()

  await expect(page).toHaveURL(/\/young-people\/yp-jamie\/journey/)
  await expect(page.getByRole('heading', { name: 'Jamie', exact: true })).toBeVisible()
  await expect(page.getByTestId('orb-button')).toBeVisible()
  await expect(page.getByTestId('manager-review-link')).toBeVisible()
  await expect(page.getByTestId('handover-link')).toBeVisible()
  await expect(page.getByTestId('reports-link')).toBeVisible()
  await expect(page.getByTestId('chronology-link')).toBeVisible()

  await page.getByTestId('add-daily-note-button').click()
  await expect(page).toHaveURL(/\/young-people\/yp-jamie\/daily-note\/new/)
  await expect(page.getByTestId('daily-note-form')).toBeVisible()
  await page.getByLabel('Daily note *').fill('Jamie disclosed feeling unsafe after family contact. Staff reassured Jamie, informed the manager, will update the social worker, and need a follow-up action and safeguarding review.')
  await page.getByLabel('What did the child say or show?').fill('Jamie said he wanted adults to know the call made him anxious.')
  await expect(page.getByRole('button', { name: 'Add safeguarding follow-up' })).toBeVisible()
  await page.getByRole('button', { name: 'Add safeguarding follow-up' }).click()
  await expect(page.getByTestId('save-state-message')).toContainText('use the linked workflow')
  await page.getByTestId('save-daily-note-button').click()

  await expect(page).toHaveURL(/\/young-people\/yp-jamie\/journey\?/)
  await expect(page.getByTestId('save-state-message')).toContainText('Draft saved locally')
  await expect(page.getByTestId('save-state-message')).toContainText("not yet been added to the child's record")
  await page.getByTestId('saved-chronology-link').click()
  await expect(page).toHaveURL(/\/young-people\/yp-jamie\/chronology/)
  await expect(page.getByRole('heading', { name: /Jamie.*connected chronology/ })).toBeVisible()

  await page.goto('/young-people/yp-jamie/journey')
  await page.getByTestId('workflow-link-safeguarding').click()
  await expect(page).toHaveURL(/\/young-people\/yp-jamie\/safeguarding\/new/)
  await expect(page.getByTestId('safeguarding-form')).toBeVisible()
  await page.getByLabel('Concern summary *').fill('Jamie reported pressure during family contact and asked staff for help.')
  await page.getByLabel('Immediate safety actions').fill('Staff reassured Jamie, informed the manager and recorded the concern for review.')
  await page.getByTestId('recording-field-actions_required').fill('Manager to review threshold and update the social worker today.')
  await page.getByTestId('save-daily-note-button').click()
  await expect(page).toHaveURL(/\/young-people\/yp-jamie\/journey\?/)
  await expect(page.getByTestId('save-state-message')).toContainText('Draft saved locally')

  await page.goto('/young-people/yp-jamie/journey')
  await expect(page.getByTestId('manager-review-link')).toBeVisible()
  await expect(page.getByTestId('report-evidence-link')).toBeVisible()
  await expect(page.getByTestId('safeguarding-chronology-link')).toBeVisible()
  await expect(page.getByTestId('safeguarding-follow-up-action').first()).toBeVisible()

  await page.evaluate(() => {
    localStorage.setItem('indicare-recording-draft:yp-jamie:daily-note', 'draft')
    localStorage.setItem('orb:session', 'orb-memory')
    localStorage.setItem('child-context:yp-jamie', 'child-context')
    localStorage.setItem('report-draft:yp-jamie', 'report')
    sessionStorage.setItem('assistant:session', 'assistant')
    sessionStorage.setItem('record-context:yp-jamie', 'record')
  })

  await page.getByTestId('logout-button').click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByTestId('login-form')).toBeVisible()
  await expect(page.evaluate(() => ({
    dailyDraft: localStorage.getItem('indicare-recording-draft:yp-jamie:daily-note'),
    orbMemory: localStorage.getItem('orb:session'),
    childContext: localStorage.getItem('child-context:yp-jamie'),
    reportDraft: localStorage.getItem('report-draft:yp-jamie'),
    assistantSession: sessionStorage.getItem('assistant:session'),
    recordContext: sessionStorage.getItem('record-context:yp-jamie')
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
