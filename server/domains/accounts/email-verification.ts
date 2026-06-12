import { ApiError } from '#server/http/api-error'

interface Auth0EmailVerificationRuntimeConfig {
  auth0?: {
    domain?: string | null
    clientId?: string | null
    managementDomain?: string | null
    managementClientId?: string | null
    managementClientSecret?: string | null
  } | null
}

interface Auth0EmailVerificationConfig {
  baseUrl: string
  managementClientId: string
  managementClientSecret: string
  applicationClientId: string | null
}

type EnvironmentValues = Record<string, string | undefined>

interface Auth0TokenResponse {
  access_token?: unknown
  token_type?: unknown
  expires_in?: unknown
}

interface Auth0VerificationEmailJobResponse {
  id?: unknown
  type?: unknown
  status?: unknown
  created_at?: unknown
}

type FetchLike = typeof fetch

function buildAuth0EmailVerificationUnavailableError(cause?: unknown) {
  return new ApiError({
    statusCode: 503,
    code: 'auth0_email_verification_unavailable',
    message: 'Confirmation email cannot be sent right now.',
    cause
  })
}

function normalizeAuth0BaseUrl(domain: string) {
  const valueWithProtocol = /^https?:\/\//i.test(domain)
    ? domain
    : `https://${domain}`

  try {
    const url = new URL(valueWithProtocol)

    if (!url.hostname || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      throw new Error('Auth0 domain must be a host name or origin.')
    }

    return url.origin
  } catch (error) {
    throw buildAuth0EmailVerificationUnavailableError(error)
  }
}

function readRuntimeConfigValue(value: string | null | undefined) {
  return value?.trim() || ''
}

function readEnvironmentValue(environment: EnvironmentValues, name: string) {
  return environment[name]?.trim() || ''
}

function getDefaultEnvironment(): EnvironmentValues {
  return typeof process === 'undefined' ? {} : process.env
}

export function resolveAuth0EmailVerificationConfig(
  runtimeConfig: Auth0EmailVerificationRuntimeConfig,
  environment: EnvironmentValues = getDefaultEnvironment()
): Auth0EmailVerificationConfig {
  // The Management API only answers on the canonical tenant domain; the issuer
  // domain is just the last-resort fallback for tenants without a custom domain.
  const managementDomain = readRuntimeConfigValue(runtimeConfig.auth0?.managementDomain)
    || readEnvironmentValue(environment, 'AUTH0_MANAGEMENT_DOMAIN')
    || readRuntimeConfigValue(runtimeConfig.auth0?.domain)
  const managementClientId = readRuntimeConfigValue(runtimeConfig.auth0?.managementClientId)
    || readEnvironmentValue(environment, 'AUTH0_MGMT_CLIENT_ID')
  const managementClientSecret = readRuntimeConfigValue(runtimeConfig.auth0?.managementClientSecret)
    || readEnvironmentValue(environment, 'AUTH0_MGMT_CLIENT_SECRET')

  if (!managementDomain || !managementClientId || !managementClientSecret) {
    throw buildAuth0EmailVerificationUnavailableError()
  }

  return {
    baseUrl: normalizeAuth0BaseUrl(managementDomain),
    managementClientId,
    managementClientSecret,
    applicationClientId: readRuntimeConfigValue(runtimeConfig.auth0?.clientId) || null
  }
}

async function readAuth0ResponsePayload(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

function getAuth0RequestFailureStatus(response: Response) {
  return response.status === 429 ? 429 : 502
}

function getAuth0RequestFailureCode(response: Response) {
  return response.status === 429
    ? 'auth0_email_verification_rate_limited'
    : 'auth0_email_verification_failed'
}

async function assertAuth0ResponseOk(response: Response) {
  if (response.ok) {
    return
  }

  const payload = await readAuth0ResponsePayload(response)

  throw new ApiError({
    statusCode: getAuth0RequestFailureStatus(response),
    code: getAuth0RequestFailureCode(response),
    message: 'Confirmation email cannot be sent right now.',
    details: {
      auth0StatusCode: response.status,
      auth0Error: typeof payload?.error === 'string' ? payload.error : null,
      auth0ErrorCode: typeof payload?.errorCode === 'string' ? payload.errorCode : null
    }
  })
}

export async function getAuth0ManagementAccessToken(options: {
  config: Auth0EmailVerificationConfig
  fetcher?: FetchLike
}) {
  const fetcher = options.fetcher ?? fetch
  const response = await fetcher(`${options.config.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: options.config.managementClientId,
      client_secret: options.config.managementClientSecret,
      audience: `${options.config.baseUrl}/api/v2/`
    })
  })

  await assertAuth0ResponseOk(response)

  const payload = await readAuth0ResponsePayload(response) as Auth0TokenResponse | null
  const accessToken = typeof payload?.access_token === 'string' ? payload.access_token.trim() : ''

  if (!accessToken) {
    throw buildAuth0EmailVerificationUnavailableError()
  }

  return accessToken
}

export async function sendAuth0VerificationEmail(options: {
  runtimeConfig: Auth0EmailVerificationRuntimeConfig
  userId: string
  fetcher?: FetchLike
}) {
  const config = resolveAuth0EmailVerificationConfig(options.runtimeConfig)
  const accessToken = await getAuth0ManagementAccessToken({
    config,
    fetcher: options.fetcher
  })
  const response = await (options.fetcher ?? fetch)(`${config.baseUrl}/api/v2/jobs/verification-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      user_id: options.userId,
      ...(config.applicationClientId ? { client_id: config.applicationClientId } : {})
    })
  })

  await assertAuth0ResponseOk(response)

  const payload = await readAuth0ResponsePayload(response) as Auth0VerificationEmailJobResponse | null

  return {
    id: typeof payload?.id === 'string' ? payload.id : null,
    status: typeof payload?.status === 'string' ? payload.status : null
  }
}
