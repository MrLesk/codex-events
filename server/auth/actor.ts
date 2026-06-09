import type { H3Event } from 'h3'
import type { users } from '#server/database/schema'

import { getDatabase } from '#server/database/client'
import { ApiError } from '#server/http/api-error'
import {
  ensurePlatformUserAuthIdentities,
  findPlatformUserByAuth0Subject
} from '#server/domains/accounts/auth-identities'
import {
  canCreateFirstPlatformAdminSetupAccount,
  grantConfiguredFirstPlatformAdminAccess
} from '#server/domains/platform/admins'
import {
  linkedAuth0SubjectsClaim
} from '#server/domains/accounts/linking'
import { hasAcceptedCurrentPlatformDocuments } from '#server/domains/platform/documents'

interface SessionUserProfile {
  sub: string
  email?: string | null
  email_verified?: boolean | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
  githubProfileUrl?: string | null
  linkedAuth0Subjects?: string[]
  [key: string]: unknown
}

interface SessionLike {
  user?: SessionUserProfile | null
}

interface Auth0UserInfoProfile {
  sub?: unknown
  email?: unknown
  email_verified?: unknown
  name?: unknown
  nickname?: unknown
  picture?: unknown
}

type PlatformUserRecord = typeof users.$inferSelect

export interface AnonymousActor {
  kind: 'anonymous'
  isAuthenticated: false
  hasPlatformAccount: false
  hasAcceptedCurrentPlatformDocuments: false
  sessionUser: null
  platformUser: null
}

export interface AuthenticatedIdentityActor {
  kind: 'authenticated_identity'
  isAuthenticated: true
  hasPlatformAccount: false
  hasAcceptedCurrentPlatformDocuments: false
  canCreateFirstPlatformAdminSetupAccount: boolean
  sessionUser: SessionUserProfile
  platformUser: null
}

export interface PlatformActor {
  kind: 'platform_user'
  isAuthenticated: true
  hasPlatformAccount: true
  hasAcceptedCurrentPlatformDocuments: boolean
  sessionUser: SessionUserProfile
  platformUser: PlatformUserRecord
}

export type RequestActor = AnonymousActor | AuthenticatedIdentityActor | PlatformActor

function buildPlatformAccountRequiredError(actor: RequestActor) {
  return new ApiError({
    statusCode: actor.kind === 'anonymous' ? 401 : 403,
    code: actor.kind === 'anonymous' ? 'unauthenticated' : 'platform_account_required',
    message: actor.kind === 'anonymous'
      ? 'This operation requires an authenticated session.'
      : 'This operation requires a platform account.'
  })
}

function buildPlatformConsentRequiredError(actor: PlatformActor) {
  return new ApiError({
    statusCode: 403,
    code: 'platform_consent_required',
    message: 'Accept the current platform Privacy Policy and Platform Terms before continuing.',
    details: {
      userId: actor.platformUser.id
    }
  })
}

function buildGitHubProfileUrl(username: string | null | undefined) {
  const normalizedUsername = username?.trim()

  if (!normalizedUsername) {
    return null
  }

  return `https://github.com/${encodeURIComponent(normalizedUsername)}`
}

function readSessionUser(session: SessionLike | null | undefined): SessionUserProfile | null {
  if (!session?.user?.sub) {
    return null
  }

  const linkedAuth0Subjects = Array.isArray(session.user[linkedAuth0SubjectsClaim])
    ? session.user[linkedAuth0SubjectsClaim]
        .filter((subject): subject is string => typeof subject === 'string')
        .map(subject => subject.trim())
        .filter(Boolean)
    : []
  const githubProfileUrl = session.user.sub.startsWith('github|')
    ? buildGitHubProfileUrl(session.user.nickname ?? null)
    : null

  return {
    sub: session.user.sub,
    email: session.user.email ?? null,
    email_verified: typeof session.user.email_verified === 'boolean' ? session.user.email_verified : null,
    name: session.user.name ?? null,
    nickname: session.user.nickname ?? null,
    picture: session.user.picture ?? null,
    githubProfileUrl,
    linkedAuth0Subjects
  }
}

function buildAuth0UserInfoUrl(domain: string | null | undefined) {
  const normalizedDomain = domain?.trim()

  if (!normalizedDomain) {
    return null
  }

  const baseUrl = normalizedDomain.startsWith('http://') || normalizedDomain.startsWith('https://')
    ? normalizedDomain
    : `https://${normalizedDomain}`

  try {
    return new URL('/userinfo', baseUrl).toString()
  } catch {
    return null
  }
}

function readStringClaim(value: unknown, fallback: string | null | undefined) {
  return typeof value === 'string' ? value : fallback
}

function mergeSessionUserInfo(
  sessionUser: SessionUserProfile,
  userInfo: Auth0UserInfoProfile
): SessionUserProfile {
  const userInfoSubject = typeof userInfo.sub === 'string' ? userInfo.sub.trim() : ''

  if (userInfoSubject && userInfoSubject !== sessionUser.sub) {
    return sessionUser
  }

  return {
    ...sessionUser,
    email: readStringClaim(userInfo.email, sessionUser.email),
    email_verified: typeof userInfo.email_verified === 'boolean'
      ? userInfo.email_verified
      : sessionUser.email_verified,
    name: readStringClaim(userInfo.name, sessionUser.name),
    nickname: readStringClaim(userInfo.nickname, sessionUser.nickname),
    picture: readStringClaim(userInfo.picture, sessionUser.picture)
  }
}

