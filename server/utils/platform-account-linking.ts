import type { H3Event } from 'h3'
import type { AppDatabase } from '../database/client'

import { and, eq, isNull } from 'drizzle-orm'
import { deleteCookie, getCookie, getRequestURL, setCookie } from 'h3'

import { accountDashboardHref, buildAccountRegisterHref, normalizeAuthReturnTo } from '../../app/utils/auth-navigation'
import { users } from '../database/schema'
import { ApiError } from './api-error'

const challengeCookieName = 'codex_platform_account_link'
const challengeLifetimeSeconds = 10 * 60
const textEncoder = new TextEncoder()

export interface PlatformAccountLinkChallenge {
  primaryAuth0Subject: string
  secondaryAuth0Subject: string
  email: string
  returnTo: string
  expiresAt: string
}

type PlatformAccountLinkChallengeStatus = 'missing' | 'invalid' | 'expired'
type PlatformAccountLinkErrorReason = 'expired' | 'invalid' | 'login_failed' | 'mismatch' | 'failed'

interface PlatformAccountLinkConfig {
  challengeSecret: string
}

interface PlatformAccountLinkLoginConfig extends PlatformAccountLinkConfig {
  databaseConnectionName: string
  appBaseUrl: string
}

interface PlatformAccountLinkManagementConfig {
  managementDomain: string
  managementClientId: string
  managementClientSecret: string
  managementAudience: string
}

interface PlatformAccountLinkChallengeResult {
  ok: boolean
  reason?: PlatformAccountLinkChallengeStatus
  challenge?: PlatformAccountLinkChallenge
}

export interface PlatformAccountLinkState {
  required: true
  email: string
  linkLoginHref: '/auth/link/login'
}

export interface LinkablePlatformAccountIdentity {
  userId: string
  email: string
  primaryAuth0Subject: string
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlToBytes(value: string) {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function normalizeDomain(domain: string) {
  return domain.startsWith('http://') || domain.startsWith('https://')
    ? domain
    : `https://${domain}`
}

function buildAccountLinkError(message: string) {
  return new ApiError({
    statusCode: 500,
    code: 'platform_account_linking_unavailable',
    message
  })
}

function readBaseConfig(event: H3Event): PlatformAccountLinkConfig {
  const auth0Config = useRuntimeConfig(event).auth0 as Record<string, string | undefined>
  const challengeSecret = auth0Config.accountLinkChallengeSecret?.trim() ?? ''

  if (!challengeSecret) {
    throw buildAccountLinkError('This login method cannot be linked right now. Sign in with your existing password instead.')
  }

  return {
    challengeSecret
  }
}

function readLoginConfig(event: H3Event): PlatformAccountLinkLoginConfig {
  const auth0Config = useRuntimeConfig(event).auth0 as Record<string, string | undefined>
  const appBaseUrl = auth0Config.appBaseUrl?.trim() ?? ''
  const databaseConnectionName = auth0Config.databaseConnectionName?.trim() ?? ''

  if (!appBaseUrl || !databaseConnectionName) {
    throw buildAccountLinkError('Account linking is not configured correctly yet. Sign in with your existing password instead.')
  }

  return {
    ...readBaseConfig(event),
    appBaseUrl,
    databaseConnectionName
  }
}

function readManagementConfig(event: H3Event): PlatformAccountLinkManagementConfig {
  const auth0Config = useRuntimeConfig(event).auth0 as Record<string, string | undefined>
  const managementDomain = auth0Config.managementDomain?.trim() ?? ''
  const managementClientId = auth0Config.managementClientId?.trim() ?? ''
  const managementClientSecret = auth0Config.managementClientSecret?.trim() ?? ''

  if (!managementDomain || !managementClientId || !managementClientSecret) {
    throw buildAccountLinkError('Account linking is not configured correctly yet. Sign in with your existing password instead.')
  }

  return {
    managementDomain,
    managementClientId,
    managementClientSecret,
    managementAudience: auth0Config.managementAudience?.trim() || `${normalizeDomain(managementDomain)}/api/v2/`
  }
}

async function importHmacKey(secret: string, usage: 'sign' | 'verify') {
  return await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  )
}

async function signChallengePayload(payload: string, secret: string) {
  const key = await importHmacKey(secret, 'sign')
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload))

  return bytesToBase64Url(new Uint8Array(signature))
}

