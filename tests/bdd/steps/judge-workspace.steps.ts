import { existsSync, readFileSync } from 'node:fs'

import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { platformFixtureIds } from '../support/platform-fixtures.ts'
import { stablePersonaKeys, storageStatePathForPersona, type StablePersonaKey } from '../support/personas.ts'

const { When, Then } = createBdd()
const judgeWorkspaceHackathonSlug = 'e2e-judge-workspace-fixture-hackathon'

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

function getAssignmentCard(page: Page, title: string) {
  return page
    .locator('[data-testid^="judge-assignment-card-"]')
    .filter({ has: page.getByRole('heading', { name: title }) })
    .first()
}

When('I open the judge workspace with the saved {string} session', async ({ page }, personaKey: string) => {
  await applyStoredStateToPage(parsePersonaKey(personaKey), page)
  await page.goto(`/account/hackathons/${judgeWorkspaceHackathonSlug}?tab=judging`)
})

Then('I should see the blind workspace assignment card for {string}', async ({ page }, title: string) => {
  await expect(getAssignmentCard(page, title)).toBeVisible()
})

Then('I should not see the blind workspace assignment card for {string}', async ({ page }, title: string) => {
  await expect(getAssignmentCard(page, title)).toHaveCount(0)
})

Then('I should not see the text {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toHaveCount(0)
})

When('I open the blind workspace assignment for {string}', async ({ page }, title: string) => {
  const card = getAssignmentCard(page, title)

  await expect(card).toBeVisible()
  await card.click()
  await expect(page).toHaveURL(new RegExp(`/account/hackathons/${judgeWorkspaceHackathonSlug}\\?tab=judging&assignment=`))
  await expect(page.getByTestId('judge-assignment-project-name')).toHaveText(title)
})

Then('I should see the blind assignment project name {string}', async ({ page }, title: string) => {
  await expect(page.getByTestId('judge-assignment-project-name')).toHaveText(title)
})

When('I start the opened blind review', async ({ page }) => {
  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/${platformFixtureIds.judgeWorkspaceHackathonId}/judging/assignments/${platformFixtureIds.judgeWorkspaceAssignmentId}/actions/start`)
      && response.ok()
    ),
    page.getByTestId('judge-start-review').click()
  ])
})

Then('the opened blind assignment should show status {string}', async ({ page }, statusLabel: string) => {
  await expect(page.getByTestId('judge-assignment-status')).toContainText(statusLabel)
})

When('I complete the opened blind review with workspace fixture scores', async ({ page }) => {
  await page.getByTestId(`judge-criterion-score-${platformFixtureIds.judgeWorkspaceCriterionOneId}`).fill('8')
  await page.getByTestId(`judge-criterion-score-${platformFixtureIds.judgeWorkspaceCriterionTwoId}`).fill('9')

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/${platformFixtureIds.judgeWorkspaceHackathonId}/judging/assignments/${platformFixtureIds.judgeWorkspaceAssignmentId}/actions/complete`)
      && response.ok()
    ),
    page.getByTestId('judge-complete-review').click()
  ])
})

When('I mark the opened blind assignment ineligible with reason {string}', async ({ page }, reason: string) => {
  await page.getByTestId('judge-ineligibility-reason').fill(reason)

  await Promise.all([
    page.waitForResponse(response =>
      response.url().includes(`/api/hackathons/${platformFixtureIds.judgeWorkspaceHackathonId}/judging/assignments/${platformFixtureIds.judgeWorkspaceAssignmentId}/actions/mark-ineligible`)
      && response.ok()
    ),
    page.getByTestId('judge-mark-ineligible').click()
  ])
})

Then('the opened blind assignment should show ineligibility {string}', async ({ page }, label: string) => {
  await expect(page.getByTestId('judge-assignment-ineligibility')).toContainText(label)
})

When('I skip the opened blind review with reason {string}', async ({ page }, reason: string) => {
  await page.getByTestId('judge-skip-reason').fill(reason)

  await Promise.all([
    page.waitForURL(`**/account/hackathons/${judgeWorkspaceHackathonSlug}?tab=judging`),
    page.getByTestId('judge-skip-review').click()
  ])
})

Then('I should be returned to the hackathon judging tab', async ({ page }) => {
  await expect(page).toHaveURL(new RegExp(`/account/hackathons/${judgeWorkspaceHackathonSlug}\\?tab=judging$`))
  await expect(page.getByRole('tab', { name: 'Judging', exact: true })).toHaveAttribute('aria-selected', 'true')
})

When('I reopen the judge workspace for the fixture hackathon', async ({ page }) => {
  await page.goto(`/account/hackathons/${judgeWorkspaceHackathonSlug}?tab=judging`)
})
