import { buildAuthLoginHref } from '#shared/domains/accounts/auth-navigation'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  if (!url.pathname.startsWith('/account')) {
    return
  }

  const auth0 = useAuth0(event)
  const session = await auth0.getSession()

  if (session) {
    return
  }

  const returnTo = `${url.pathname}${url.search}`
  return sendRedirect(event, buildAuthLoginHref(returnTo))
})