async function verifyChallengePayload(payload: string, signature: string, secret: string) {
  const key = await importHmacKey(secret, 'verify')
  return await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlToBytes(signature),
    textEncoder.encode(payload)
  )
}

function serializeChallenge(challenge: PlatformAccountLinkChallenge) {
  return bytesToBase64Url(textEncoder.encode(JSON.stringify(challenge)))
}

function deserializeChallenge(value: string): PlatformAccountLinkChallenge | null {
  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(value))
    const parsed = JSON.parse(decoded) as Partial<PlatformAccountLinkChallenge>

    if (
      typeof parsed.primaryAuth0Subject !== 'string'
      || typeof parsed.secondaryAuth0Subject !== 'string'
      || typeof parsed.email !== 'string'
      || typeof parsed.returnTo !== 'string'
      || typeof parsed.expiresAt !== 'string'
    ) {
      return null
    }

    return {
      primaryAuth0Subject: parsed.primaryAuth0Subject,
      secondaryAuth0Subject: parsed.secondaryAuth0Subject,
      email: parsed.email,
      returnTo: normalizeAuthReturnTo(parsed.returnTo, accountDashboardHref),
      expiresAt: parsed.expiresAt
    }
  } catch {
    return null
  }
}

function buildCookieOptions(event: H3Event) {
  const protocol = getRequestURL(event).protocol

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: protocol === 'https:',
    path: '/',
    maxAge: challengeLifetimeSeconds
  }
}

export function isVerifiedSocialIdentityLinkCandidate(options: {
  currentAuth0Subject: string
  currentIdentityEmailVerified: boolean
  existingPlatformAuth0Subject: string
}) {
  return options.currentIdentityEmailVerified
    && !options.currentAuth0Subject.startsWith('auth0|')
    && options.existingPlatformAuth0Subject.startsWith('auth0|')
}

export function serializePlatformAccountLinkState(candidate: LinkablePlatformAccountIdentity): PlatformAccountLinkState {
  return {
    required: true,
    email: candidate.email,
    linkLoginHref: '/auth/link/login'
  }
}

export async function findLinkablePlatformAccountIdentity(
  database: AppDatabase,
  sessionUser: {
    sub: string
    email?: string | null
    email_verified?: boolean | null
  }
) {
  const email = sessionUser.email?.trim()

  if (!email) {
    return null
  }

  const existingPlatformAccount = await database.query.users.findFirst({
    where: and(
      eq(users.email, email),
      isNull(users.deletedAt)
    )
  })

  if (
    !existingPlatformAccount
    || !isVerifiedSocialIdentityLinkCandidate({
      currentAuth0Subject: sessionUser.sub,
      currentIdentityEmailVerified: sessionUser.email_verified === true,
      existingPlatformAuth0Subject: existingPlatformAccount.auth0Subject
    })
  ) {
    return null
  }

  return {
    userId: existingPlatformAccount.id,
    email,
    primaryAuth0Subject: existingPlatformAccount.auth0Subject
  } satisfies LinkablePlatformAccountIdentity
}

export function parseAuth0IdentitySubject(subject: string) {
  const separatorIndex = subject.indexOf('|')

  if (separatorIndex <= 0 || separatorIndex === subject.length - 1) {
    return null
  }

  return {
    provider: subject.slice(0, separatorIndex),
    userId: subject.slice(separatorIndex + 1)
  }
}

