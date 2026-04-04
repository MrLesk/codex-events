import 'dotenv/config'

import { existsSync } from 'node:fs'
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { join } from 'node:path'
import { chromium, type Browser } from '@playwright/test'

import { ensureStableAuth0Personas } from './support/auth0-management.ts'
import {
  getBaseUrl,
  resetAuthArtifactDirectory,
  storageStatePathForPersona,
  type StablePersona
} from './support/personas.ts'
import { applyLocalBddD1StateRoot } from './support/local-d1-state.ts'
import { resetPlatformFixtures } from './support/platform-fixtures.ts'
import { loginAndPersistStorageState } from './support/session-state.ts'

applyLocalBddD1StateRoot()

async function sleep(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const serverHealthTimeoutMilliseconds = 5_000
const serverStartupCheckLimit = 24

async function isServerReachable(baseUrl: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), serverHealthTimeoutMilliseconds)

  try {
    const response = await fetch(baseUrl, {
      redirect: 'manual',
      signal: controller.signal
    })

    return response.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
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

function appendServerOutput(buffer: string, chunk: string | Buffer) {
  const nextBuffer = `${buffer}${chunk.toString()}`
  return nextBuffer.slice(-8_000)
}

function captureServerOutput(child: ChildProcessWithoutNullStreams) {
  let stdoutBuffer = ''
  let stderrBuffer = ''

  child.stdout.on('data', (chunk) => {
    stdoutBuffer = appendServerOutput(stdoutBuffer, chunk)
  })
  child.stderr.on('data', (chunk) => {
    stderrBuffer = appendServerOutput(stderrBuffer, chunk)
  })

  return () => {
    return [stdoutBuffer.trim(), stderrBuffer.trim()].filter(Boolean).join('\n')
  }
}

async function ensureLocalServer(baseUrl: string) {
  await stopExistingServer(baseUrl)

  const { hostname, port } = new URL(baseUrl)
  console.log(`Starting local Nuxt dev server at ${baseUrl}.`)
  const child = spawn(join(process.cwd(), 'node_modules/.bin/nuxt'), ['dev', '--host', hostname, '--port', port || '3000'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NUXT_AUTH0_APP_BASE_URL: baseUrl
    }
  })
  const readCapturedOutput = captureServerOutput(child)

  for (let attempt = 0; attempt < serverStartupCheckLimit; attempt += 1) {
    if (child.exitCode !== null) {
      const capturedOutput = readCapturedOutput()
      throw new Error(`Local Nuxt dev server exited early with code ${child.exitCode}.${capturedOutput ? `\n${capturedOutput}` : ''}`)
    }

    if (await isServerReachable(baseUrl)) {
      console.log(`Local Nuxt dev server responded at ${baseUrl}.`)
      return child
    }

    if ((attempt + 1) % 4 === 0) {
      console.log(`Waiting for local Nuxt dev server at ${baseUrl} (${attempt + 1}/${serverStartupCheckLimit} checks).`)
    }

    await sleep(500)
  }

  child.kill('SIGTERM')
  const capturedOutput = readCapturedOutput()
  throw new Error(`Timed out waiting for local Nuxt dev server at ${baseUrl}.${capturedOutput ? `\n${capturedOutput}` : ''}`)
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
console.log('Reconciling stable Auth0 personas.')
const personas = await ensureStableAuth0Personas()
console.log('Resetting platform fixtures.')
await resetPlatformFixtures(personas)
const serverProcess = await ensureLocalServer(baseUrl)
console.log('Launching browser for Auth0 session bootstrap.')
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