async function refreshAuthenticatedIdentitySessionUser(
  event: H3Event,
  sessionUser: SessionUserProfile
) {
  if (sessionUser.email_verified === true) {
    return sessionUser
  }

  const userInfoUrl = buildAuth0UserInfoUrl(useRuntimeConfig(event).auth0.domain)

  if (!userInfoUrl) {
    return sessionUser
  }

  try {
    const auth0 = useAuth0(event)
    const { accessToken } = await auth0.getAccessToken()
    const response = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      return sessionUser
    }

    return mergeSessionUserInfo(
      sessionUser,
      await response.json() as Auth0UserInfoProfile
    )
  } catch {
    return sessionUser
  }
}

async function getAuth0Session(event: H3Event): Promise<SessionLike | null> {
  const auth0 = useAuth0(event)
  const session = await auth0.getSession()

  return session as SessionLike | null
}

async function findPlatformUserBySubject(event: H3Event, auth0Subject: string) {
  return await findPlatformUserByAuth0Subject(getDatabase(event), auth0Subject)
}

async function buildAuthenticatedIdentityActor(
  database: ReturnType<typeof getDatabase>,
  sessionUser: SessionUserProfile,
  configuredEmail: string | null | undefined
): Promise<AuthenticatedIdentityActor> {
  return {
    kind: 'authenticated_identity',
    isAuthenticated: true,
    hasPlatformAccount: false,
    hasAcceptedCurrentPlatformDocuments: false,
    canCreateFirstPlatformAdminSetupAccount: await canCreateFirstPlatformAdminSetupAccount(database, {
      userEmail: sessionUser.email,
      configuredEmail
    }),
    sessionUser,
    platformUser: null
  }
}

async function buildPlatformActor(
  database: ReturnType<typeof getDatabase>,
  sessionUser: SessionUserProfile,
  platformUser: PlatformUserRecord
): Promise<PlatformActor> {
  return {
    kind: 'platform_user',
    isAuthenticated: true,
    hasPlatformAccount: true,
    hasAcceptedCurrentPlatformDocuments: await hasAcceptedCurrentPlatformDocuments(
      database,
      platformUser.id
    ),
    sessionUser,
    platformUser
  }
}

export function setRequestActor(event: H3Event, actor: RequestActor | Promise<RequestActor>) {
  event.context.requestActor = actor
}

async function recordSessionLinkedPlatformAccountIdentities(
  database: ReturnType<typeof getDatabase>,
  sessionUser: SessionUserProfile,
  platformUser: PlatformUserRecord
) {
  const auth0Subjects = Array.from(new Set([
    platformUser.auth0Subject,
    sessionUser.sub,
    ...(sessionUser.linkedAuth0Subjects ?? [])
  ].map(subject => subject.trim()).filter(Boolean)))

  if (auth0Subjects.length <= 1) {
    return
  }

  await ensurePlatformUserAuthIdentities(database, {
    userId: platformUser.id,
    auth0Subjects
  })
}

export async function resolveRequestActor(event: H3Event): Promise<RequestActor> {
  const sessionUser = readSessionUser(await getAuth0Session(event))
  const database = getDatabase(event)

  if (!sessionUser) {
    return {
      kind: 'anonymous',
      isAuthenticated: false,
      hasPlatformAccount: false,
      hasAcceptedCurrentPlatformDocuments: false,
      sessionUser: null,
      platformUser: null
    }
  }

  const platformUser = await findPlatformUserBySubject(event, sessionUser.sub)

  if (platformUser) {
    await recordSessionLinkedPlatformAccountIdentities(database, sessionUser, platformUser)
    const effectivePlatformUser = await grantConfiguredFirstPlatformAdminAccess(database, {
      user: platformUser,
      configuredEmail: useRuntimeConfig(event).firstPlatformAdminEmail
    })

    return await buildPlatformActor(database, sessionUser, effectivePlatformUser)
  }

  const refreshedSessionUser = await refreshAuthenticatedIdentitySessionUser(event, sessionUser)

  return await buildAuthenticatedIdentityActor(
    database,
    refreshedSessionUser,
    useRuntimeConfig(event).firstPlatformAdminEmail
  )
}

export async function getRequestActor(event: H3Event): Promise<RequestActor> {
  event.context.requestActor ??= resolveRequestActor(event)
  return await event.context.requestActor
}

export async function requireAuthenticatedActor(event: H3Event) {
  const actor = await getRequestActor(event)

  if (actor.isAuthenticated) {
    return actor
  }

  throw new ApiError({
    statusCode: 401,
    code: 'unauthenticated',
    message: 'This operation requires an authenticated session.'
  })
}

export async function requirePlatformAccountActor(event: H3Event) {
  const actor = await requireAuthenticatedActor(event)

  if (actor.hasPlatformAccount) {
    return actor
  }

  throw buildPlatformAccountRequiredError(actor)
}

export function assertRegularPlatformAccess(actor: RequestActor): asserts actor is PlatformActor {
  if (actor.kind !== 'platform_user') {
    throw buildPlatformAccountRequiredError(actor)
  }

  if (!actor.hasAcceptedCurrentPlatformDocuments) {
    throw buildPlatformConsentRequiredError(actor)
  }
}

export async function requirePlatformActor(event: H3Event) {
  const actor = await requireAuthenticatedActor(event)
  assertRegularPlatformAccess(actor)
  return actor
}
