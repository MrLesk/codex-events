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

async function waitForParticipantTeamTabToSettle(page: Page) {
  const workspacePanel = page.getByTestId('participant-team-workspace-panel')
  const directoryPanel = page.getByTestId('participant-team-directory-panel')

  await expect.poll(async () => {
    if (await workspacePanel.isVisible().catch(() => false)) {
      return 'workspace'
    }

    if (await directoryPanel.isVisible().catch(() => false)) {
      return 'directory'
    }

    return 'loading'
  }, {
    timeout: 15_000
  }).not.toBe('loading')
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

When('I open the participant Team tab for hackathon slug {string} with the saved {string} session', async ({ page }, slug: string, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto(`/account/hackathons/${slug}?tab=team`)
  await expect(page.getByTestId('account-hackathon-team-panel')).toBeVisible()
  await waitForParticipantTeamTabToSettle(page)
})

Then('I should see the participant team card {string}', async ({ page }, teamName: string) => {
  await expect(page.getByTestId('participant-team-directory-panel').getByText(teamName)).toBeVisible()
})

When('I create a participant team named {string}', async ({ page }, baseName: string) => {
  const uniqueTeamName = `${baseName} ${Date.now()}`
  getScenarioState(page).createdTeamName = uniqueTeamName

  const workspacePanel = page.getByTestId('participant-team-workspace-panel')
  await workspacePanel.getByTestId('participant-team-edit-name').click()

  const teamNameInput = workspacePanel.getByLabel('Team name')
  const saveButton = page.getByTestId('participant-team-update-profile')

  await expect(saveButton).toBeEnabled({
    timeout: 15_000
  })

  await expect.poll(async () => {
    await teamNameInput.fill(uniqueTeamName)
    return await teamNameInput.inputValue()
  }, {
    timeout: 5_000
  }).toBe(uniqueTeamName)

  await saveButton.click()

  await expect(page.getByTestId('participant-team-workspace-panel').getByRole('heading', {
    name: uniqueTeamName,
    exact: true
  })).toBeVisible({
    timeout: 15_000
  })
})

When('I create a participant team named {string} with bio {string}', async ({ page }, baseName: string, teamBio: string) => {
  const uniqueTeamName = `${baseName} ${Date.now()}`
  getScenarioState(page).createdTeamName = uniqueTeamName

  const workspacePanel = page.getByTestId('participant-team-workspace-panel')
  await workspacePanel.getByTestId('participant-team-edit-name').click()

  const teamNameInput = workspacePanel.getByLabel('Team name')
  const teamBioInput = workspacePanel.getByLabel('Team bio')
  const saveButton = page.getByTestId('participant-team-update-profile')

  await expect(saveButton).toBeEnabled({
    timeout: 15_000
  })

  await expect.poll(async () => {
    await teamNameInput.fill(uniqueTeamName)
    return await teamNameInput.inputValue()
  }, {
    timeout: 5_000
  }).toBe(uniqueTeamName)

  await expect.poll(async () => {
    await teamBioInput.fill(teamBio)
    return await teamBioInput.inputValue()
  }, {
    timeout: 5_000
  }).toBe(teamBio)

  await saveButton.click()

  await expect(page.getByTestId('participant-team-workspace-panel').getByRole('heading', {
    name: uniqueTeamName,
    exact: true
  })).toBeVisible({
    timeout: 15_000
  })
})

Then('I should be in the participant team workspace for the created team', async ({ page }) => {
  const createdTeamName = getScenarioState(page).createdTeamName

  if (!createdTeamName) {
    throw new Error('No created team name is available for this scenario.')
  }

  await expect(page.getByTestId('participant-team-workspace-panel').getByRole('heading', {
    name: createdTeamName,
    exact: true
  })).toBeVisible({
    timeout: 15_000
  })
})

Then('I should see the participant team text {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text, {
    exact: false
  }).first()).toBeVisible()
})

Then('I should see the participant current team {string}', async ({ page }, teamName: string) => {
  await expect(page.getByTestId('participant-team-workspace-panel').getByRole('heading', {
    name: teamName,
    exact: true
  })).toBeVisible({
    timeout: 15_000
  })
  await expect(page.getByTestId('participant-team-workspace-panel')).toBeVisible()
})

Then('the participant team action {string} should be disabled', async ({ page }, actionName: string) => {
  await expect(page.getByRole('button', {
    name: actionName
  })).toBeDisabled()
})

Then('the participant team action {string} should not be visible', async ({ page }, actionName: string) => {
  await expect(page.getByRole('button', {
    name: actionName
  })).toHaveCount(0)
})
