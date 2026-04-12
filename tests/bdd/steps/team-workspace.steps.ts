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

async function waitForNuxtHydration(page: Page) {
  try {
    await page.waitForFunction(() =>
      typeof window.useNuxtApp === 'function' && window.useNuxtApp().isHydrating === false,
    {
      timeout: 5_000
    })
  } catch {
    await page.waitForLoadState('domcontentloaded')
  }
}

async function waitForParticipantTeamTabToSettle(page: Page) {
  const accountWorkspacePanel = page.getByTestId('account-hackathon-workspace-panel')
  const workspacePanel = page.getByTestId('participant-team-workspace-panel')
  const directoryPanel = page.getByTestId('participant-team-directory-panel')

  await expect.poll(async () => {
    if (await accountWorkspacePanel.isVisible().catch(() => false)) {
      return 'account-workspace'
    }

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

  await waitForNuxtHydration(page)

  if (await directoryPanel.isVisible().catch(() => false)) {
    await expect.poll(async () => {
      if (await directoryPanel.getByText('Loading visible teams').count() > 0) {
        return 'loading'
      }

      if (await directoryPanel.locator('[data-testid^="participant-team-card-"]').count() > 0) {
        return 'teams'
      }

      if (await directoryPanel.getByText('No visible teams yet').count() > 0) {
        return 'empty'
      }

      if (await directoryPanel.getByText('Team directory unavailable').count() > 0) {
        return 'error'
      }

      return 'pending'
    }, {
      timeout: 15_000
    }).not.toBe('loading')
  }
}

async function waitForParticipantSubmissionTabToSettle(page: Page) {
  const workspaceRoot = page.getByTestId('account-hackathon-workspace-panel')
  const submissionRoot = page.getByTestId('account-hackathon-submission-panel')

  await expect(workspaceRoot).toBeVisible()
  await waitForNuxtHydration(page)

  await expect.poll(async () => {
    if (await workspaceRoot.getByText('Loading workspace').count() > 0) {
      return 'loading'
    }

    if (await page.getByTestId('participant-submission-panel').isVisible().catch(() => false)) {
      return 'panel'
    }

    if (await submissionRoot.count() === 0) {
      return 'hidden'
    }

    if (await submissionRoot.getByText('Submission window not open yet').count() > 0) {
      return 'closed'
    }

    if (await submissionRoot.getByText('Submission unavailable').count() > 0) {
      return 'unavailable'
    }

    return 'loading'
  }, {
    timeout: 15_000
  }).not.toBe('loading')
}

async function resetParticipantCreateFixtureWorkspaceIfNeeded(page: Page, slug: string) {
  if (slug !== 'participant-team-create-fixture-hackathon') {
    return
  }

  const leaveButton = page.getByTestId('participant-team-leave')

  if (await leaveButton.count() === 0) {
    return
  }

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/api/hackathons/')
      && response.url().includes('/actions/leave')
      && response.ok()
    ),
    leaveButton.click()
  ])

  await waitForParticipantTeamTabToSettle(page)
}

async function recoverTeamDirectoryIfUnresolved(page: Page) {
  const directoryPanel = page.getByTestId('participant-team-directory-panel')

  if (!(await directoryPanel.isVisible().catch(() => false))) {
    return
  }

  const hasCards = await directoryPanel.locator('[data-testid^="participant-team-card-"]').count() > 0
  const hasEmptyState = await directoryPanel.getByText('No visible teams yet').count() > 0
  const hasErrorState = await directoryPanel.getByText('Team directory unavailable').count() > 0

  if (hasCards || hasEmptyState || hasErrorState) {
    return
  }

  await page.reload()
  await expect(page.getByTestId('account-hackathon-team-panel')).toBeVisible()
  await waitForParticipantTeamTabToSettle(page)
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
  await page.goto(`/account/hackathons/${slug}?tab=workspace`)
  await expect(page.getByTestId('account-hackathon-workspace-panel')).toBeVisible()
  await waitForParticipantTeamTabToSettle(page)
  await resetParticipantCreateFixtureWorkspaceIfNeeded(page, slug)
  await recoverTeamDirectoryIfUnresolved(page)
})

