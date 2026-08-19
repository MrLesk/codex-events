import { existsSync, readFileSync } from 'node:fs'

import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { stablePersonaKeys, storageStatePathForPersona, type StablePersonaKey } from '../support/personas.ts'

const { When, Then } = createBdd()

type PrizeWorkspaceRequestState = {
  bootstrapCount: number
  pageReadCount: number
  legacyTermsReadCount: number
}

const prizeWorkspaceRequestCounts = new WeakMap<Page, PrizeWorkspaceRequestState>()

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

When('I open the prize redemptions page with the saved {string} session', async ({ page }, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)

  const state = {
    bootstrapCount: 0,
    pageReadCount: 0,
    legacyTermsReadCount: 0
  }
  prizeWorkspaceRequestCounts.set(page, state)
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname

    if (pathname === '/api/session') {
      state.bootstrapCount += 1
    }

    if (pathname === '/api/prize-redemptions/workspace') {
      state.pageReadCount += 1
    }

    if (/^\/api\/events\/[^/]+\/terms\/current$/u.test(pathname)) {
      state.legacyTermsReadCount += 1
    }
  })

  await page.goto('/prize-redemptions')
})

Then('I should see the prize redemption task for event slug {string} and prize {string}', async ({ page }, eventSlug: string, prizeId: string) => {
  await expect(page.getByTestId(`prize-redemption-card-${eventSlug}-${prizeId}`)).toBeVisible()
})

Then('the prize redemption workspace should request one bootstrap and one page read without terms fan-out', async ({ page }) => {
  const state = prizeWorkspaceRequestCounts.get(page)

  if (!state) {
    throw new Error('The prize redemption request counter was not initialized.')
  }

  await expect.poll(() => state.bootstrapCount).toBe(1)
  await expect.poll(() => state.pageReadCount).toBe(1)
  expect(state.legacyTermsReadCount).toBe(0)
})

When('I submit the prize redemption task for event slug {string} and prize {string} as {string}', async ({ page }, eventSlug: string, prizeId: string, legalName: string) => {
  const scope = page.getByTestId(`prize-redemption-card-${eventSlug}-${prizeId}`)
  const responsePath = '/actions/redeem'

  await expect(scope).toBeVisible()
  await scope.getByPlaceholder('Enter the legal recipient name').fill(legalName)
  await scope.getByRole('checkbox').check()

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(responsePath)
      && response.ok()
    ),
    scope.getByTestId(`prize-redemption-submit-${eventSlug}-${prizeId}`).click()
  ])
})

Then('I should see the completed prize redemption for event slug {string} and prize {string}', async ({ page }, eventSlug: string, prizeId: string) => {
  await expect(page.getByTestId(`prize-redemption-complete-${eventSlug}-${prizeId}`)).toBeVisible()
})
