import 'dotenv/config'

import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

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

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
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
    command: 'bun run db:local:guard && nuxt dev --host 0.0.0.0 --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120000
  }
})
