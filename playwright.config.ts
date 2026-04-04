import 'dotenv/config'

import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

import { getBaseUrl } from './tests/bdd/support/personas'

const publicBddTestDir = defineBddConfig({
  features: 'tests/bdd/features/public/**/*.feature',
  steps: 'tests/bdd/steps/**/*.ts',
  outputDir: '.features-gen/public'
})

const authenticatedBddTestDir = defineBddConfig({
  features: 'tests/bdd/features/authenticated/**/*.feature',
  steps: 'tests/bdd/steps/**/*.ts',
  outputDir: '.features-gen/authenticated'
})

const destructiveAuthenticatedBddTestDir = defineBddConfig({
  features: 'tests/bdd/features/authenticated-destructive/**/*.feature',
  steps: 'tests/bdd/steps/**/*.ts',
  outputDir: '.features-gen/authenticated-destructive'
})
const localBddD1StateRootShellExpression = '${LOCAL_BDD_D1_STATE_ROOT:-.wrangler/state-bdd}'
const bddBaseUrl = getBaseUrl(process.env)
const bddBaseUrlObject = new URL(bddBaseUrl)
const bddBaseUrlPort = bddBaseUrlObject.port || (bddBaseUrlObject.protocol === 'https:' ? '443' : '80')

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: bddBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium-bdd',
      testDir: publicBddTestDir,
      testMatch: ['**/*.spec.js'],
      use: {
        ...devices['Desktop Chrome']
      }
    },
    {
      name: 'chromium-authenticated-bdd',
      testDir: authenticatedBddTestDir,
      testMatch: ['**/*.spec.js'],
      workers: 1,
      use: {
        ...devices['Desktop Chrome']
      }
    },
    {
      name: 'chromium-authenticated-destructive-bdd',
      testDir: destructiveAuthenticatedBddTestDir,
      testMatch: ['**/*.spec.js'],
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ],
  webServer: {
    command: `LOCAL_BDD_D1_STATE_ROOT=${localBddD1StateRootShellExpression} LOCAL_D1_STATE_ROOT=${localBddD1StateRootShellExpression} bun run db:local:guard && LOCAL_BDD_D1_STATE_ROOT=${localBddD1StateRootShellExpression} LOCAL_D1_STATE_ROOT=${localBddD1StateRootShellExpression} NUXT_AUTH0_APP_BASE_URL=${bddBaseUrl} nuxt dev --host 0.0.0.0 --port ${bddBaseUrlPort}`,
    url: bddBaseUrl,
    reuseExistingServer: false,
    timeout: 120000
  }
})
