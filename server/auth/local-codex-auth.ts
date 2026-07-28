import type { H3Event } from 'h3'
import type { spawn as nodeSpawn } from 'node:child_process'

import { createError, deleteCookie, getCookie, setCookie } from 'h3'

const localCodexAuthCookieName = 'codex-events-local-user'

export interface LocalCodexUser {
  sub: string
  email: string
  email_verified: true
  name: null
  nickname: null
  picture: null
}

interface LocalCodexAuthDependencies {
  spawn?: typeof nodeSpawn
}

const accountReadErrorMessage = 'Codex Events could not read your ChatGPT account. Run `codex login` and try again.'
let activeCodexAuthentication: Promise<LocalCodexUser> | null = null

function buildLocalCodexUser(email: string): LocalCodexUser | null {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return null
  }

  return {
    sub: `local-chatgpt|${normalizedEmail}`,
    email: normalizedEmail,
    email_verified: true,
    name: null,
    nickname: null,
    picture: null
  }
}

export function readLocalCodexUser(event: H3Event) {
  const email = getCookie(event, localCodexAuthCookieName)

  return email ? buildLocalCodexUser(email) : null
}

export function setLocalCodexUser(event: H3Event, email: string) {
  const user = buildLocalCodexUser(email)

  if (!user) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Codex Events could not read your ChatGPT email.'
    })
  }

  setCookie(event, localCodexAuthCookieName, user.email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/'
  })

  return user
}

export function clearLocalCodexUser(event: H3Event) {
  deleteCookie(event, localCodexAuthCookieName, {
    path: '/'
  })
}

async function runCodexLogin(spawn: typeof nodeSpawn) {
  await new Promise<void>((resolve, reject) => {
    const process = spawn('codex', ['login'], {
      stdio: 'ignore'
    })

    process.once('error', (error: NodeJS.ErrnoException) => {
      reject(createError({
        statusCode: 503,
        statusMessage: error.code === 'ENOENT'
          ? 'Codex CLI is required for local sign-in. Install Codex and try again.'
          : 'Codex sign-in was cancelled or failed. Try again.'
      }))
    })
    process.once('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(createError({
        statusCode: 503,
        statusMessage: 'Codex sign-in was cancelled or failed. Try again.'
      }))
    })
  })
}

async function readCodexAccount(spawn: typeof nodeSpawn) {
  return await new Promise<LocalCodexUser>((resolve, reject) => {
    const process = spawn('codex', ['app-server', '--stdio'], {
      stdio: ['pipe', 'pipe', 'ignore']
    })
    let buffer = ''
    let finished = false
    const timeout = setTimeout(() => finish(), 10_000)

    function finish(user?: LocalCodexUser) {
      if (finished) {
        return
      }

      finished = true
      clearTimeout(timeout)
      process.kill()

      if (user) {
        resolve(user)
        return
      }

      reject(createError({
        statusCode: 503,
        statusMessage: accountReadErrorMessage
      }))
    }

    process.once('error', () => finish())
    process.once('close', () => finish())
    process.stdout.on('data', (chunk) => {
      buffer += chunk.toString()

      while (buffer.includes('\n')) {
        const lineEnd = buffer.indexOf('\n')
        const line = buffer.slice(0, lineEnd)
        buffer = buffer.slice(lineEnd + 1)

        if (!line.trim()) {
          continue
        }

        let message: {
          id?: number
          result?: {
            account?: {
              type?: string
              email?: string | null
            } | null
          }
        }

        try {
          message = JSON.parse(line)
        } catch {
          finish()
          return
        }

        if (message.id === 1) {
          process.stdin.write(`${JSON.stringify({
            method: 'initialized',
            params: {}
          })}\n`)
          process.stdin.write(`${JSON.stringify({
            id: 2,
            method: 'account/read',
            params: {
              refreshToken: false
            }
          })}\n`)
          continue
        }

        if (message.id !== 2) {
          continue
        }

        const account = message.result?.account
        const user = account?.type === 'chatgpt' && account.email
          ? buildLocalCodexUser(account.email)
          : null

        finish(user ?? undefined)
      }
    })

    process.stdin.write(`${JSON.stringify({
      id: 1,
      method: 'initialize',
      params: {
        clientInfo: {
          name: 'codex-events',
          title: 'Codex Events',
          version: '1'
        }
      }
    })}\n`)
  })
}

async function startCodexAuthentication(
  dependencies: LocalCodexAuthDependencies = {}
) {
  const spawn = dependencies.spawn ?? (await import('node:child_process')).spawn

  await runCodexLogin(spawn)
  return await readCodexAccount(spawn)
}

export async function authenticateWithCodex(
  dependencies: LocalCodexAuthDependencies = {}
) {
  const authentication = activeCodexAuthentication
    ??= startCodexAuthentication(dependencies)

  try {
    return await authentication
  } finally {
    if (activeCodexAuthentication === authentication) {
      activeCodexAuthentication = null
    }
  }
}
