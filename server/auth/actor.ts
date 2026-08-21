import type { H3Event } from 'h3'
import { users } from '#server/database/schema'
import { and, eq, isNull } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { ApiError } from '#server/http/api-error'
import { findPlatformUserByAuth0SubjectWithConsent } from '#server/domains/accounts/auth-identities'
import { canCreateFirstPlatformAdminSetupAccount } from '#server/domains/platform/admins'
import { hasAcceptedCurrentPlatformDocuments } from '#server/domains/platform/documents'
import { measureRequestPhase } from '#server/http/request-timing'

interface SessionUserProfile {
  sub: string
  email?: string | null
  email_verified?: boolean | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
  githubProfileUrl?: string | null
  [key: string]: unknown
}

interface SessionLike {
  user?: SessionUserProfile | null
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
    githubProfileUrl
  }
}

async function getAuth0Session(event: H3Event): Promise<SessionLike | null> {
  const auth0 = useAuth0(event)
  const session = await auth0.getSession()

  return session as SessionLike | null
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

function buildPlatformActor(
  sessionUser: SessionUserProfile,
  platformUser: PlatformUserRecord,
  hasAcceptedCurrentPlatformDocuments: boolean
): PlatformActor {
  return {
    kind: 'platform_user',
    isAuthenticated: true,
    hasPlatformAccount: true,
    hasAcceptedCurrentPlatformDocuments,
    sessionUser,
    platformUser
  }
}

export function setRequestActor(event: H3Event, actor: RequestActor | Promise<RequestActor>) {
  event.context.requestActor = actor
}

export async function resolveRequestActor(event: H3Event): Promise<RequestActor> {
  const sessionUser = readSessionUser(await measureRequestPhase(
    event,
    'actor-session',
    () => getAuth0Session(event)
  ))

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

  const database = getDatabase(event)
  const platformUser = await measureRequestPhase(
    event,
    'actor-d1',
    () => findPlatformUserByAuth0SubjectWithConsent(database, sessionUser.sub)
  )

  if (platformUser) {
    return buildPlatformActor(
      sessionUser,
      platformUser.user,
      platformUser.hasAcceptedCurrentPlatformDocuments
    )
  }

  return await measureRequestPhase(
    event,
    'actor-d1',
    () => buildAuthenticatedIdentityActor(
      database,
      sessionUser,
      useRuntimeConfig(event).firstPlatformAdminEmail
    )
  )
}

export async function getRequestActor(event: H3Event): Promise<RequestActor> {
  event.context.requestActor ??= resolveRequestActor(event)
  return await event.context.requestActor
}

export async function resolveMcpPlatformActor(event: H3Event, userId: string): Promise<PlatformActor> {
  const database = getDatabase(event)
  const platformUser = await database.select().from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get()

  if (!platformUser) {
    throw new ApiError({
      statusCode: 401,
      code: 'invalid_mcp_credential',
      message: 'The MCP access credential is invalid.'
    })
  }

  return buildPlatformActor({
    sub: platformUser.auth0Subject,
    email: platformUser.email,
    email_verified: true,
    name: platformUser.displayName,
    githubProfileUrl: platformUser.githubProfileUrl
  }, platformUser, await hasAcceptedCurrentPlatformDocuments(database, platformUser.id))
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
