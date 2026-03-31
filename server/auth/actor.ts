import type { H3Event } from 'h3'
import type { users } from '../database/schema'

import { getDatabase } from '../database/client'
import { ApiError } from '../utils/api-error'
import {
  ensurePlatformUserAuthIdentities,
  findActivePlatformUserById,
  findPlatformUserByAuth0Subject
} from '../utils/platform-auth-identities'
import {
  findLinkablePlatformAccountIdentity,
  listPlatformAccountIdentitySubjects,
  serializePlatformAccountLinkState,
  type LinkablePlatformAccountIdentity,
  type PlatformAccountLinkState
} from '../utils/platform-account-linking'
import { hasAcceptedCurrentPlatformDocuments } from '../utils/platform-documents'

interface SessionUserProfile {
  sub: string
  email?: string | null
  email_verified?: boolean | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
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
  accountLink: PlatformAccountLinkState | null
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

function readSessionUser(session: SessionLike | null | undefined): SessionUserProfile | null {
  if (!session?.user?.sub) {
    return null
  }

  return {
    sub: session.user.sub,
    email: session.user.email ?? null,
    email_verified: typeof session.user.email_verified === 'boolean' ? session.user.email_verified : null,
    name: session.user.name ?? null,
    nickname: session.user.nickname ?? null,
    picture: session.user.picture ?? null
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

export async function getRequestLinkablePlatformAccountIdentity(
  event: H3Event,
  sessionUser: SessionUserProfile
): Promise<LinkablePlatformAccountIdentity | null> {
  event.context.linkablePlatformAccountIdentity ??= findLinkablePlatformAccountIdentity(
    getDatabase(event),
    sessionUser
  )

  return await event.context.linkablePlatformAccountIdentity
}

function buildAuthenticatedIdentityActor(
  sessionUser: SessionUserProfile,
  options?: {
    accountLink?: PlatformAccountLinkState | null
  }
): AuthenticatedIdentityActor {
  return {
    kind: 'authenticated_identity',
    isAuthenticated: true,
    hasPlatformAccount: false,
    hasAcceptedCurrentPlatformDocuments: false,
    accountLink: options?.accountLink ?? null,
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

async function reconcileLinkedPlatformAccountIdentity(
  event: H3Event,
  database: ReturnType<typeof getDatabase>,
  sessionUser: SessionUserProfile,
  accountLinkCandidate: LinkablePlatformAccountIdentity | null
) {
  if (!accountLinkCandidate) {
    return null
  }

  try {
    const linkedAuth0Subjects = await listPlatformAccountIdentitySubjects(
      event,
      accountLinkCandidate.primaryAuth0Subject
    )

    if (!linkedAuth0Subjects.includes(sessionUser.sub)) {
      return null
    }

    await ensurePlatformUserAuthIdentities(database, {
      userId: accountLinkCandidate.userId,
      auth0Subjects: linkedAuth0Subjects
    })

    return await findActivePlatformUserById(database, accountLinkCandidate.userId)
  } catch (error) {
    console.error('Platform linked-identity reconciliation failed', {
      currentAuth0Subject: sessionUser.sub,
      primaryAuth0Subject: accountLinkCandidate.primaryAuth0Subject,
      error
    })

    return null
  }
}

export function setRequestActor(event: H3Event, actor: RequestActor | Promise<RequestActor>) {
  event.context.requestActor = actor
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
    return await buildPlatformActor(database, sessionUser, platformUser)
  }

  const accountLinkCandidate = await getRequestLinkablePlatformAccountIdentity(event, sessionUser)
  const reconciledPlatformUser = await reconcileLinkedPlatformAccountIdentity(
    event,
    database,
    sessionUser,
    accountLinkCandidate
  )

  if (reconciledPlatformUser) {
    return await buildPlatformActor(database, sessionUser, reconciledPlatformUser)
  }

  return buildAuthenticatedIdentityActor(sessionUser, {
    accountLink: accountLinkCandidate ? serializePlatformAccountLinkState(accountLinkCandidate) : null
  })
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
