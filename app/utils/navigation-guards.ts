import type { RouteLocationNormalized } from 'vue-router'

import { accountDashboardHref, buildAuthLoginHref, resolveActorAppRedirect } from './auth-navigation'

export type HackathonScopedRole = 'hackathon_admin' | 'judge'

type SessionActor = {
  kind: 'anonymous' | 'authenticated_identity' | 'platform_user'
  isPlatformAdmin?: boolean
  hackathonRoles?: Array<{
    hackathonId: string
    role: string
  }>
}

function getNavigationFetch() {
  return import.meta.server ? useRequestFetch() : $fetch
}

export async function ensureAuthenticatedActor(to: RouteLocationNormalized) {
  if (!useUser().value) {
    return {
      redirect: navigateTo(buildAuthLoginHref(to.fullPath), { external: true })
    }
  }

  const navigationFetch = getNavigationFetch()
  const response = await navigationFetch('/api/session') as {
    data?: {
      actor?: SessionActor
    }
  }

  const actor = response.data?.actor

  if (!actor) {
    return {
      redirect: navigateTo(buildAuthLoginHref(to.fullPath), { external: true })
    }
  }

  const redirectTarget = resolveActorAppRedirect(actor, to.fullPath)

  if (redirectTarget !== to.fullPath) {
    return {
      redirect: navigateTo(redirectTarget)
    }
  }

  return {
    actor
  }
}

export async function ensureHackathonRoleForSlugRoute(
  to: RouteLocationNormalized,
  roles: HackathonScopedRole[]
) {
  const resolvedSession = await ensureAuthenticatedActor(to)

  if ('redirect' in resolvedSession) {
    return resolvedSession.redirect
  }

  const actor = resolvedSession.actor

  if (actor.kind !== 'platform_user') {
    return navigateTo(accountDashboardHref)
  }

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

  const navigationFetch = getNavigationFetch()
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

  const hasAllowedRole = (actor.hackathonRoles ?? []).some(assignment =>
    assignment.hackathonId === hackathonId && roles.includes(assignment.role as HackathonScopedRole)
  )

  if (hasAllowedRole) {
    return
  }

  return navigateTo(`/hackathons/${slug}`)
}
