import type { H3Event } from 'h3'

import { and, eq, isNull } from 'drizzle-orm'

import { getDatabase } from '../database/client'
import { users } from '../database/schema'
import { registerPlatformAccount } from '../utils/account-management'
import { ApiError } from '../utils/api-error'
import { getCurrentPlatformDocument } from '../utils/platform-documents'

interface SessionUserProfile {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
  [key: string]: unknown
}

interface SessionLike {
  user?: SessionUserProfile | null
}

type PlatformUserRecord = typeof users.$inferSelect

const signupConsentClaims = {
  privacyPolicy: 'https://codex-hackathons/consents/privacy_policy',
  platformTerms: 'https://codex-hackathons/consents/platform_terms'
} as const

export interface AnonymousActor {
  kind: 'anonymous'
  isAuthenticated: false
  hasPlatformAccount: false
  sessionUser: null
  platformUser: null
}

export interface AuthenticatedIdentityActor {
  kind: 'authenticated_identity'
  isAuthenticated: true
  hasPlatformAccount: false
  sessionUser: SessionUserProfile
  platformUser: null
}

export interface PlatformActor {
  kind: 'platform_user'
  isAuthenticated: true
  hasPlatformAccount: true
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

function readSessionUser(session: SessionLike | null | undefined): SessionUserProfile | null {
  if (!session?.user?.sub) {
    return null
  }

  const privacyPolicyConsent = session.user[signupConsentClaims.privacyPolicy]
  const platformTermsConsent = session.user[signupConsentClaims.platformTerms]

  return {
    sub: session.user.sub,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    nickname: session.user.nickname ?? null,
    picture: session.user.picture ?? null,
    [signupConsentClaims.privacyPolicy]: privacyPolicyConsent,
    [signupConsentClaims.platformTerms]: platformTermsConsent
  }
}

async function getAuth0Session(event: H3Event): Promise<SessionLike | null> {
  const auth0 = useAuth0(event)
  const session = await auth0.getSession()

  return session as SessionLike | null
}

async function findPlatformUserBySubject(event: H3Event, auth0Subject: string) {
  const database = getDatabase(event)

  return database.query.users.findFirst({
    where: and(
      eq(users.auth0Subject, auth0Subject),
      isNull(users.deletedAt)
    )
  })
}

function hasRequiredSignupConsents(sessionUser: SessionUserProfile) {
  return sessionUser[signupConsentClaims.privacyPolicy] === true
    && sessionUser[signupConsentClaims.platformTerms] === true
}

function buildAuthenticatedIdentityActor(sessionUser: SessionUserProfile): AuthenticatedIdentityActor {
  return {
    kind: 'authenticated_identity',
    isAuthenticated: true,
    hasPlatformAccount: false,
    sessionUser,
    platformUser: null
  }
}

async function provisionPlatformAccountFromSignupConsent(event: H3Event, sessionUser: SessionUserProfile) {
  if (!hasRequiredSignupConsents(sessionUser)) {
    return null
  }

  const database = getDatabase(event)
  const [privacyPolicyDocument, platformTermsDocument] = await Promise.all([
    getCurrentPlatformDocument(database, 'privacy_policy'),
    getCurrentPlatformDocument(database, 'platform_terms')
  ])

  if (!privacyPolicyDocument || !platformTermsDocument) {
    throw new ApiError({
      statusCode: 409,
      code: 'platform_document_unavailable',
      message: 'Current platform documents must be configured before account provisioning.'
    })
  }

  try {
    await registerPlatformAccount(database, buildAuthenticatedIdentityActor(sessionUser), {
      privacyPolicyDocumentId: privacyPolicyDocument.id,
      platformTermsDocumentId: platformTermsDocument.id
    })
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'platform_account_already_exists') {
      throw error
    }
  }

  return await findPlatformUserBySubject(event, sessionUser.sub)
}

export function setRequestActor(event: H3Event, actor: RequestActor | Promise<RequestActor>) {
  event.context.requestActor = actor
}

export async function resolveRequestActor(event: H3Event): Promise<RequestActor> {
  const sessionUser = readSessionUser(await getAuth0Session(event))

  if (!sessionUser) {
    return {
      kind: 'anonymous',
      isAuthenticated: false,
      hasPlatformAccount: false,
      sessionUser: null,
      platformUser: null
    }
  }

  const platformUser = await findPlatformUserBySubject(event, sessionUser.sub)

  if (platformUser) {
    return {
      kind: 'platform_user',
      isAuthenticated: true,
      hasPlatformAccount: true,
      sessionUser,
      platformUser
    }
  }

  const provisionedUser = await provisionPlatformAccountFromSignupConsent(event, sessionUser)

  if (!provisionedUser) {
    return buildAuthenticatedIdentityActor(sessionUser)
  }

  return {
    kind: 'platform_user',
    isAuthenticated: true,
    hasPlatformAccount: true,
    sessionUser,
    platformUser: provisionedUser
  }
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

export async function requirePlatformActor(event: H3Event) {
  return await requirePlatformAccountActor(event)
}
