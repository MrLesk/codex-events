import { existsSync, readFileSync } from 'node:fs'

import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { createAuthenticatedApiClient } from '../support/api-client'
import { platformFixtureIds } from '../support/platform-fixtures'
import {
  stablePersonaKeys,
  storageStatePathForPersona,
  type StablePersonaKey
} from '../support/personas'

const { When, Then } = createBdd()
const fixtureSlug = 'simplified-claiming-fixture-event'
const couponUrl = 'https://chatgpt.com/coupon/bdd-simplified'

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
    localStorage: Array<{ name: string, value: string }>
  }>
}

function parsePersonaKey(value: string): StablePersonaKey {
  if (stablePersonaKeys.includes(value as StablePersonaKey)) {
    return value as StablePersonaKey
  }
  throw new Error(`Unknown stable persona key: ${value}`)
}

async function applyStoredStateToPage(personaKey: StablePersonaKey, page: Page) {
  const path = storageStatePathForPersona(personaKey)
  if (!existsSync(path)) {
    throw new Error(`Missing storage state for persona ${personaKey}.`)
  }
  const state = JSON.parse(readFileSync(path, 'utf8')) as StoredState
  if (state.cookies?.length) {
    await page.context().addCookies(state.cookies)
  }
  if (state.origins?.length) {
    await page.addInitScript((origins: StoredState['origins']) => {
      for (const origin of origins ?? []) {
        if (origin.origin !== window.location.origin) {
          continue
        }
        for (const item of origin.localStorage) {
          window.localStorage.setItem(item.name, item.value)
        }
      }
    }, state.origins)
  }
}

async function openClaimingLink(page: Page) {
  await page.route('https://chatgpt.com/coupon/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Coupon redeemed</h1>' })
  })
  await page.goto(`/events/${fixtureSlug}/redeem`)
}

When('I open the simplified claiming link with the saved {string} session', async ({ page }, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await openClaimingLink(page)
})

When('I open the simplified claiming link again', async ({ page }) => {
  await page.goto(`/events/${fixtureSlug}/redeem`)
})

When('I open the simplified claiming settings with the saved {string} session', async ({ page }, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto(`/account/events/${fixtureSlug}?tab=settings`)
})

Then('I should be redirected to the simplified claiming coupon', async ({ page }) => {
  await expect(page).toHaveURL(couponUrl)
})

Then('I should see the attendee claiming QR settings', async ({ page }) => {
  const redemptionUrl = `${new URL(page.url()).origin}/events/${fixtureSlug}/redeem`
  await expect(page.getByRole('heading', { name: 'Attendee claiming' })).toBeVisible()
  await expect(page.getByText(redemptionUrl, { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Redemption QR code' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download QR as SVG' })).toBeVisible()
})

Then('the {string} should see the simplified claiming participant checked in', async ({ page }, personaKey: string) => {
  void page
  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))
  try {
    const response = await apiClient.get(
      `/api/events/${platformFixtureIds.simplifiedClaimingEventId}/applications?status=approved&page=1&page_size=100`
    )
    expect(response.ok()).toBe(true)
    const payload = await response.json() as {
      data?: Array<{
        userId?: string
        checkedInAt?: string | null
        checkInSource?: string | null
      }>
    }
    const participant = payload.data?.find(application => application.userId === 'user_regular_user')
    expect(participant).toMatchObject({ checkInSource: 'simplified_claim' })
    expect(participant?.checkedInAt).toBeTruthy()
  } finally {
    await apiClient.dispose()
  }
})
