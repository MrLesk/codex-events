import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'

import { createApp, defineEventHandler, toWebHandler } from 'h3'
import { describe, expect, test, vi } from 'vitest'

import {
  authenticateWithCodex,
  clearLocalCodexUser,
  readLocalCodexUser,
  setLocalCodexUser
} from '../../../../server/auth/local-codex-auth'

function createProcess() {
  const process = new EventEmitter() as EventEmitter & {
    stdin: PassThrough
    stdout: PassThrough
    kill: ReturnType<typeof vi.fn>
  }

  process.stdin = new PassThrough()
  process.stdout = new PassThrough()
  process.kill = vi.fn()

  return process
}

function createSuccessfulSpawn(email: string | null) {
  const loginProcess = createProcess()
  const appServerProcess = createProcess()
  const appServerRequests: Array<{
    id?: number
    method?: string
    params?: Record<string, unknown>
  }> = []
  const spawn = vi.fn()
    .mockImplementationOnce(() => {
      queueMicrotask(() => loginProcess.emit('close', 0))
      return loginProcess
    })
    .mockImplementationOnce(() => {
      appServerProcess.stdin.on('data', (chunk) => {
        for (const line of chunk.toString().trim().split('\n')) {
          const message = JSON.parse(line) as {
            id?: number
            method?: string
            params?: Record<string, unknown>
          }

          appServerRequests.push(message)

          if (message.id === 1) {
            appServerProcess.stdout.write(`${JSON.stringify({
              id: 1,
              result: {}
            })}\n`)
          }

          if (message.id === 2) {
            appServerProcess.stdout.write(`${JSON.stringify({
              id: 2,
              result: {
                account: {
                  type: 'chatgpt',
                  email,
                  planType: 'pro'
                },
                requiresOpenaiAuth: true
              }
            })}\n`)
          }
        }
      })

      return appServerProcess
    })

  return {
    spawn,
    appServerProcess,
    appServerRequests
  }
}

function createHandler() {
  const app = createApp()

  app.use('/session', defineEventHandler((event) => {
    if (event.method === 'POST') {
      return setLocalCodexUser(event, ' Developer@Example.COM ')
    }

    if (event.method === 'DELETE') {
      clearLocalCodexUser(event)
      return null
    }

    return readLocalCodexUser(event)
  }))

  return toWebHandler(app)
}

describe('local Codex auth session', () => {
  test('stores a normalized local user in an HTTP-only cookie', async () => {
    const response = await createHandler()(new Request('http://localhost/session', {
      method: 'POST'
    }))

    expect(await response.json()).toEqual({
      sub: 'local-chatgpt|developer@example.com',
      email: 'developer@example.com',
      email_verified: true,
      name: null,
      nickname: null,
      picture: null
    })
    expect(response.headers.get('set-cookie')).toContain('codex-events-local-user=developer%40example.com')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax')
  })

  test('reads and clears the local user cookie', async () => {
    const handler = createHandler()
    const cookie = 'codex-events-local-user=developer%40example.com'
    const readResponse = await handler(new Request('http://localhost/session', {
      headers: { cookie }
    }))
    const clearResponse = await handler(new Request('http://localhost/session', {
      method: 'DELETE',
      headers: { cookie }
    }))

    expect(await readResponse.json()).toMatchObject({
      sub: 'local-chatgpt|developer@example.com',
      email: 'developer@example.com',
      email_verified: true
    })
    expect(clearResponse.headers.get('set-cookie')).toContain('codex-events-local-user=')
    expect(clearResponse.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  test('returns no local user without a cookie', async () => {
    const response = await createHandler()(new Request('http://localhost/session'))

    expect(response.status).toBe(204)
  })
})

describe('Codex account authentication', () => {
  test('shares a pending sign-in attempt and allows a later retry', async () => {
    const availableProcesses = [
      createProcess(),
      createProcess(),
      createProcess()
    ]
    const spawnedProcesses: ReturnType<typeof createProcess>[] = []
    const spawn = vi.fn(() => {
      const process = availableProcesses[spawnedProcesses.length]!

      spawnedProcesses.push(process)
      return process
    })

    const firstAttempt = authenticateWithCodex({ spawn: spawn as never })
    const concurrentAttempt = authenticateWithCodex({ spawn: spawn as never })

    for (const process of spawnedProcesses) {
      process.emit('close', 1)
    }

    await Promise.allSettled([firstAttempt, concurrentAttempt])

    const laterAttempt = authenticateWithCodex({ spawn: spawn as never })
    spawnedProcesses.at(-1)!.emit('close', 1)
    await Promise.allSettled([laterAttempt])

    expect(spawn).toHaveBeenCalledTimes(2)
  })

  test('runs Codex login and returns the app-server ChatGPT email', async () => {
    const {
      spawn,
      appServerProcess,
      appServerRequests
    } = createSuccessfulSpawn(' Developer@Example.COM ')

    await expect(authenticateWithCodex({ spawn: spawn as never })).resolves.toMatchObject({
      sub: 'local-chatgpt|developer@example.com',
      email: 'developer@example.com',
      email_verified: true
    })
    expect(spawn).toHaveBeenNthCalledWith(1, 'codex', ['login'], expect.any(Object))
    expect(spawn).toHaveBeenNthCalledWith(2, 'codex', ['app-server', '--stdio'], expect.any(Object))
    expect(appServerRequests).toContainEqual({
      id: 2,
      method: 'account/read',
      params: {
        refreshToken: false
      }
    })
    expect(appServerProcess.kill).toHaveBeenCalled()
  })

  test('returns an actionable error when the Codex CLI is unavailable', async () => {
    const loginProcess = createProcess()
    const spawn = vi.fn(() => {
      queueMicrotask(() => loginProcess.emit('error', Object.assign(new Error('missing'), {
        code: 'ENOENT'
      })))
      return loginProcess
    })

    await expect(authenticateWithCodex({ spawn: spawn as never })).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Codex CLI is required for local sign-in. Install Codex and try again.'
    })
  })

  test('returns an actionable error when Codex sign-in is cancelled', async () => {
    const loginProcess = createProcess()
    const spawn = vi.fn(() => {
      queueMicrotask(() => loginProcess.emit('close', 1))
      return loginProcess
    })

    await expect(authenticateWithCodex({ spawn: spawn as never })).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Codex sign-in was cancelled or failed. Try again.'
    })
  })

  test('rejects a ChatGPT account without an email', async () => {
    const { spawn } = createSuccessfulSpawn(null)

    await expect(authenticateWithCodex({ spawn: spawn as never })).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Codex Events could not read your ChatGPT account. Run `codex login` and try again.'
    })
  })
})
