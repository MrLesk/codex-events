import type { APIResponse, Page } from '@playwright/test'

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { createAuthenticatedApiClient } from '../support/api-client'
import { platformFixtureIds } from '../support/platform-fixtures.ts'
import { stablePersonaKeys, type StablePersonaKey } from '../support/personas'

const { When, Then } = createBdd()

type ScenarioState = {
  response?: APIResponse
  json?: unknown
  redemptionId?: string
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

When('the saved {string} session reorders the outcomes fixture shortlist to prefer submission two', async ({ page }, personaKey: string) => {
  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.post(
      `/api/hackathons/${platformFixtureIds.outcomesHackathonId}/shortlist/actions/reorder`,
      {
        data: {
          orderedSubmissionIds: [
            platformFixtureIds.outcomesSubmissionTwoId,
            platformFixtureIds.outcomesSubmissionOneId
          ]
        }
      }
    )
    const state = getScenarioState(page)
    state.response = response
    state.json = await response.json()
  } finally {
    await apiClient.dispose()
  }
})

Then('the outcomes fixture shortlist should rank submission two first and submission one second', async ({ page }) => {
  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).json).toMatchObject({
    data: [
      {
        submissionId: platformFixtureIds.outcomesSubmissionTwoId,
        finalRank: 1
      },
      {
        submissionId: platformFixtureIds.outcomesSubmissionOneId,
        finalRank: 2
      }
    ]
  })
})

When('the saved {string} session announces winners for the outcomes fixture hackathon', async ({ page }, personaKey: string) => {
  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.post(`/api/hackathons/${platformFixtureIds.outcomesHackathonId}/actions/announce-winners`)
    const state = getScenarioState(page)
    state.response = response
    state.json = await response.json()
  } finally {
    await apiClient.dispose()
  }
})

Then('the outcomes fixture hackathon state should be {string}', async ({ page }, expectedState: string) => {
  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).json).toMatchObject({
    data: {
      id: platformFixtureIds.outcomesHackathonId,
      state: expectedState
    }
  })
})

When('the saved {string} session lists winners for the outcomes fixture hackathon', async ({ page }, personaKey: string) => {
  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.get(`/api/hackathons/${platformFixtureIds.outcomesHackathonId}/winners`)
    const state = getScenarioState(page)
    state.response = response
    state.json = await response.json()
  } finally {
    await apiClient.dispose()
  }
})

Then('the outcomes fixture winners should rank team two first and team one second', async ({ page }) => {
  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).json).toMatchObject({
    data: [
      {
        teamId: 'team_outcomes_fixture_two',
        finalRank: 1
      },
      {
        teamId: 'team_outcomes_fixture_one',
        finalRank: 2
      }
    ]
  })
})

When('the saved {string} session lists pending prize redemptions for the outcomes fixture hackathon', async ({ page }, personaKey: string) => {
  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.get('/api/prize-redemptions/me')
    const json = await response.json() as {
      data?: Array<{
        id?: string
        teamId?: string | null
        prize?: {
          id?: string
        }
        hackathon?: {
          id?: string
        }
      }>
    }
    const state = getScenarioState(page)
    state.response = response
    state.json = json
    state.redemptionId = json.data?.find(redemption =>
      redemption.hackathon?.id === platformFixtureIds.outcomesHackathonId
      && redemption.teamId === 'team_outcomes_fixture_two'
      && redemption.prize?.id === platformFixtureIds.outcomesTeamRedemptionPrizeId
    )?.id
  } finally {
    await apiClient.dispose()
  }
})

Then('the remembered outcomes prize redemption should target team {string} and prize {string}', async ({ page }, teamId: string, prizeId: string) => {
  const payload = getScenarioState(page).json as {
    data?: Array<{
      id?: string
      teamId?: string | null
      status?: string
      prize?: {
        id?: string
      }
      hackathon?: {
        id?: string
      }
    }>
  }

  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).redemptionId).toBeTruthy()
  expect(payload.data).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: getScenarioState(page).redemptionId,
      teamId,
      status: 'pending',
      prize: expect.objectContaining({
        id: prizeId
      }),
      hackathon: expect.objectContaining({
        id: platformFixtureIds.outcomesHackathonId
      })
    })
  ]))
})

When('the saved {string} session redeems the remembered outcomes prize redemption as {string}', async ({ page }, personaKey: string, legalName: string) => {
  const state = getScenarioState(page)

  if (!state.redemptionId) {
    throw new Error('No remembered outcomes redemption is available to redeem.')
  }

  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.post(
      `/api/prize-redemptions/${state.redemptionId}/actions/redeem`,
      {
        data: {
          legalName,
          winnerTermsDocumentId: platformFixtureIds.outcomesWinnerTermsDocumentId
        }
      }
    )
    state.response = response
    state.json = await response.json()
  } finally {
    await apiClient.dispose()
  }
})

Then('the remembered outcomes prize redemption should be redeemed by {string}', async ({ page }, userId: string) => {
  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(getScenarioState(page).json).toMatchObject({
    data: {
      id: getScenarioState(page).redemptionId,
      status: 'redeemed',
      userId
    }
  })
})

Then('the redeemed outcomes prize redemption should accept the current outcomes winner terms document', async ({ page }) => {
  expect(getScenarioState(page).json).toMatchObject({
    data: {
      winnerTermsDocumentId: platformFixtureIds.outcomesWinnerTermsDocumentId
    }
  })
})

When('the saved {string} session lists audit logs for the outcomes fixture hackathon', async ({ page }, personaKey: string) => {
  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.get(`/api/hackathons/${platformFixtureIds.outcomesHackathonId}/audit`)
    const state = getScenarioState(page)
    state.response = response
    state.json = await response.json()
  } finally {
    await apiClient.dispose()
  }
})

Then('the outcomes fixture hackathon audit should include actions {string}, {string}, and {string}', async ({ page }, firstAction: string, secondAction: string, thirdAction: string) => {
  const payload = getScenarioState(page).json as {
    data?: Array<{
      action?: string
    }>
  }

  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(payload.data).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: firstAction }),
    expect.objectContaining({ action: secondAction }),
    expect.objectContaining({ action: thirdAction })
  ]))
})

When('the saved {string} session lists platform audit logs', async ({ page }, personaKey: string) => {
  const apiClient = await createAuthenticatedApiClient(parsePersonaKey(personaKey))

  try {
    const response = await apiClient.get('/api/audit')
    const state = getScenarioState(page)
    state.response = response
    state.json = await response.json()
  } finally {
    await apiClient.dispose()
  }
})

Then('the platform audit should include actions {string}, {string}, and {string}', async ({ page }, firstAction: string, secondAction: string, thirdAction: string) => {
  const payload = getScenarioState(page).json as {
    data?: Array<{
      action?: string
    }>
  }

  expect(getScenarioState(page).response?.ok()).toBe(true)
  expect(payload.data).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: firstAction }),
    expect.objectContaining({ action: secondAction }),
    expect.objectContaining({ action: thirdAction })
  ]))
})