When('I open the participant Team tab for hackathon slug {string} and selected team slug {string} with the saved {string} session', async ({ page }, slug: string, selectedTeamSlug: string, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto(`/account/hackathons/${slug}?tab=teams&team=${encodeURIComponent(selectedTeamSlug)}`)
  await expect(page.getByTestId('account-hackathon-team-panel')).toBeVisible()
  await waitForParticipantTeamTabToSettle(page)
})

When('I open the participant Submission tab for hackathon slug {string} with the saved {string} session', async ({ page }, slug: string, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto(`/account/hackathons/${slug}?tab=workspace`)
  await waitForParticipantSubmissionTabToSettle(page)
})

Then('I should see the participant team card {string}', async ({ page }, teamName: string) => {
  await expect(page.getByTestId('participant-team-directory-panel').getByText(teamName)).toBeVisible({
    timeout: 15_000
  })
})

Then('the participant submission surface should not be visible', async ({ page }) => {
  await expect(page.getByTestId('account-hackathon-submission-panel')).toHaveCount(0)
})

When('I create a participant team named {string}', async ({ page }, baseName: string) => {
  const uniqueTeamName = `${baseName} ${Date.now()}`
  getScenarioState(page).createdTeamName = uniqueTeamName

  const workspacePanel = page.getByTestId('participant-team-workspace-panel')
  await waitForNuxtHydration(page)
  await workspacePanel.getByTestId('participant-team-edit-name').click()

  const teamNameInput = workspacePanel.getByLabel('Team name')
  const saveButton = workspacePanel.getByTestId('participant-team-update-profile')

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
  await waitForNuxtHydration(page)
  await workspacePanel.getByTestId('participant-team-edit-name').click()

  const teamNameInput = workspacePanel.getByLabel('Team name')
  const teamBioInput = workspacePanel.getByLabel('Team bio')
  const saveButton = workspacePanel.getByTestId('participant-team-update-profile')

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

When('I enable join requests for the participant team', async ({ page }) => {
  const workspacePanel = page.getByTestId('participant-team-workspace-panel')
  await waitForNuxtHydration(page)
  await workspacePanel.getByRole('switch').click()
  await expect(workspacePanel.getByText('Open to join requests', {
    exact: true
  }).first()).toBeVisible({
    timeout: 15_000
  })
})

When('I reload the participant Team tab page', async ({ page }) => {
  await page.reload()
  await expect(page.getByTestId('account-hackathon-workspace-panel')).toBeVisible()
  await waitForParticipantTeamTabToSettle(page)
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

Then('I should not see the participant workspace text {string}', async ({ page }, text: string) => {
  await expect(page.getByTestId('participant-team-workspace-panel').getByText(text, {
    exact: false
  })).toHaveCount(0)
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

Then('I should see the participant navigation link {string}', async ({ page }, label: string) => {
  await expect(page.getByRole('link', {
    name: label,
    exact: true
  })).toBeVisible()
})

Then('the participant team directory should not be visible', async ({ page }) => {
  await expect(page.getByTestId('participant-team-directory-panel')).toHaveCount(0)
})

Then('the participant join requests panel should not be visible', async ({ page }) => {
  await expect(page.getByTestId('participant-team-join-requests-panel')).toHaveCount(0)
})

Then('the participant team action {string} should be disabled', async ({ page }, actionName: string) => {
  await expect(page.getByRole('button', {
    name: actionName
  })).toBeDisabled()
})

Then('the participant team action {string} should be visible', async ({ page }, actionName: string) => {
  await expect(page.getByRole('button', {
    name: actionName
  })).toBeVisible()
})

Then('the participant team action {string} should not be visible', async ({ page }, actionName: string) => {
  await expect(page.getByRole('button', {
    name: actionName
  })).toHaveCount(0)
})
