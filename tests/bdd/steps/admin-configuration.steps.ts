import type { APIResponse, Page } from '@playwright/test'

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { createAuthenticatedApiClient } from '../support/api-client'
import { stablePersonaKeys, type StablePersonaKey } from '../support/personas'

const { When, Then } = createBdd()

type ScenarioState = {
  response?: APIResponse
  json?: unknown
  hackathonId?: string
  criterionId?: string
  hackathonTermsDocumentId?: string
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

When('the saved {string} session creates a managed hackathon named {string}', async ({ page }, personaKey: string, name: string) => {
  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))
  const now = Date.now()

  try {
    const response = await apiClient.post('/api/hackathons', {
      data: {
        name,
        slug: `bdd-managed-hackathon-${now}`,
        description: 'Hackathon created by TASK-3.9 Auth0-backed release-gate coverage.',
        city: 'Vienna',
        address: 'BDD Fixture Address',
        registrationOpensAt: new Date(now - 3_600_000).toISOString(),
        registrationClosesAt: new Date(now + 86_400_000).toISOString(),
        submissionOpensAt: new Date(now + 86_400_000).toISOString(),
        submissionClosesAt: new Date(now + 172_800_000).toISOString(),
        maxTeamMembers: 5,
        requireXProfile: false,
        requireLinkedinProfile: false,
        requireGithubProfile: false,
        requireLumaProfile: false
      }
    })
    const json = await response.json() as {
      data?: {
        id?: string
      }
    }
    const state = getScenarioState(page)
    state.response = response
    state.json = json
    state.hackathonId = json.data?.id
  } finally {
    await apiClient.dispose()
  }
})

Then('the remembered managed hackathon should be created in state {string}', async ({ page }, expectedState: string) => {
  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).hackathonId).toBeTruthy()
  expect(getScenarioState(page).json).toMatchObject({
    data: {
      id: getScenarioState(page).hackathonId,
      state: expectedState
    }
  })
})

When('the saved {string} session adds evaluation criterion {string} with weight {int} and display order {int} to the remembered managed hackathon', async ({ page }, personaKey: string, name: string, weight: number, displayOrder: number) => {
  const state = getScenarioState(page)

  if (!state.hackathonId) {
    throw new Error('No remembered managed hackathon is available for criterion creation.')
  }

  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.post(`/api/hackathons/${state.hackathonId}/evaluation-criteria`, {
      data: {
        name,
        description: `${name} criterion for TASK-3.9 release-gate coverage.`,
        weight,
        displayOrder
      }
    })
    const json = await response.json() as {
      data?: {
        id?: string
      }
    }
    state.response = response
    state.json = json
    state.criterionId = json.data?.id
  } finally {
    await apiClient.dispose()
  }
})

Then('the remembered managed hackathon criterion should be created with display order {int}', async ({ page }, displayOrder: number) => {
  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).criterionId).toBeTruthy()
  expect(getScenarioState(page).json).toMatchObject({
    data: {
      id: getScenarioState(page).criterionId,
      displayOrder
    }
  })
})

When('the saved {string} session publishes application terms titled {string} for the remembered managed hackathon', async ({ page }, personaKey: string, title: string) => {
  const state = getScenarioState(page)

  if (!state.hackathonId) {
    throw new Error('No remembered managed hackathon is available for terms creation.')
  }

  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.post(
      `/api/hackathons/${state.hackathonId}/terms/application_terms/versions`,
      {
        data: {
          title,
          content: `${title} content`
        }
      }
    )
    const json = await response.json() as {
      data?: {
        id?: string
      }
    }
    state.response = response
    state.json = json
    state.hackathonTermsDocumentId = json.data?.id
  } finally {
    await apiClient.dispose()
  }
})

Then('the remembered managed hackathon terms document should be {string} version {int}', async ({ page }, documentType: string, version: number) => {
  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).hackathonTermsDocumentId).toBeTruthy()
  expect(getScenarioState(page).json).toMatchObject({
    data: {
      id: getScenarioState(page).hackathonTermsDocumentId,
      documentType,
      version
    }
  })
})

When('the saved {string} session sets the remembered managed hackathon application terms as current', async ({ page }, personaKey: string) => {
  const state = getScenarioState(page)

  if (!state.hackathonId || !state.hackathonTermsDocumentId) {
    throw new Error('No remembered managed hackathon terms document is available to set current.')
  }

  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.post(
      `/api/hackathons/${state.hackathonId}/terms/application_terms/actions/set-current`,
      {
        data: {
          hackathonTermsDocumentId: state.hackathonTermsDocumentId
        }
      }
    )
    state.response = response
    state.json = await response.json()
  } finally {
    await apiClient.dispose()
  }
})

Then('the remembered managed hackathon should reference the remembered current application terms document', async ({ page }) => {
  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).json).toMatchObject({
    data: {
      id: getScenarioState(page).hackathonId,
      currentApplicationTermsDocumentId: getScenarioState(page).hackathonTermsDocumentId
    }
  })
})

When('the saved {string} session loads current terms for the remembered managed hackathon', async ({ page }, personaKey: string) => {
  const state = getScenarioState(page)

  if (!state.hackathonId) {
    throw new Error('No remembered managed hackathon is available for current-terms lookup.')
  }

  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.get(`/api/hackathons/${state.hackathonId}/terms/current`)
    state.response = response
    state.json = await response.json()
  } finally {
    await apiClient.dispose()
  }
})

Then('the current terms response should expose the remembered current application terms document', async ({ page }) => {
  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).json).toMatchObject({
    data: {
      application_terms: {
        id: getScenarioState(page).hackathonTermsDocumentId
      }
    }
  })
})
