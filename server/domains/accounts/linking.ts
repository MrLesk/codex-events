import type { H3Event } from 'h3'
import type { AppDatabase } from '#server/database/client'
import type {
  CookieHandler,
  CookieSerializeOptions,
  SessionConfiguration,
  SessionStore
} from '@auth0/auth0-server-js'

import {
  CookieTransactionStore,
  ServerClient,
  StatefulStateStore,
  StatelessStateStore
} from '@auth0/auth0-server-js'
import { and, eq, isNull } from 'drizzle-orm'
import { deleteCookie, getCookie, getQuery, getRequestURL, parseCookies, setCookie } from 'h3'

import { buildAccountRegisterHref } from '#shared/domains/accounts/auth-navigation'
import { users } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'

const challengeCookieName = 'codex_platform_account_link'
const challengeLifetimeSeconds = 10 * 60
const actionResultLifetimeSeconds = 60
const linkSessionIdentifier = '__a0_platform_account_link_session'
const linkTransactionIdentifier = '__a0_platform_account_link_tx'
const accountLinkClaimNamespace = 'https://codex-events/account_linking'
export const linkedAuth0SubjectsClaim = `${accountLinkClaimNamespace}/auth0_subjects`
const textEncoder = new TextEncoder()

export interface PlatformAccountLinkChallenge {
  primaryAuth0Subject: string
  secondaryAuth0Subject: string
  email: string
  actionState: string
  continueUri: string
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
  domain: string
  clientId: string
  clientSecret: string
  sessionSecret: string
  audience?: string
  sessionConfiguration?: SessionConfiguration
}

interface PlatformAccountLinkChallengeResult {
  ok: boolean
  reason?: PlatformAccountLinkChallengeStatus
  challenge?: PlatformAccountLinkChallenge
}

export interface LinkablePlatformAccountIdentity {
  userId: string
  email: string
  primaryAuth0Subject: string
}

interface PlatformAccountLinkActionPayload {
  primaryAuth0Subject: string
  secondaryAuth0Subject: string
  email: string
  continueUri: string
}

interface PlatformAccountLinkSessionLike {
  user?: {
    sub?: string | null
  } | null
}

interface PlatformAccountLinkAuth0StoreOptions {
  event: H3Event
}

type PlatformAccountLinkStateStore
  = StatefulStateStore<PlatformAccountLinkAuth0StoreOptions>
    | StatelessStateStore<PlatformAccountLinkAuth0StoreOptions>

type RequestScopedPlatformAccountLinkAuth0Context = H3Event['context'] & {
  auth0ClientOptions?: {
    domain?: string
    clientId?: string
    clientSecret?: string
    appBaseUrl?: string
    audience?: string
    sessionSecret?: string
    sessionConfiguration?: SessionConfiguration
  }
  auth0SessionStore?: SessionStore<PlatformAccountLinkAuth0StoreOptions>
  platformAccountLinkAuth0Client?: ServerClient<PlatformAccountLinkAuth0StoreOptions>
  platformAccountLinkStateStore?: PlatformAccountLinkStateStore
  platformAccountLinkTransactionStore?: CookieTransactionStore<PlatformAccountLinkAuth0StoreOptions>
}

class H3PlatformAccountLinkCookieHandler implements CookieHandler<PlatformAccountLinkAuth0StoreOptions> {
  setCookie(name: string, value: string, options?: CookieSerializeOptions, storeOptions?: PlatformAccountLinkAuth0StoreOptions) {
    if (!storeOptions?.event) {
      throw new Error('Store options with an event are required to set a cookie.')
    }

    setCookie(storeOptions.event, name, value, options)
  }

  getCookie(name: string, storeOptions?: PlatformAccountLinkAuth0StoreOptions) {
    if (!storeOptions?.event) {
      throw new Error('Store options with an event are required to get a cookie.')
    }

    return getCookie(storeOptions.event, name)
  }

  getCookies(storeOptions?: PlatformAccountLinkAuth0StoreOptions) {
    if (!storeOptions?.event) {
      throw new Error('Store options with an event are required to get cookies.')
    }

    return parseCookies(storeOptions.event)
  }

