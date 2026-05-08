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

Given('the saved {string} Auth0 session state exists', async ({ page }, personaKey: string) => {
  void page
  expect(existsSync(storageStatePathForPersona(parsePersonaKey(personaKey)))).toBe(true)
})

When('I open my events with the saved {string} session', async ({ page }, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto('/account')
})

Then('I should see the my events heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'My events' })).toBeVisible()
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
    expect(await response.text()).toContain('My events')
  } finally {
    await apiClient.dispose()
  }
})
