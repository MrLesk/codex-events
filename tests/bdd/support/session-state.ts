import type { Browser, Page } from '@playwright/test'

import { getBaseUrl, storageStatePathForPersona, type StablePersona } from './personas.ts'

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function fillFirstVisible(page: Page, selectors: string[], value: string) {
  const timeoutAt = Date.now() + 60_000

  while (Date.now() < timeoutAt) {
    for (const selector of selectors) {
      const field = page.locator(selector).first()

      if (await field.count() > 0) {
        await field.waitFor({ state: 'visible', timeout: 5_000 })
        await field.fill(value)
        return
      }
    }

    await page.waitForTimeout(250)
  }

  const pageText = (await page.locator('body').innerText()).slice(0, 1000)
  throw new Error(`Unable to find a visible field for selectors: ${selectors.join(', ')}. URL: ${page.url()}. Page text: ${pageText}`)
}

async function clickContinue(page: Page) {
  const continueButton = page.getByRole('button', { name: /^continue$/i }).first()

  if (await continueButton.count() > 0) {
    await continueButton.click()
    return
  }

  await page.locator('button[type="submit"]').first().click()
}

function isTransientAuthPageError(pageText: string) {
  return /unexpected http response status code|an error has occurred/i.test(pageText)
}

export async function loginAndPersistStorageState(browser: Browser, persona: StablePersona, environment: NodeJS.ProcessEnv = process.env) {
  const baseUrl = getBaseUrl(environment)
  const storageStatePath = storageStatePathForPersona(persona.key)
  const context = await browser.newContext({ baseURL: baseUrl })
  const page = await context.newPage()
  const dashboardUrlPattern = new RegExp(`^${escapeForRegex(baseUrl)}/account/dashboard(?:[/?#].*)?$`)
  const maxAttempts = 5

  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await page.goto('/auth/bdd-login', {
        waitUntil: 'domcontentloaded'
      })

      try {
        await fillFirstVisible(page, ['input[name="username"]', 'input[name="email"]', '#username'], persona.email)
        await fillFirstVisible(page, ['input[name="password"]', '#password'], persona.password)
      } catch (error) {
        const pageText = (await page.locator('body').innerText()).slice(0, 1000)

        if (attempt < maxAttempts - 1 && isTransientAuthPageError(pageText)) {
          await page.waitForTimeout(2000 * (attempt + 1))
          continue
        }

        throw error
      }

      await clickContinue(page)

      const invalidCredentials = page.getByText(/wrong email or password/i).first()
      const blockedAccount = page.getByText(/account has been blocked after multiple consecutive login attempts/i).first()
      const authPageError = page.getByText(/unexpected http response status code|an error has occurred/i).first()
      const outcome = await Promise.race([
        page.waitForURL(dashboardUrlPattern, { timeout: 20_000 }).then(() => 'dashboard').catch(() => null),
        invalidCredentials.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'invalid').catch(() => null),
        blockedAccount.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'blocked').catch(() => null),
        authPageError.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'error').catch(() => null)
      ])

      if (outcome === 'dashboard') {
        await context.storageState({ path: storageStatePath })
        return storageStatePath
      }

      if ((outcome === 'invalid' || outcome === 'error') && attempt < maxAttempts - 1) {
        await page.waitForTimeout(2000 * (attempt + 1))
        continue
      }

      if (outcome === 'blocked' && attempt < maxAttempts - 1) {
        await page.waitForTimeout(10000 * (attempt + 1))
        continue
      }

      const pageText = (await page.locator('body').innerText()).slice(0, 1000)
      throw new Error(`Auth0 login did not reach /account/dashboard for persona "${persona.key}". Final URL: ${page.url()}. Page text: ${pageText}`)
    }

    throw new Error(`Auth0 login exhausted retry attempts for persona "${persona.key}".`)
  } finally {
    await context.close()
  }
}
