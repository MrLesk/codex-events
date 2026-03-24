export const authLogoutHref = '/auth/logout'

export type AuthAccessMode = 'signin' | 'register'

export function normalizeAuthReturnTo(returnTo: string | null | undefined, fallback = '/') {
  const normalizedReturnTo = returnTo?.trim() || fallback

  if (!normalizedReturnTo.startsWith('/') || normalizedReturnTo.startsWith('//')) {
    return fallback
  }

  return normalizedReturnTo
}

export function buildAuthLoginHref(returnTo: string | null | undefined) {
  return `/auth/login?returnTo=${encodeURIComponent(normalizeAuthReturnTo(returnTo))}`
}

export function buildAuthAccessHref(returnTo: string | null | undefined, mode: AuthAccessMode = 'signin') {
  const searchParams = new URLSearchParams({
    returnTo: normalizeAuthReturnTo(returnTo)
  })

  if (mode !== 'signin') {
    searchParams.set('mode', mode)
  }

  return `/auth/access?${searchParams.toString()}`
}
