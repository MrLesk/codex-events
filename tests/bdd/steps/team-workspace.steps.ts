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

type ScenarioState = {
  createdTeamName?: string
}

const scenarioState = new WeakMap<Page, ScenarioState>()

function getScenarioState(page: Page) {
  let state = scenarioState.get(page)

  if (!state) {
    state = {}
    scenarioState.set(page, state)
  }

  return state
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

When('I open the participant team workspace link', async ({ page }) => {
  await Promise.all([
    page.waitForURL(/\/hackathons\/[^/]+\/teams$/),
    page.getByTestId('participant-team-workspace-link').click()
  ])

  await expect(page.getByTestId('participant-team-directory-panel')).toBeVisible()
})

When('I open the participant team directory for hackathon slug {string} with the saved {string} session', async ({ page }, slug: string, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto(`/hackathons/${slug}/teams`)
  await expect(page.getByTestId('participant-team-directory-panel')).toBeVisible()
})

Then('I should see the participant team card {string}', async ({ page }, teamName: string) => {
  await expect(page.getByTestId('participant-team-directory-panel').getByText(teamName)).toBeVisible()
})

When('I create a participant team named {string}', async ({ page }, baseName: string) => {
  const uniqueTeamName = `${baseName} ${Date.now()}`
  getScenarioState(page).createdTeamName = uniqueTeamName

  await page.getByLabel('Team name').fill(uniqueTeamName)

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/api/hackathons/')
      && response.url().includes('/teams')
      && response.request().method() === 'POST'
      && response.ok()
    ),
    page.waitForURL(/\/hackathons\/[^/]+\/teams\/[^/]+$/),
    page.getByTestId('participant-team-create-submit').click()
  ])
})

Then('I should be in the participant team workspace for the created team', async ({ page }) => {
  const createdTeamName = getScenarioState(page).createdTeamName

  if (!createdTeamName) {
    throw new Error('No created team name is available for this scenario.')
  }

  await expect(page.getByTestId('participant-team-workspace-panel').getByText(createdTeamName)).toBeVisible()
})

When('I open the participant visible team workspace for {string}', async ({ page }, teamName: string) => {
  const teamCard = page.locator('[data-testid^="participant-team-card-"]').filter({
    hasText: teamName
  }).first()

  if (await teamCard.count()) {
    await expect(teamCard).toBeVisible()
    await Promise.all([
      page.waitForURL(/\/hackathons\/[^/]+\/teams\/[^/]+$/),
      teamCard.getByRole('link', {
        name: 'View team'
      }).click()
    ])
  } else {
    const currentTeamLink = page.getByRole('link', {
      name: 'Open team workspace'
    })

    await expect(currentTeamLink).toBeVisible()
    await Promise.all([
      page.waitForURL(/\/hackathons\/[^/]+\/teams\/[^/]+$/),
      currentTeamLink.click()
    ])
  }

  await expect(page.getByTestId('participant-team-workspace-panel')).toBeVisible()
})

When('I request to join the current participant team', async ({ page }) => {
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/api/hackathons/')
      && response.url().includes('/team-join-requests')
      && response.request().method() === 'POST'
      && response.ok()
    ),
    page.getByTestId('participant-team-request-join').click()
  ])
})

Then('I should see the participant team text {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text, {
    exact: false
  }).first()).toBeVisible()
})

Then('I should see the participant join request for {string}', async ({ page }, displayName: string) => {
  await expect(page.getByText(displayName, {
    exact: true
  })).toBeVisible()
  await expect(page.locator('[data-testid^="participant-team-join-request-"]').filter({
    hasText: displayName
  }).first()).toBeVisible()
})

When('I approve the participant join request for {string}', async ({ page }, displayName: string) => {
  const requestCard = page.locator('[data-testid^="participant-team-join-request-"]').filter({
    hasText: displayName
  }).first()

  await expect(requestCard).toBeVisible()
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/actions/approve')
      && response.request().method() === 'POST'
      && response.ok()
    ),
    requestCard.getByRole('button', {
      name: 'Approve'
    }).click()
  ])
})

Then('I should see the participant team member {string}', async ({ page }, displayName: string) => {
  await expect(page.locator('[data-testid^="participant-team-member-"]').filter({
    hasText: displayName
  }).first()).toBeVisible()
})

Then('I should see the participant current team {string}', async ({ page }, teamName: string) => {
  await expect(page.getByText(teamName, {
    exact: true
  })).toBeVisible()
  await expect(page.getByRole('link', {
    name: 'Open team workspace'
  })).toBeVisible()
})

When('I open my participant team workspace', async ({ page }) => {
  await Promise.all([
    page.waitForURL(/\/hackathons\/[^/]+\/teams\/[^/]+$/),
    page.getByRole('link', {
      name: 'Open team workspace'
    }).click()
  ])
})

Then('the participant team action {string} should be disabled', async ({ page }, actionName: string) => {
  await expect(page.getByRole('button', {
    name: actionName
  })).toBeDisabled()
})
