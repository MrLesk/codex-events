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
import { deleteCookie, getCookie, getRequestURL, parseCookies, setCookie } from 'h3'

import { accountDashboardHref, buildAccountRegisterHref, normalizeAuthReturnTo } from '#shared/auth-navigation'
import { users } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'

const challengeCookieName = 'codex_platform_account_link'
const challengeLifetimeSeconds = 10 * 60
const linkSessionIdentifier = '__a0_platform_account_link_session'
const linkTransactionIdentifier = '__a0_platform_account_link_tx'
const requiredLinkManagementScope = 'update:users'
const requiredLinkedIdentityReadManagementScope = 'read:users'
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
  domain: string
  clientId: string
  clientSecret: string
  sessionSecret: string
  audience?: string
  sessionConfiguration?: SessionConfiguration
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

interface PlatformAccountLinkSessionLike {
  user?: {
    sub?: string | null
  } | null
}

interface Auth0IdentityRecord {
  provider?: unknown
  user_id?: unknown
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

function normalizeDomain(domain: string) {
  return domain.startsWith('http://') || domain.startsWith('https://')
    ? domain
    : `https://${domain}`
}

function splitScopeString(value: string | undefined) {
  return (value ?? '')
    .split(/\s+/)
    .map(scope => scope.trim())
    .filter(Boolean)
}

function readJwtScopeClaims(accessToken: string) {
  const parts = accessToken.split('.')

  if (parts.length !== 3) {
    return {
      permissions: [] as string[],
      scope: ''
    }
  }

  try {
    const encodedPayload = parts[1] ?? ''
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as {
      permissions?: unknown
      scope?: unknown
    }

    return {
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.filter((permission): permission is string => typeof permission === 'string')
        : [],
      scope: typeof payload.scope === 'string' ? payload.scope : ''
    }
  } catch {
    return {
      permissions: [] as string[],
      scope: ''
    }
  }
}

function readGrantedManagementScopes(accessToken: string, responseScope?: string) {
  const jwtClaims = readJwtScopeClaims(accessToken)

  return new Set([
    ...splitScopeString(responseScope),
    ...splitScopeString(jwtClaims.scope),
    ...jwtClaims.permissions
  ])
}

function assertManagementScope(
  accessToken: string,
  responseScope: string | undefined,
  requiredScope: string,
  missingScopeMessage: string
) {
  const grantedScopes = readGrantedManagementScopes(accessToken, responseScope)

  if (!grantedScopes.has(requiredScope)) {
    throw buildAccountLinkError(missingScopeMessage)
  }
}

function serializeAuth0IdentityRecordSubject(identity: Auth0IdentityRecord) {
  return typeof identity.provider === 'string'
    && typeof identity.user_id === 'string'
    && identity.provider.trim()
    && identity.user_id.trim()
    ? `${identity.provider.trim()}|${identity.user_id.trim()}`
    : null
}

function parseAuth0IdentitySubjects(identities: unknown) {
  if (!Array.isArray(identities)) {
    return []
  }

  return identities
    .map(identity => serializeAuth0IdentityRecordSubject(identity as Auth0IdentityRecord))
    .filter((subject): subject is string => Boolean(subject))
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
  const auth0Config = (
    (event.context as RequestScopedPlatformAccountLinkAuth0Context).auth0ClientOptions
    ?? useRuntimeConfig(event).auth0
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

async function getManagementAccessToken(
  config: PlatformAccountLinkManagementConfig,
  options: {
    requiredScope: string
    missingScopeMessage: string
  }
) {
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

  const payload = await response.json() as { access_token?: string, scope?: string }

  if (!payload.access_token) {
    throw buildAccountLinkError('Auth0 management token response did not include an access token.')
  }

  assertManagementScope(
    payload.access_token,
    payload.scope,
    options.requiredScope,
    options.missingScopeMessage
  )

  return payload.access_token
}

export async function listPlatformAccountIdentitySubjects(
  event: H3Event,
  primaryAuth0Subject: string
) {
  const config = readManagementConfig(event)
  const token = await getManagementAccessToken(config, {
    requiredScope: requiredLinkedIdentityReadManagementScope,
    missingScopeMessage: 'Auth0 management token is missing the read:users scope required to reconcile linked account identities.'
  })
  const response = await fetch(
    `${normalizeDomain(config.managementDomain)}/api/v2/users/${encodeURIComponent(primaryAuth0Subject)}`,
    {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`
      }
    }
  )

  if (!response.ok) {
    const reason = await response.text()
    throw buildAccountLinkError(`Auth0 linked identity read request failed: ${reason}`)
  }

  const payload = await response.json() as { identities?: unknown }

  return Array.from(new Set([
    primaryAuth0Subject,
    ...parseAuth0IdentitySubjects(payload.identities)
  ]))
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

  const token = await getManagementAccessToken(config, {
    requiredScope: requiredLinkManagementScope,
    missingScopeMessage: 'Auth0 management token is missing the update:users scope required for account linking.'
  })
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

  const payload = await response.json() as unknown

  return Array.from(new Set([
    primaryAuth0Subject,
    ...parseAuth0IdentitySubjects(payload)
  ]))
}

export function getPlatformAccountLinkDatabaseConnectionName(event: H3Event) {
  return readLoginConfig(event).databaseConnectionName
}

export function getPlatformAccountLinkCallbackUrl(event: H3Event) {
  return new URL('/auth/link/callback', `${readLoginConfig(event).appBaseUrl}/`).toString()
}
