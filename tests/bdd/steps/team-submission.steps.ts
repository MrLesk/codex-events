import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { When, Then } = createBdd()

When('I fill the participant submission form with project name {string}, summary {string}, repository URL {string}, and demo URL {string}', async ({ page }, projectName: string, summary: string, repositoryUrl: string, demoUrl: string) => {
  await page.getByLabel('Project name').fill(projectName)
  await page.getByLabel('Summary').fill(summary)
  await page.getByLabel('Repository URL').fill(repositoryUrl)
  await page.getByLabel('Demo URL').fill(demoUrl)
})

When('I create the participant submission draft', async ({ page }) => {
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/submission')
      && response.request().method() === 'POST'
      && response.ok()
    ),
    page.getByTestId('participant-submission-create').click()
  ])
})

When('I save the participant submission draft', async ({ page }) => {
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/submission')
      && response.request().method() === 'PATCH'
      && response.ok()
    ),
    page.getByTestId('participant-submission-save').click()
  ])
})

When('I submit the participant submission', async ({ page }) => {
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/submission/actions/submit')
      && response.request().method() === 'POST'
      && response.ok()
    ),
    page.getByTestId('participant-submission-submit').click()
  ])
})

When('I withdraw the participant submission', async ({ page }) => {
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/submission/actions/withdraw')
      && response.request().method() === 'POST'
      && response.ok()
    ),
    page.getByTestId('participant-submission-withdraw').click()
  ])
})

Then('I should see the participant submission status {string}', async ({ page }, status: string) => {
  await expect(page.getByTestId('participant-submission-status')).toHaveText(status)
})

Then('I should see the participant submission text {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('account-event-submission-panel').getByText(text, {
    exact: false
  }).first()).toBeVisible()
})

Then('the participant submission field {string} should have value {string}', async ({ page }, label: string, value: string) => {
  await expect(page.getByTestId('participant-submission-panel').getByLabel(label)).toHaveValue(value)
})

Then('the participant submission field {string} should be disabled', async ({ page }, label: string) => {
  await expect(page.getByTestId('participant-submission-panel').getByLabel(label)).toBeDisabled()
})

Then('the participant submission action {string} should be disabled', async ({ page }, actionName: string) => {
  await expect(page.getByRole('button', {
    name: actionName
  })).toBeDisabled()
})
