import 'dotenv/config'

import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

import { ensureStableAuth0Personas } from './support/auth0-management.ts'
import { getBaseUrl, resetAuthArtifactDirectory } from './support/personas.ts'
import { resetPlatformFixtures } from './support/platform-fixtures.ts'
import { loginAndPersistStorageState } from './support/session-state.ts'

async function sleep(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function isServerReachable(baseUrl: string) {
  try {
    const response = await fetch(baseUrl, {
      redirect: 'manual'
    })
    return response.status < 500
  } catch {
    return false
  }
}

async function ensureLocalServer(baseUrl: string) {
  if (await isServerReachable(baseUrl)) {
    return null
  }

  const { hostname, port } = new URL(baseUrl)
  const child = spawn(join(process.cwd(), 'node_modules/.bin/nuxt'), ['dev', '--host', hostname, '--port', port || '3000'], {
    stdio: 'ignore',
    env: process.env
  })

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Local Nuxt dev server exited early with code ${child.exitCode}.`)
    }

    if (await isServerReachable(baseUrl)) {
      return child
    }

    await sleep(500)
  }

  child.kill('SIGTERM')
  throw new Error(`Timed out waiting for local Nuxt dev server at ${baseUrl}.`)
}

const baseUrl = getBaseUrl()
const serverProcess = await ensureLocalServer(baseUrl)
const personas = await ensureStableAuth0Personas()
await resetPlatformFixtures(personas)
resetAuthArtifactDirectory()
const browser = await chromium.launch()

try {
  for (const persona of personas) {
    await loginAndPersistStorageState(browser, persona)
  }
} finally {
  await browser.close()

  if (serverProcess) {
    serverProcess.kill('SIGTERM')
  }
}

console.log(`Provisioned ${personas.length} stable Auth0 personas, reset platform fixtures, and saved session state.`)
