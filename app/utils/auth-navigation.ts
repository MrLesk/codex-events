export const authLogoutHref = '/auth/logout'

export function buildAuthLoginHref(returnTo: string | null | undefined) {
  const normalizedReturnTo = returnTo?.trim() || '/'
  return `/auth/login?returnTo=${encodeURIComponent(normalizedReturnTo)}`
}
