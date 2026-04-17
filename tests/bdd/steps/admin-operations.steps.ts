import { existsSync, readFileSync } from 'node:fs'

import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { createAuthenticatedApiClient } from '../support/api-client'
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

function formatParticipantViewLabel(status: string) {
  switch (status) {
    case 'submitted':
      return 'New'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'withdrawn':
      return 'Withdrawn'
    default:
      return null
  }
}

function decisionButtonActiveClass(decision: 'approve' | 'reject') {
  return decision === 'approve' ? 'bg-success/12' : 'bg-error/12'
}

async function isDecisionButtonActive(button: ReturnType<Page['getByTestId']>, decision: 'approve' | 'reject') {
  const className = await button.getAttribute('class')
  return className?.includes(decisionButtonActiveClass(decision)) ?? false
}

function getCurrentHackathonId(page: Page) {
  const segments = new URL(page.url()).pathname.split('/').filter(Boolean)
  return segments[segments.indexOf('hackathons') + 1] ?? ''
}

function resolveHackathonId(hackathonSlug: string) {
  switch (hackathonSlug) {
    case 'e2e-fixture-hackathon':
      return 'hackathon_e2e_fixture'
    case 'operations-fixture-hackathon':
      return 'hackathon_e2e_operations_fixture'
    default:
      throw new Error(`No API hackathon id mapping is configured for workspace slug "${hackathonSlug}".`)
  }
}

function resolveHackathonSlug(hackathonId: string) {
  switch (hackathonId) {
    case 'hackathon_e2e_fixture':
      return 'e2e-fixture-hackathon'
    case 'hackathon_e2e_operations_fixture':
      return 'operations-fixture-hackathon'
    default:
      throw new Error(`No account-workspace slug mapping is configured for hackathon "${hackathonId}".`)
  }
}

async function waitForStagedApplicationDecision(page: Page, applicationId: string, decision: 'approved' | 'rejected') {
  const apiClient = await createAuthenticatedApiClient('hackathon_admin')
  const hackathonId = resolveHackathonId(getCurrentHackathonId(page))

  try {
    await expect.poll(async () => {
      const response = await apiClient.get(`/api/hackathons/${hackathonId}/applications`)

      if (!response.ok()) {
        return null
      }

      const payload = await response.json() as {
        data?: Array<{
          id?: string
          preApprovalStatus?: 'approved' | 'rejected' | null
        }>
      }

      return payload.data?.find(application => application.id === applicationId)?.preApprovalStatus ?? null
    }, {
      timeout: 10_000
    }).toBe(decision)
  } finally {
    await apiClient.dispose()
  }
}

async function waitForApplicationStatus(page: Page, applicationId: string, status: 'submitted' | 'approved' | 'rejected' | 'withdrawn') {
  const apiClient = await createAuthenticatedApiClient('hackathon_admin')
  const hackathonId = resolveHackathonId(getCurrentHackathonId(page))

  try {
    await expect.poll(async () => {
      const response = await apiClient.get(`/api/hackathons/${hackathonId}/applications`)

      if (!response.ok()) {
        return null
      }

      const payload = await response.json() as {
        data?: Array<{
          id?: string
          status?: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | null
        }>
      }

      return payload.data?.find(application => application.id === applicationId)?.status ?? null
    }, {
      timeout: 10_000
    }).toBe(status)
  } finally {
    await apiClient.dispose()
  }
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
  await page.goto(`/account/hackathons/${resolveHackathonSlug(hackathonId)}?tab=participants`)
})

Then('I should see the admin operations text {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible()
})

Then('I should see the admin application {string} with status {string}', async ({ page }, applicationId: string, status: string) => {
  const participantViewLabel = formatParticipantViewLabel(status)

  if (!participantViewLabel) {
    throw new Error(`Unsupported admin application status assertion: ${status}`)
  }

  await page.getByRole('button', {
    name: participantViewLabel,
    exact: false
  }).click()

  const application = page.getByTestId(`admin-application-${applicationId}`)

  if (status !== 'submitted') {
    await waitForApplicationStatus(page, applicationId, status)
    return
  }

  await expect(application).toBeVisible()
})

When('I approve the admin application {string}', async ({ page }, applicationId: string) => {
  const approveButton = page.getByTestId(`admin-application-approve-${applicationId}`)

  if (!(await isDecisionButtonActive(approveButton, 'approve'))) {
    await Promise.all([
      page.waitForResponse(response =>
        response.url().includes(`/api/hackathons/`)
        && response.url().includes(`/applications/${applicationId}/actions/approve`)
        && response.ok()
      ),
      approveButton.click()
    ])
  }

  await expect.poll(async () => await isDecisionButtonActive(approveButton, 'approve')).toBe(true)
  await waitForStagedApplicationDecision(page, applicationId, 'approved')
  await expect(page.getByTestId('admin-application-save-decisions')).toBeEnabled()

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/`)
      && response.url().includes('/applications/actions/apply-staged-decisions')
      && response.ok()
    ),
    page.getByTestId('admin-application-save-decisions').click()
  ])
})

When('I reject the admin application {string}', async ({ page }, applicationId: string) => {
  const rejectButton = page.getByTestId(`admin-application-reject-${applicationId}`)

  if (!(await isDecisionButtonActive(rejectButton, 'reject'))) {
    await Promise.all([
      page.waitForResponse(response =>
        response.url().includes(`/api/hackathons/`)
        && response.url().includes(`/applications/${applicationId}/actions/reject`)
        && response.ok()
      ),
      rejectButton.click()
    ])
  }

  await expect.poll(async () => await isDecisionButtonActive(rejectButton, 'reject')).toBe(true)
  await waitForStagedApplicationDecision(page, applicationId, 'rejected')
  await expect(page.getByTestId('admin-application-save-decisions')).toBeEnabled()

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/`)
      && response.url().includes('/applications/actions/apply-staged-decisions')
      && response.ok()
    ),
    page.getByTestId('admin-application-save-decisions').click()
  ])
})

Then('I should see the admin team {string} with submission status {string}', async ({ page }, teamId: string, status: string) => {
  const team = page.getByTestId(`admin-team-${teamId}`)

  await expect(team).toBeVisible()
  await expect(team.getByText(status, {
    exact: false
  }).first()).toBeVisible()
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
  await page.getByTestId(`admin-team-withdraw-toggle-${teamId}`).click()

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
  const interventionsToggle = page.getByTestId('admin-submission-interventions-toggle')
  const interventionsPanel = page.getByTestId('admin-submission-interventions-panel')

  if (await interventionsPanel.count() === 0) {
    await interventionsToggle.click()
  }

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