  deleteCookie(name: string, storeOptions?: PlatformAccountLinkAuth0StoreOptions) {
    if (!storeOptions?.event) {
      throw new Error('Store options with an event are required to delete a cookie.')
    }

    deleteCookie(storeOptions.event, name)
  }
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
  const runtimeAuth0Config = useRuntimeConfig(event).auth0 as Record<string, string | SessionConfiguration | undefined>
  const auth0ClientOptions = (event.context as RequestScopedPlatformAccountLinkAuth0Context).auth0ClientOptions
  const auth0Config = (
    auth0ClientOptions
      ? { ...runtimeAuth0Config, ...auth0ClientOptions }
      : runtimeAuth0Config
  ) as Record<string, string | SessionConfiguration | undefined>
  const appBaseUrl = typeof auth0Config.appBaseUrl === 'string' ? auth0Config.appBaseUrl.trim() : ''
  const databaseConnectionName = typeof auth0Config.databaseConnectionName === 'string'
    ? auth0Config.databaseConnectionName.trim()
    : ''
  const domain = typeof auth0Config.domain === 'string' ? auth0Config.domain.trim() : ''
  const clientId = typeof auth0Config.clientId === 'string' ? auth0Config.clientId.trim() : ''
  const clientSecret = typeof auth0Config.clientSecret === 'string' ? auth0Config.clientSecret.trim() : ''
  const sessionSecret = typeof auth0Config.sessionSecret === 'string' ? auth0Config.sessionSecret.trim() : ''

  if (!appBaseUrl || !databaseConnectionName || !domain || !clientId || !clientSecret || !sessionSecret) {
    throw buildAccountLinkError('Account linking is not configured correctly yet. Sign in with your existing password instead.')
  }

  return {
    ...readBaseConfig(event),
    appBaseUrl,
    databaseConnectionName,
    domain,
    clientId,
    clientSecret,
    sessionSecret,
    audience: typeof auth0Config.audience === 'string' ? auth0Config.audience.trim() || undefined : undefined,
    sessionConfiguration: typeof auth0Config.sessionConfiguration === 'object' && auth0Config.sessionConfiguration
      ? auth0Config.sessionConfiguration as SessionConfiguration
      : undefined
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

function encodeJsonToBase64Url(value: unknown) {
  return bytesToBase64Url(textEncoder.encode(JSON.stringify(value)))
}

function decodeBase64UrlJson(value: string) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as Record<string, unknown>
}

async function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = encodeJsonToBase64Url({
    alg: 'HS256',
    typ: 'JWT'
  })
  const encodedPayload = encodeJsonToBase64Url(payload)
  const signingInput = `${header}.${encodedPayload}`
  const signature = await signChallengePayload(signingInput, secret)

  return `${signingInput}.${signature}`
}

