import type { RouteLocationNormalized } from 'vue-router'
import type { ResolvedSessionActor } from '~/composables/useSessionActor'

import { buildAuthLoginHref } from '#shared/auth-navigation'
import { resolveActorAppRedirect } from './auth-navigation'

export type HackathonScopedRole = 'hackathon_admin' | 'judge' | 'staff'
type SessionActor = ResolvedSessionActor
type PlatformSessionActor = Extract<ResolvedSessionActor, { kind: 'platform_user' }>
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

export async function ensureHackathonRoleForSlugRoute(
  to: RouteLocationNormalized,
  roles: HackathonScopedRole[]
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
      statusMessage: 'Hackathon not found.'
    })
  }

  const hackathonResponse = await navigationFetch(`/api/hackathons/slug/${encodeURIComponent(slug)}`) as {
    data?: {
      id?: string
    }
  }

  const hackathonId = hackathonResponse.data?.id

  if (!hackathonId) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Hackathon not found.'
    })
  }

  const hasAllowedRole = (actor.hackathonRoles ?? []).some((assignment) => {
    if (assignment.hackathonId !== hackathonId) {
      return false
    }

    if (roles.includes(assignment.role as HackathonScopedRole)) {
      return true
    }

    if (roles.includes('judge') && assignment.role === 'hackathon_admin' && assignment.isInJudgePool) {
      return true
    }

    if (roles.includes('staff') && assignment.role === 'hackathon_admin' && assignment.isStaff) {
      return true
    }

    return false
  })

  if (hasAllowedRole) {
    return
  }

  throw createUnauthorizedNavigationError('This page requires additional hackathon permissions.')
}
