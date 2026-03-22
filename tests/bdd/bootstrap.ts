import 'dotenv/config'

import { existsSync } from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import { join } from 'node:path'
import { chromium, type Browser } from '@playwright/test'

import { ensureStableAuth0Personas } from './support/auth0-management.ts'
import {
  getBaseUrl,
  resetAuthArtifactDirectory,
  storageStatePathForPersona,
  type StablePersona
} from './support/personas.ts'
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

function findListeningPids(port: string) {
  try {
    const output = execFileSync('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN'], {
      encoding: 'utf8'
    }).trim()

    if (!output) {
      return []
    }

    return output
      .split('\n')
      .map(value => Number.parseInt(value, 10))
      .filter(pid => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
  } catch {
    return []
  }
}

async function stopExistingServer(baseUrl: string) {
  const { port } = new URL(baseUrl)
  const effectivePort = port || '3000'
  const pids = findListeningPids(effectivePort)

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // Ignore already-exited or inaccessible processes and continue waiting.
    }
  }

  if (pids.length === 0) {
    return
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (!(await isServerReachable(baseUrl))) {
      return
    }

    await sleep(250)
  }

  throw new Error(`Timed out waiting for the existing local server at ${baseUrl} to stop before bootstrap.`)
}

async function ensureLocalServer(baseUrl: string) {
  await stopExistingServer(baseUrl)

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

async function ensurePersonaStorageState(browser: Browser, persona: StablePersona) {
  const storageStatePath = storageStatePathForPersona(persona.key)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await loginAndPersistStorageState(browser, persona)

    if (existsSync(storageStatePath)) {
      return
    }

    await sleep(500 * (attempt + 1))
  }

  throw new Error(`Bootstrap did not persist storage state for persona "${persona.key}" at ${storageStatePath}.`)
}

const baseUrl = getBaseUrl()
const personas = await ensureStableAuth0Personas()
await resetPlatformFixtures(personas)
const serverProcess = await ensureLocalServer(baseUrl)
resetAuthArtifactDirectory()
const browser = await chromium.launch()

try {
  for (const persona of personas) {
    await ensurePersonaStorageState(browser, persona)
  }
} finally {
  await browser.close()

  if (serverProcess) {
    serverProcess.kill('SIGTERM')
  }
}

console.log(`Provisioned ${personas.length} stable Auth0 personas, reset platform fixtures, and saved session state.`)