async function verifyJwtPayload(token: string, secret: string) {
  const parts = token.split('.')

  if (parts.length !== 3) {
    throw buildAccountLinkError('The account-linking request could not be verified.')
  }

  const [encodedHeader, encodedPayload, signature] = parts

  if (!encodedHeader || !encodedPayload || !signature) {
    throw buildAccountLinkError('The account-linking request could not be verified.')
  }

  let header: Record<string, unknown>
  let payload: Record<string, unknown>

  try {
    header = decodeBase64UrlJson(encodedHeader)
    payload = decodeBase64UrlJson(encodedPayload)
  } catch {
    throw buildAccountLinkError('The account-linking request could not be verified.')
  }

  if (header.alg !== 'HS256') {
    throw buildAccountLinkError('The account-linking request could not be verified.')
  }

  const isValid = await verifyChallengePayload(`${encodedHeader}.${encodedPayload}`, signature, secret)

  if (!isValid) {
    throw buildAccountLinkError('The account-linking request could not be verified.')
  }

  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    throw buildAccountLinkError('The account-linking request expired.')
  }

  return payload
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
      || typeof parsed.actionState !== 'string'
      || typeof parsed.continueUri !== 'string'
      || typeof parsed.expiresAt !== 'string'
    ) {
      return null
    }

    return {
      primaryAuth0Subject: parsed.primaryAuth0Subject,
      secondaryAuth0Subject: parsed.secondaryAuth0Subject,
      email: parsed.email,
      actionState: parsed.actionState,
      continueUri: parsed.continueUri,
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

function getPlatformAccountLinkAuth0Client(event: H3Event) {
  const context = event.context as RequestScopedPlatformAccountLinkAuth0Context

  if (
    context.platformAccountLinkAuth0Client
    && context.platformAccountLinkStateStore
    && context.platformAccountLinkTransactionStore
  ) {
    return {
      client: context.platformAccountLinkAuth0Client,
      stateStore: context.platformAccountLinkStateStore,
      transactionStore: context.platformAccountLinkTransactionStore
    }
  }

  const loginConfig = readLoginConfig(event)
  const cookieHandler = new H3PlatformAccountLinkCookieHandler()
  const transactionStore = new CookieTransactionStore<PlatformAccountLinkAuth0StoreOptions>(
    { secret: loginConfig.sessionSecret },
    cookieHandler
  )
  const stateStore: PlatformAccountLinkStateStore = context.auth0SessionStore
    ? new StatefulStateStore<PlatformAccountLinkAuth0StoreOptions>({
        ...(loginConfig.sessionConfiguration ?? {}),
        secret: loginConfig.sessionSecret,
        store: context.auth0SessionStore
      }, cookieHandler)
    : new StatelessStateStore<PlatformAccountLinkAuth0StoreOptions>({
        ...(loginConfig.sessionConfiguration ?? {}),
        secret: loginConfig.sessionSecret
      }, cookieHandler)
  const client = new ServerClient<PlatformAccountLinkAuth0StoreOptions>({
    domain: loginConfig.domain,
    clientId: loginConfig.clientId,
    clientSecret: loginConfig.clientSecret,
    authorizationParams: {
      audience: loginConfig.audience,
      redirect_uri: getPlatformAccountLinkCallbackUrl(event)
    },
    transactionIdentifier: linkTransactionIdentifier,
    stateIdentifier: linkSessionIdentifier,
    transactionStore,
    stateStore
  })

  context.platformAccountLinkAuth0Client = client
  context.platformAccountLinkStateStore = stateStore
  context.platformAccountLinkTransactionStore = transactionStore

  return {
    client,
    stateStore,
    transactionStore
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

export async function issuePlatformAccountLinkChallenge(
  event: H3Event,
  input: {
    primaryAuth0Subject: string
    secondaryAuth0Subject: string
    email: string
    actionState: string
    continueUri: string
  }
) {
  const config = readBaseConfig(event)
  const challenge: PlatformAccountLinkChallenge = {
    primaryAuth0Subject: input.primaryAuth0Subject,
    secondaryAuth0Subject: input.secondaryAuth0Subject,
    email: input.email,
    actionState: input.actionState,
    continueUri: input.continueUri,
    expiresAt: new Date(Date.now() + challengeLifetimeSeconds * 1000).toISOString()
  }
  const payload = serializeChallenge(challenge)
  const signature = await signChallengePayload(payload, config.challengeSecret)

  setCookie(event, challengeCookieName, `${payload}.${signature}`, buildCookieOptions(event))

  return challenge
}

function readRequiredString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeContinueUri(value: string) {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw buildAccountLinkError('The account-linking continuation target is invalid.')
  }

  if (url.protocol !== 'https:' || url.pathname !== '/continue') {
    throw buildAccountLinkError('The account-linking continuation target is invalid.')
  }

  return url.toString()
}

async function readPlatformAccountLinkActionPayload(event: H3Event): Promise<PlatformAccountLinkActionPayload> {
  const config = readBaseConfig(event)
  const query = getQuery(event)
  const sessionToken = readRequiredString(query.session_token)
  const actionState = readRequiredString(query.state)

  if (!sessionToken || !actionState) {
    throw buildAccountLinkError('The account-linking request is missing required Auth0 state.')
  }

  const payload = await verifyJwtPayload(sessionToken, config.challengeSecret)
  const primaryAuth0Subject = readRequiredString(payload.primary_user_id)
  const secondaryAuth0Subject = readRequiredString(payload.secondary_user_id)
  const email = readRequiredString(payload.primary_email)
  const continueUri = normalizeContinueUri(readRequiredString(payload.continue_uri))
  const tokenSubject = readRequiredString(payload.sub)

  if (
    !primaryAuth0Subject
    || !secondaryAuth0Subject
    || !email
    || !continueUri
    || tokenSubject !== secondaryAuth0Subject
  ) {
    throw buildAccountLinkError('The account-linking request could not be verified.')
  }

  return {
    primaryAuth0Subject,
    secondaryAuth0Subject,
    email,
    continueUri
  }
}

export async function issuePlatformAccountLinkActionChallenge(event: H3Event) {
  const query = getQuery(event)
  const actionState = readRequiredString(query.state)
  const payload = await readPlatformAccountLinkActionPayload(event)

  return await issuePlatformAccountLinkChallenge(event, {
    ...payload,
    actionState
  })
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

export async function startPlatformAccountLinkAuthentication(event: H3Event, email: string) {
  const { client } = getPlatformAccountLinkAuth0Client(event)

  return await client.startInteractiveLogin({
    authorizationParams: {
      connection: getPlatformAccountLinkDatabaseConnectionName(event),
      prompt: 'login',
      login_hint: email,
      redirect_uri: getPlatformAccountLinkCallbackUrl(event)
    }
  }, {
    event
  })
}

export async function completePlatformAccountLinkAuthentication(event: H3Event) {
  const { client } = getPlatformAccountLinkAuth0Client(event)

  await client.completeInteractiveLogin(
    new URL(event.node.req.url as string, readLoginConfig(event).appBaseUrl),
    { event }
  )
}

export async function readPlatformAccountLinkAuthenticatedSubject(event: H3Event) {
  const { client } = getPlatformAccountLinkAuth0Client(event)
  const session = await client.getSession({ event }) as PlatformAccountLinkSessionLike | undefined

  return session?.user?.sub?.trim() ?? ''
}

export async function clearPlatformAccountLinkAuthentication(event: H3Event) {
  const { stateStore, transactionStore } = getPlatformAccountLinkAuth0Client(event)

  await Promise.all([
    stateStore.delete(linkSessionIdentifier, { event }),
    transactionStore.delete(linkTransactionIdentifier, { event })
  ])
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

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

async function buildPlatformAccountLinkActionResultToken(
  event: H3Event,
  challenge: PlatformAccountLinkChallenge,
  options: {
    ok: boolean
    reason?: PlatformAccountLinkErrorReason
  }
) {
  const config = readBaseConfig(event)
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = {
    sub: challenge.secondaryAuth0Subject,
    iss: readLoginConfig(event).appBaseUrl,
    aud: challenge.continueUri,
    iat: issuedAt,
    exp: issuedAt + actionResultLifetimeSeconds,
    state: challenge.actionState,
    result: options.ok ? 'link_verified' : 'link_failed',
    error: options.reason,
    primary_user_id: challenge.primaryAuth0Subject,
    secondary_user_id: challenge.secondaryAuth0Subject
  }

  return await signJwt(payload, config.challengeSecret)
}

export async function buildPlatformAccountLinkActionContinueResponse(
  event: H3Event,
  challenge: PlatformAccountLinkChallenge,
  options: {
    ok: boolean
    reason?: PlatformAccountLinkErrorReason
  }
) {
  const sessionToken = await buildPlatformAccountLinkActionResultToken(event, challenge, options)

  return [
    '<!doctype html>',
    '<html>',
    '  <head><meta charset="utf-8"><title>Continue sign-in</title></head>',
    '  <body>',
    `    <form method="post" action="${escapeHtmlAttribute(challenge.continueUri)}">`,
    `      <input type="hidden" name="state" value="${escapeHtmlAttribute(challenge.actionState)}">`,
    `      <input type="hidden" name="session_token" value="${escapeHtmlAttribute(sessionToken)}">`,
    '      <button type="submit">Continue</button>',
    '    </form>',
    '    <script>document.forms[0].submit();</script>',
    '  </body>',
    '</html>'
  ].join('\n')
}

export function getPlatformAccountLinkDatabaseConnectionName(event: H3Event) {
  return readLoginConfig(event).databaseConnectionName
}

export function getPlatformAccountLinkCallbackUrl(event: H3Event) {
  return new URL('/auth/link/callback', `${readLoginConfig(event).appBaseUrl}/`).toString()
}
