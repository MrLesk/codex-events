import type { RouteLocationNormalized } from 'vue-router'
import type { SessionActor } from '~/domains/accounts/session-actor'
import type { EventScopedRole } from '~/domains/events/roles'

import { buildAuthLoginHref } from '#shared/domains/accounts/auth-navigation'
import type { ApiClient } from '~/composables/useApiClient'
import { useApiClient } from '~/composables/useApiClient'
import { useSessionActor } from '~/composables/useSessionActor'
import { resolveActorAppRedirect } from './auth-navigation'

type PlatformSessionActor = Extract<SessionActor, { kind: 'platform_user' }>
export type NavigationSessionBootstrap = Pick<ReturnType<typeof useSessionActor>, 'actor' | 'ensureLoaded'>
export type RedirectNavigationResult = {
  redirectTo: string
  external?: boolean
}
type AuthenticatedNavigationResult = { actor: SessionActor }
type PlatformNavigationResult = { actor: PlatformSessionActor }

function getNavigationFetch(): ApiClient {
  return useApiClient()
}

function createUnauthorizedNavigationError(statusMessage = 'Unauthorized') {
  return createError({
    statusCode: 401,
    statusMessage
  })
}

export function isClientRenderedAuthenticatedShellPath(path: string) {
  return path === '/account'
    || path.startsWith('/account/')
    || path === '/admin'
    || path.startsWith('/admin/')
    || path === '/prize-redemptions'
    || path.startsWith('/prize-redemptions/')
}

export function shouldSkipServerAuthenticatedNavigation(path: string) {
  return import.meta.server && isClientRenderedAuthenticatedShellPath(path)
}

export async function ensureAuthenticatedActor(
  to: RouteLocationNormalized,
  bootstrap: NavigationSessionBootstrap = useSessionActor()
): Promise<RedirectNavigationResult | AuthenticatedNavigationResult> {
  await bootstrap.ensureLoaded()
  const actor = bootstrap.actor.value

  if (!actor.isAuthenticated) {
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
  bootstrap: NavigationSessionBootstrap = useSessionActor()
): Promise<RedirectNavigationResult | PlatformNavigationResult> {
  const resolvedSession = await ensureAuthenticatedActor(to, bootstrap)

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
  statusMessage = 'Unauthorized',
  bootstrap: NavigationSessionBootstrap = useSessionActor()
) {
  const resolvedSession = await ensurePlatformAccountActor(to, bootstrap)

  if ('redirectTo' in resolvedSession) {
    return resolvedSession
  }

  if (!hasAccess(resolvedSession.actor)) {
    throw createUnauthorizedNavigationError(statusMessage)
  }
}

export async function ensureEventRoleForSlugRoute(
  to: RouteLocationNormalized,
  roles: EventScopedRole[],
  navigationFetch: ApiClient = getNavigationFetch(),
  bootstrap: NavigationSessionBootstrap = useSessionActor()
) {
  const resolvedSession = await ensurePlatformAccountActor(to, bootstrap)

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
