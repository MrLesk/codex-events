import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import {
  applyStoredStateToPage,
  parsePersonaKey,
  resolveEventSlug
} from './admin-operations.steps'

const { When, Then } = createBdd()

When('I open the certificates tab for event {string} with the saved {string} session', async ({ page }, eventId: string, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  const eventSlug = resolveEventSlug(eventId)

  await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url())

      return url.pathname === `/api/events/${eventId}/applications`
        && url.searchParams.get('status') === 'approved'
        && response.ok()
    }),
    page.goto(`/account/events/${eventSlug}?tab=certificates`)
  ])
})

Then('I should see the certificates row for participant {string} with attendance {string}', async ({ page }, userId: string, attendance: string) => {
  const row = page.getByTestId(`certificates-row-${userId}`)

  await expect(row).toBeVisible()
  await expect(row.getByText(attendance, { exact: true })).toBeVisible()
})

When('I mark the certificates participant {string} as {string}', async ({ page }, userId: string, decision: string) => {
  const testId = decision === 'joined'
    ? `certificates-mark-joined-${userId}`
    : `certificates-mark-not-joined-${userId}`
  const button = page.getByTestId(testId)

  await expect(button).toBeEnabled()

  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/actions/override-check-in') && response.ok()),
    button.click()
  ])
})

Then('the certificates row for participant {string} should link to their certificate', async ({ page }, userId: string) => {
  const link = page.getByTestId(`certificates-view-${userId}`)

  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', new RegExp(`/events/[^/]+/${userId}$`))
})
