import type { H3Event } from 'h3'

import { and, eq, isNull } from 'drizzle-orm'

import { getDatabase } from '../database/client'
import { users } from '../database/schema'
import { ApiError } from '../utils/api-error'

interface SessionUserProfile {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
}

interface SessionLike {
  user?: SessionUserProfile | null
}

type PlatformUserRecord = typeof users.$inferSelect

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

function readSessionUser(session: SessionLike | null | undefined): SessionUserProfile | null {
  if (!session?.user?.sub) {
    return null
  }

  return {
    sub: session.user.sub,
    email: session.user.email ?? null,
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
  const database = getDatabase(event)

  return database.query.users.findFirst({
    where: and(
      eq(users.auth0Subject, auth0Subject),
      isNull(users.deletedAt)
    )
  })
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

  if (!platformUser) {
    return {
      kind: 'authenticated_identity',
      isAuthenticated: true,
      hasPlatformAccount: false,
      sessionUser,
      platformUser: null
    }
  }

  return {
    kind: 'platform_user',
    isAuthenticated: true,
    hasPlatformAccount: true,
    sessionUser,
    platformUser
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

export async function requirePlatformActor(event: H3Event) {
  const actor = await requireAuthenticatedActor(event)

  if (actor.hasPlatformAccount) {
    return actor
  }

  throw new ApiError({
    statusCode: 403,
    code: 'platform_account_required',
    message: 'This operation requires a platform account.'
  })
}