export async function issuePlatformAccountLinkChallenge(
  event: H3Event,
  input: {
    primaryAuth0Subject: string
    secondaryAuth0Subject: string
    email: string
    returnTo: string | null | undefined
  }
) {
  const config = readBaseConfig(event)
  const challenge: PlatformAccountLinkChallenge = {
    primaryAuth0Subject: input.primaryAuth0Subject,
    secondaryAuth0Subject: input.secondaryAuth0Subject,
    email: input.email,
    returnTo: normalizeAuthReturnTo(input.returnTo, accountDashboardHref),
    expiresAt: new Date(Date.now() + challengeLifetimeSeconds * 1000).toISOString()
  }
  const payload = serializeChallenge(challenge)
  const signature = await signChallengePayload(payload, config.challengeSecret)

  setCookie(event, challengeCookieName, `${payload}.${signature}`, buildCookieOptions(event))

  return challenge
}

export async function readPlatformAccountLinkChallenge(event: H3Event): Promise<PlatformAccountLinkChallengeResult> {
  const config = readBaseConfig(event)
  const token = getCookie(event, challengeCookieName)

  if (!token) {
    return { ok: false, reason: 'missing' }
  }

  const separatorIndex = token.lastIndexOf('.')

  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    return { ok: false, reason: 'invalid' }
  }

  const payload = token.slice(0, separatorIndex)
  const signature = token.slice(separatorIndex + 1)
  const isValid = await verifyChallengePayload(payload, signature, config.challengeSecret)

  if (!isValid) {
    return { ok: false, reason: 'invalid' }
  }

  const challenge = deserializeChallenge(payload)

  if (!challenge) {
    return { ok: false, reason: 'invalid' }
  }

  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' }
  }

  return {
    ok: true,
    challenge
  }
}

export function clearPlatformAccountLinkChallenge(event: H3Event) {
  deleteCookie(event, challengeCookieName, {
    ...buildCookieOptions(event),
    maxAge: 0
  })
}

export function buildPlatformAccountLinkRedirect(returnTo: string | null | undefined, reason?: PlatformAccountLinkErrorReason) {
  const registerHref = buildAccountRegisterHref(returnTo)

  if (!reason) {
    return registerHref
  }

  const url = new URL(registerHref, 'http://localhost')
  url.searchParams.set('linkingError', reason)
  return `${url.pathname}${url.search}`
}

async function getManagementAccessToken(config: PlatformAccountLinkManagementConfig) {
  const response = await fetch(`${normalizeDomain(config.managementDomain)}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.managementClientId,
      client_secret: config.managementClientSecret,
      audience: config.managementAudience
    })
  })

  if (!response.ok) {
    const reason = await response.text()
    throw buildAccountLinkError(`Auth0 management token request failed: ${reason}`)
  }

  const payload = await response.json() as { access_token?: string }

  if (!payload.access_token) {
    throw buildAccountLinkError('Auth0 management token response did not include an access token.')
  }

  return payload.access_token
}

export async function linkPlatformAccountIdentity(
  event: H3Event,
  primaryAuth0Subject: string,
  secondaryAuth0Subject: string
) {
  const config = readManagementConfig(event)
  const secondaryIdentity = parseAuth0IdentitySubject(secondaryAuth0Subject)

  if (!secondaryIdentity) {
    throw buildAccountLinkError('The login identity could not be linked because its Auth0 identifier is invalid.')
  }

  const token = await getManagementAccessToken(config)
  const response = await fetch(
    `${normalizeDomain(config.managementDomain)}/api/v2/users/${encodeURIComponent(primaryAuth0Subject)}/identities`,
    {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        provider: secondaryIdentity.provider,
        user_id: secondaryIdentity.userId
      })
    }
  )

  if (!response.ok) {
    const reason = await response.text()
    throw buildAccountLinkError(`Auth0 identity link request failed: ${reason}`)
  }
}

export function getPlatformAccountLinkDatabaseConnectionName(event: H3Event) {
  return readLoginConfig(event).databaseConnectionName
}

export function getPlatformAccountLinkCallbackUrl(event: H3Event) {
  return new URL('/auth/link/callback', `${readLoginConfig(event).appBaseUrl}/`).toString()
}
