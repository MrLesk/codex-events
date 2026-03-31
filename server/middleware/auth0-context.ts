import type { SessionConfiguration } from '@auth0/auth0-server-js'

type Auth0ClientOptions = {
  appBaseUrl?: string
  sessionConfiguration?: SessionConfiguration
  [key: string]: unknown
}

export function shouldUseSecureAuth0SessionCookie(appBaseUrl: string | undefined) {
  if (!appBaseUrl) {
    return true
  }

  try {
    return new URL(appBaseUrl).protocol === 'https:'
  } catch {
    return !appBaseUrl.trim().startsWith('http://')
  }
}

export function buildAuth0ClientOptions(auth0Config: Auth0ClientOptions) {
  const sessionConfiguration: SessionConfiguration = {
    ...(auth0Config.sessionConfiguration ?? {})
  }
  const cookie = {
    ...(sessionConfiguration.cookie ?? {})
  }

  if (cookie.secure === undefined) {
    cookie.secure = shouldUseSecureAuth0SessionCookie(auth0Config.appBaseUrl)
  }

  return {
    ...auth0Config,
    sessionConfiguration: {
      ...sessionConfiguration,
      cookie
    }
  } satisfies Auth0ClientOptions
}

export default defineEventHandler((event) => {
  // Ensure request-scoped Auth0 options exist before the SDK's SSR middleware
  // or our own route guards call `useAuth0(event)`.
  const auth0Config = (event.context.auth0ClientOptions ?? useRuntimeConfig(event).auth0) as Auth0ClientOptions
  event.context.auth0ClientOptions = buildAuth0ClientOptions(auth0Config)
})
