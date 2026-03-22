import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

const testDir = defineBddConfig({
  features: 'tests/bdd/features/**/*.feature',
  steps: 'tests/bdd/steps/**/*.ts',
  outputDir: '.features-gen'
})

export default defineConfig({
  testDir,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome']
    }
  }],
  webServer: {
    command: 'bun run dev -- --host 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
})
