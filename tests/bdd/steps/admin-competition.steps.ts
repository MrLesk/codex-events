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

When('I open the admin competition page for hackathon {string} with the saved {string} session', async ({ page }, hackathonId: string, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto(`/admin/hackathons/${hackathonId}/competition`)
})

Then('I should see the admin competition text {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible()
})

Then('I should see the admin competition state {string}', async ({ page }, state: string) => {
  await expect(page.getByTestId('admin-competition-hackathon-state')).toHaveText(state)
})

Then('I should see the competition assignment {string} assigned to judge {string}', async ({ page }, submissionId: string, judgeUserId: string) => {
  const assignment = page.getByTestId(`admin-competition-assignment-${submissionId}`)

  await expect(assignment).toBeVisible()
  await expect(page.getByTestId(`admin-competition-assignment-judge-${submissionId}`)).toHaveText(judgeUserId)
})

When('I reassign the competition assignment {string} to judge {string} with note {string}', async ({ page }, submissionId: string, judgeUserId: string, note: string) => {
  const hackathonId = getCurrentHackathonId(page)
  const scope = page.getByTestId(`admin-competition-assignment-${submissionId}`)

  await expect(scope).toBeVisible()
  await scope.getByTestId(`admin-competition-reassign-select-${submissionId}`).selectOption(judgeUserId)
  await scope.getByPlaceholder('Reassignment note').fill(note)

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/${hackathonId}/judging/assignments/`)
      && response.url().includes('/actions/reassign')
      && response.ok()
    ),
    scope.getByTestId(`admin-competition-reassign-submit-${submissionId}`).click()
  ])
})

When('I force-skip the competition assignment {string} with note {string}', async ({ page }, submissionId: string, note: string) => {
  const hackathonId = getCurrentHackathonId(page)
  const scope = page.getByTestId(`admin-competition-assignment-${submissionId}`)

  await expect(scope).toBeVisible()
  await scope.getByPlaceholder('Force-skip note').fill(note)

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/${hackathonId}/judging/assignments/`)
      && response.url().includes('/actions/force-skip')
      && response.ok()
    ),
    scope.getByTestId(`admin-competition-force-skip-submit-${submissionId}`).click()
  ])
})

When('I move the competition shortlist entry {string} up', async ({ page }, submissionId: string) => {
  await page.getByTestId(`admin-competition-shortlist-move-up-${submissionId}`).click()
})

When('I save the competition shortlist order', async ({ page }) => {
  const hackathonId = getCurrentHackathonId(page)

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/${hackathonId}/shortlist/actions/select-finalists`)
      && response.ok()
    ),
    page.getByTestId('admin-competition-shortlist-save').click()
  ])
})

Then('I should see the competition shortlist entry {string} at rank {string}', async ({ page }, submissionId: string, rank: string) => {
  await expect(page.getByTestId(`admin-competition-shortlist-rank-${submissionId}`)).toHaveText(`#${rank}`)
})

When('I announce competition winners', async ({ page }) => {
  const hackathonId = getCurrentHackathonId(page)

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/${hackathonId}/actions/announce-winners`)
      && response.ok()
    ),
    page.getByTestId('admin-competition-announce-winners').click()
  ])
})

When('I complete the competition hackathon', async ({ page }) => {
  const hackathonId = getCurrentHackathonId(page)

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/${hackathonId}/actions/complete`)
      && response.ok()
    ),
    page.getByTestId('admin-competition-complete-hackathon').click()
  ])
})

Then('I should see the competition winner {string}', async ({ page }, submissionId: string) => {
  await expect(page.getByTestId(`admin-competition-winner-${submissionId}`)).toBeVisible()
})

Then('I should see the competition redemption {string} with status {string}', async ({ page }, redemptionId: string, status: string) => {
  await expect(page.getByTestId(`admin-competition-redemption-${redemptionId}`)).toBeVisible()
  await expect(page.getByTestId(`admin-competition-redemption-status-${redemptionId}`)).toHaveText(status)
})
