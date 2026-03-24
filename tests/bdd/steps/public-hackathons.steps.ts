import { existsSync, readFileSync } from 'node:fs'

import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { stablePersonaKeys, storageStatePathForPersona, type StablePersonaKey } from '../support/personas.ts'

const { Given, When, Then } = createBdd()

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

Given('I am on the public hackathons page', async ({ page }) => {
  await page.goto('/')
})

Then('I should see the public hackathon titled {string}', async ({ page }, title: string) => {
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
})

Then('the public hackathon card for {string} should show lifecycle state {string}', async ({ page }, title: string, stateLabel: string) => {
  const card = page
    .locator('[data-testid^="public-hackathon-card-"]')
    .filter({ has: page.getByRole('heading', { name: title }) })
    .first()

  await expect(card).toBeVisible()
  await expect(card.getByText(stateLabel)).toBeVisible()
})

Then('the public hackathon card for {string} should link to {string}', async ({ page }, title: string, href: string) => {
  const card = page
    .locator('[data-testid^="public-hackathon-card-"]')
    .filter({ has: page.getByRole('heading', { name: title }) })
    .first()

  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('href', href)
})

Then('I should see {int} public hackathon cards', async ({ page }, count: number) => {
  await expect(page.locator('[data-testid^="public-hackathon-card-"]')).toHaveCount(count)
})

When('I open the public hackathons page with the saved {string} session', async ({ page }, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto('/')
})

When('I load more public hackathons', async ({ page }) => {
  const loadMoreButton = page.getByRole('button', { name: 'Load more hackathons' })

  await expect(loadMoreButton).toBeVisible()
  await page.waitForFunction(() =>
    typeof window.useNuxtApp === 'function' && window.useNuxtApp().isHydrating === false
  )
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/api/public/hackathons')
      && response.url().includes('page=2')
      && response.ok()
    ),
    loadMoreButton.click()
  ])
})

Given('I am on the public hackathon detail page for the fixture hackathon', async ({ page }) => {
  await page.goto('/hackathons/e2e-fixture-hackathon')
})

Then('I should see the public hackathon detail title {string}', async ({ page }, title: string) => {
  await expect(page.getByTestId('public-hackathon-detail-title')).toHaveText(title)
})

Then('I should see the public evaluation criterion {string}', async ({ page }, criterionName: string) => {
  await expect(page.getByTestId('public-hackathon-criteria').getByRole('heading', { name: criterionName })).toBeVisible()
})

Then('I should see the public prize {string}', async ({ page }, prizeName: string) => {
  await expect(page.getByTestId('public-hackathon-prizes').getByRole('heading', { name: prizeName })).toBeVisible()
})

Then('I should see the current terms reference {string}', async ({ page }, termsTitle: string) => {
  await expect(page.getByTestId('public-hackathon-terms').getByRole('heading', { name: termsTitle })).toBeVisible()
})

Then('I should not see the admin control {string}', async ({ page }, label: string) => {
  await expect(page.getByRole('button', { name: label })).toHaveCount(0)
})

Then('I should not see the public hackathon titled {string}', async ({ page }, title: string) => {
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0)
})

Then('I should see the text {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible()
})
