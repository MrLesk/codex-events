import { existsSync, readFileSync } from 'node:fs'

import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import {
  stablePersonaKeys,
  storageStatePathForPersona,
  type StablePersonaKey
} from '../support/personas'

const { When, Then } = createBdd()

function parsePersonaKey(personaKey: string): StablePersonaKey {
  if (stablePersonaKeys.includes(personaKey as StablePersonaKey)) {
    return personaKey as StablePersonaKey
  }

  throw new Error(`Unknown stable persona key: ${personaKey}`)
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

When('I open the account onboarding page with the saved {string} session', async ({ page }, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto('/auth/access?returnTo=%2Faccount')
  await expect(page.getByRole('heading', { name: 'Accept the current platform documents' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
})

When('I open the account settings page with the saved {string} session', async ({ page }, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
})

When('I delete the platform account through the account settings page', async ({ page }) => {
  await page.getByLabel('Type “delete my account” to confirm').fill('delete my account')
  await page.getByRole('button', { name: 'Delete account' }).click()
  await page.waitForURL('**/auth/access?**deleted=1**')
})

Then('I should see the deleted platform account message', async ({ page }) => {
  await expect(page.getByText('The platform account was deleted.')).toBeVisible()
})

When('I submit the platform account registration form for {string}', async ({ page }) => {
  await page.getByRole('checkbox', { name: /^Accept Privacy Policy/ }).check()
  await page.getByRole('checkbox', { name: /^Accept Platform Terms/ }).check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()
  await page.waitForURL('**/onboarding/account?**')
})

Then('I should see the profile onboarding heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Complete your profile' })).toBeVisible()
})

Then('I should see the account settings heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible()
})

When('I update the account profile links', async ({ page }) => {
  await page.getByLabel('GitHub profile URL').fill('https://github.com/regular-user-updated')
  await page.getByLabel('LinkedIn profile URL').fill('https://linkedin.com/in/regular-user-updated')
  await page.getByLabel('ChatGPT email').fill('regular-user-updated@chatgpt.example')
  await page.getByLabel('OpenAI org ID').fill('org_regular_user_updated')
  await page.getByLabel('Luma username').fill('regular-user-updated')
  await page.getByLabel('X profile URL').fill('https://x.com/regular-user-updated')
  await page.getByRole('button', { name: /Save profile|Finish onboarding/ }).click()
})

Then('the account profile should show the updated links', async ({ page }) => {
  await expect(page.getByLabel('GitHub profile URL')).toHaveValue('https://github.com/regular-user-updated')
  await expect(page.getByLabel('LinkedIn profile URL')).toHaveValue('https://linkedin.com/in/regular-user-updated')
  await expect(page.getByLabel('ChatGPT email')).toHaveValue('regular-user-updated@chatgpt.example')
  await expect(page.getByLabel('OpenAI org ID')).toHaveValue('org_regular_user_updated')
  await expect(page.getByLabel('Luma username')).toHaveValue('regular-user-updated')
  await expect(page.getByLabel('X profile URL')).toHaveValue('https://x.com/regular-user-updated')
})
