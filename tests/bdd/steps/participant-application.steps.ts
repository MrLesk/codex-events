import { existsSync, readFileSync } from 'node:fs'

import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { stablePersonaKeys, storageStatePathForPersona, type StablePersonaKey } from '../support/personas.ts'

const { When, Then } = createBdd()

type StoredState = {
  cookies?: Array<{
    name: string
    value: string
    domain: string
    path: string
    expires: number
    httpOnly: boolean
    secure: boolean
    sameSite: 'Strict' | 'Lax' | 'None'
  }>
  origins?: Array<{
    origin: string
    localStorage: Array<{
      name: string
      value: string
    }>
  }>
}

function parsePersonaKey(personaKey: string): StablePersonaKey {
  if (stablePersonaKeys.includes(personaKey as StablePersonaKey)) {
    return personaKey as StablePersonaKey
  }

  throw new Error(`Unknown stable persona key: ${personaKey}`)
}

async function applyStoredStateToPage(personaKey: StablePersonaKey, page: Page) {
  const storageStatePath = storageStatePathForPersona(personaKey)

  if (!existsSync(storageStatePath)) {
    throw new Error(`Missing storage state for persona "${personaKey}" at ${storageStatePath}.`)
  }

  const storageState = JSON.parse(readFileSync(storageStatePath, 'utf8')) as StoredState

  if (storageState.cookies?.length) {
    await page.context().addCookies(storageState.cookies)
  }

  const origins = storageState.origins ?? []

  if (origins.length) {
    await page.addInitScript((entries: StoredState['origins']) => {
      if (!entries) {
        return
      }

      for (const entry of entries) {
        if (entry.origin !== window.location.origin) {
          continue
        }

        for (const item of entry.localStorage) {
          window.localStorage.setItem(item.name, item.value)
        }
      }
    }, origins)
  }
}

When('I open the participant application page for hackathon slug {string} with the saved {string} session', async ({ page }, slug: string, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto(`/hackathons/${slug}`)
  await expect(page.getByTestId('participant-application-panel')).toBeVisible()
})

Then('I should see the participant application text {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('participant-application-panel').getByText(text)).toBeVisible()
})

When('I accept the current participant application terms', async ({ page }) => {
  await page.getByRole('checkbox', {
    name: /I accept the current application terms exactly as shown above/i
  }).check()
})

When('I submit the participant application', async ({ page }) => {
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/api/hackathons/')
      && response.url().includes('/applications')
      && response.request().method() === 'POST'
      && response.ok()
    ),
    page.getByTestId('participant-application-submit').click()
  ])
})

Then('I should see the participant application status {string}', async ({ page }, status: string) => {
  await expect(page.getByTestId('participant-application-status')).toHaveText(status)
})

Then('I should see the participant application missing profile field {string}', async ({ page }, fieldLabel: string) => {
  await expect(page.getByTestId('participant-application-missing-profiles').getByText(fieldLabel)).toBeVisible()
})
