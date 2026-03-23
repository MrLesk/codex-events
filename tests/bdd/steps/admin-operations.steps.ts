import { existsSync, readFileSync } from 'node:fs'

import { expect, type Locator, type Page } from '@playwright/test'
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getStatusBadge(scope: Locator, status: string) {
  return scope.locator('[data-slot="base"]').filter({
    hasText: new RegExp(`^${escapeRegExp(status)}$`)
  })
}

function getCurrentHackathonId(page: Page) {
  const segments = new URL(page.url()).pathname.split('/').filter(Boolean)
  return segments[segments.indexOf('hackathons') + 1] ?? ''
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

When('I open the admin operations page for hackathon {string} with the saved {string} session', async ({ page }, hackathonId: string, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto(`/admin/hackathons/${hackathonId}/operations`)
})

Then('I should see the admin operations text {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible()
})

Then('I should see the admin application {string} with status {string}', async ({ page }, applicationId: string, status: string) => {
  const application = page.getByTestId(`admin-application-${applicationId}`)

  await expect(application).toBeVisible()
  await expect(getStatusBadge(application, status)).toBeVisible()
})

When('I approve the admin application {string}', async ({ page }, applicationId: string) => {
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/`)
      && response.url().includes(`/applications/${applicationId}/actions/approve`)
      && response.ok()
    ),
    page.getByTestId(`admin-application-approve-${applicationId}`).click()
  ])
})

Then('I should see the admin team {string} with submission status {string}', async ({ page }, teamId: string, status: string) => {
  const team = page.getByTestId(`admin-team-${teamId}`)

  await expect(team).toBeVisible()
  await expect(getStatusBadge(team, status)).toBeVisible()
})

Then('I should not see the admin team {string}', async ({ page }, teamId: string) => {
  await expect(page.getByTestId(`admin-team-${teamId}`)).toHaveCount(0)
})

When('I load more admin teams', async ({ page }) => {
  const loadMoreButton = page.getByTestId('admin-operations-load-more-teams')
  const hackathonId = getCurrentHackathonId(page)

  await expect(loadMoreButton).toBeVisible()
  await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url())

      return url.pathname === `/api/hackathons/${hackathonId}/teams`
        && url.searchParams.get('page') === '2'
        && response.ok()
    }),
    loadMoreButton.click()
  ])
})

When('I admin-withdraw the team submission for {string} with note {string}', async ({ page }, teamId: string, note: string) => {
  const team = page.getByTestId(`admin-withdraw-team-${teamId}`)

  await expect(team).toBeVisible()
  await team.getByPlaceholder('Requested by team due to...').fill(note)
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/`)
      && response.url().includes(`/teams/${teamId}/submission/actions/admin-withdraw`)
      && response.ok()
    ),
    team.getByTestId(`admin-withdraw-submit-${teamId}`).click()
  ])
})

When('I disqualify the admin team submission for {string} with note {string}', async ({ page }, teamId: string, note: string) => {
  const team = page.getByTestId(`admin-disqualify-team-${teamId}`)

  await expect(team).toBeVisible()
  await team.getByPlaceholder('Competition removal reason').fill(note)
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/`)
      && response.url().includes(`/teams/${teamId}/submission/actions/disqualify`)
      && response.ok()
    ),
    team.getByTestId(`admin-disqualify-submit-${teamId}`).click()
  ])
})
