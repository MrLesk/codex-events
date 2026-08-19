import { existsSync, readFileSync } from 'node:fs'

import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { createAuthenticatedApiClient } from '../support/api-client'
import {
  getStablePersonas,
  stablePersonaKeys,
  storageStatePathForPersona,
  type StablePersonaKey
} from '../support/personas'

const { Given, When, Then } = createBdd()

type AccountEventBootstrapState = {
  count: number
}

const accountEventBootstrapCounts = new WeakMap<Page, AccountEventBootstrapState>()

type AccountOverviewRequestState = {
  bootstrapCount: number
  pageReadCount: number
}

const accountOverviewRequestCounts = new WeakMap<Page, AccountOverviewRequestState>()

function parsePersonaKey(personaKey: string): StablePersonaKey {
  if (stablePersonaKeys.includes(personaKey as StablePersonaKey)) {
    return personaKey as StablePersonaKey
  }

  throw new Error(`Unknown stable persona key: ${personaKey}`)
}

function getStablePersona(personaKey: StablePersonaKey) {
  const persona = getStablePersonas().find(candidate => candidate.key === personaKey)

  if (!persona) {
    throw new Error(`Missing stable persona configuration for key: ${personaKey}`)
  }

  return persona
}

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

async function applyStoredStateToPage(personaKey: StablePersonaKey, page: Page) {
  const storageState = JSON.parse(readFileSync(storageStatePathForPersona(personaKey), 'utf8')) as StoredState

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

Given('the saved {string} local session state exists', async ({ page }, personaKey: string) => {
  void page
  expect(existsSync(storageStatePathForPersona(parsePersonaKey(personaKey)))).toBe(true)
})

When('I open my events with the saved {string} session', async ({ page }, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)

  const state = {
    bootstrapCount: 0,
    pageReadCount: 0
  }
  accountOverviewRequestCounts.set(page, state)
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname

    if (pathname === '/api/session') {
      state.bootstrapCount += 1
    }

    if (pathname === '/api/account/overview') {
      state.pageReadCount += 1
    }
  })

  await page.goto('/account')
})

When('I open the account event overview for {string} with the saved {string} session', async ({ page }, slug: string, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  const state = { count: 0 }

  accountEventBootstrapCounts.set(page, state)
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/session') {
      state.count += 1
    }
  })

  await page.goto(`/account/events/${slug}?tab=overview`)
  await expect(page.getByRole('tab', { name: 'Participants', exact: true })).toBeVisible()
})

When('I switch the account event tab to {string}', async ({ page }, tabLabel: string) => {
  await page.getByRole('tab', { name: tabLabel, exact: true }).click()
  await expect(page.getByRole('tab', { name: tabLabel, exact: true })).toHaveAttribute('aria-selected', 'true')
})

Then('I should see the my events heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'My events' })).toBeVisible()
})

Then('the account overview should request one bootstrap and one page read', async ({ page }) => {
  const state = accountOverviewRequestCounts.get(page)

  if (!state) {
    throw new Error('The account overview request counter was not initialized.')
  }

  await expect.poll(() => state.bootstrapCount).toBe(1)
  await expect.poll(() => state.pageReadCount).toBe(1)
})

Then('the account event bootstrap should be requested once', async ({ page }) => {
  const state = accountEventBootstrapCounts.get(page)

  if (!state) {
    throw new Error('The account event bootstrap request counter was not initialized.')
  }

  await expect.poll(() => state.count).toBe(1)
})

Then('the account event bootstrap should still be requested once', async ({ page }) => {
  const state = accountEventBootstrapCounts.get(page)

  if (!state) {
    throw new Error('The account event bootstrap request counter was not initialized.')
  }

  await expect.poll(() => state.count).toBe(1)
})

Then('I should see the signed-in {string} email', async ({ page }, personaKey: string) => {
  const persona = getStablePersona(parsePersonaKey(personaKey))
  await expect(page.getByText(persona.email).first()).toBeVisible()
})

Then('the saved {string} session should authenticate a request context to {string}', async ({ request }, personaKey: string, path: string) => {
  void request

  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.get(path)

    expect(response.ok()).toBe(true)
    expect(new URL(response.url()).pathname).toBe(path)
    expect(await response.text()).toContain('data-ssr="false"')
  } finally {
    await apiClient.dispose()
  }
})
