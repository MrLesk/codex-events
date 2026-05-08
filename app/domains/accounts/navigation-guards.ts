import type { RouteLocationNormalized } from 'vue-router'
import type { SessionActor } from '~/domains/accounts/session-actor'
import type { EventScopedRole } from '~/domains/events/roles'

import { buildAuthLoginHref } from '#shared/domains/accounts/auth-navigation'
import { resolveActorAppRedirect } from './auth-navigation'

type PlatformSessionActor = Extract<SessionActor, { kind: 'platform_user' }>
export type RedirectNavigationResult = {
  redirectTo: string
  external?: boolean
}
type AuthenticatedNavigationResult = { actor: SessionActor }
type PlatformNavigationResult = { actor: PlatformSessionActor }

function getNavigationFetch() {
  return import.meta.server ? useRequestFetch() : $fetch
}

function createUnauthorizedNavigationError(statusMessage = 'Unauthorized') {
  return createError({
    statusCode: 401,
    statusMessage
  })
}

export async function ensureAuthenticatedActor(
  to: RouteLocationNormalized,
  navigationFetch: ReturnType<typeof getNavigationFetch> = getNavigationFetch()
): Promise<RedirectNavigationResult | AuthenticatedNavigationResult> {
  if (!useUser().value) {
    return {
      redirectTo: buildAuthLoginHref(to.fullPath),
      external: true
    }
  }

  const response = await navigationFetch('/api/session') as {
    data?: {
      actor?: SessionActor
    }
  }

  const actor = response.data?.actor

  if (!actor) {
    return {
      redirectTo: buildAuthLoginHref(to.fullPath),
      external: true
    }
  }

  const redirectTarget = resolveActorAppRedirect(actor, to.fullPath)

  if (redirectTarget !== to.fullPath) {
    return {
      redirectTo: redirectTarget
    }
  }

  return {
    actor
  }
}

export async function ensurePlatformAccountActor(
  to: RouteLocationNormalized,
  navigationFetch: ReturnType<typeof getNavigationFetch> = getNavigationFetch()
): Promise<RedirectNavigationResult | PlatformNavigationResult> {
  const resolvedSession = await ensureAuthenticatedActor(to, navigationFetch)

  if ('redirectTo' in resolvedSession) {
    return resolvedSession
  }

  if (resolvedSession.actor.kind !== 'platform_user') {
    throw createUnauthorizedNavigationError('Platform account required.')
  }

  return {
    actor: resolvedSession.actor
  }
}

export async function ensureAccountPageAccess(
  to: RouteLocationNormalized,
  hasAccess: (actor: PlatformSessionActor) => boolean,
  statusMessage = 'Unauthorized'
) {
  const navigationFetch = getNavigationFetch()
  const resolvedSession = await ensurePlatformAccountActor(to, navigationFetch)

  if ('redirectTo' in resolvedSession) {
    return resolvedSession
  }

  if (!hasAccess(resolvedSession.actor)) {
    throw createUnauthorizedNavigationError(statusMessage)
  }
}

export async function ensureEventRoleForSlugRoute(
  to: RouteLocationNormalized,
  roles: EventScopedRole[]
) {
  const navigationFetch = getNavigationFetch()
  const resolvedSession = await ensurePlatformAccountActor(to, navigationFetch)

  if ('redirectTo' in resolvedSession) {
    return resolvedSession
  }

  const actor = resolvedSession.actor

  if (actor.isPlatformAdmin) {
    return
  }

  const slug = typeof to.params.slug === 'string' ? to.params.slug.trim() : ''

  if (!slug) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Event not found.'
    })
  }

  const eventResponse = await navigationFetch(`/api/events/slug/${encodeURIComponent(slug)}`) as {
    data?: {
      id?: string
    }
  }

  const eventId = eventResponse.data?.id

  if (!eventId) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Event not found.'
    })
  }

  const hasAllowedRole = (actor.eventRoles ?? []).some((assignment) => {
    if (assignment.eventId !== eventId) {
      return false
    }

    if (roles.includes(assignment.role as EventScopedRole)) {
      return true
    }

    if (roles.includes('judge') && assignment.role === 'event_admin' && assignment.isInJudgePool) {
      return true
    }

    if (roles.includes('staff') && assignment.role === 'event_admin' && assignment.isStaff) {
      return true
    }

    return false
  })

  if (hasAllowedRole) {
    return
  }

  throw createUnauthorizedNavigationError('This page requires additional event permissions.')
}
