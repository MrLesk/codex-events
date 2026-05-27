import { getStablePersonas, loadProvisioningEnvironment, type ProvisionedStablePersona } from './personas.ts'

interface Auth0UserRecord {
  user_id: string
  email: string
  email_verified?: boolean
  identities?: Array<{
    connection?: string
  }>
  name?: string
  nickname?: string
  blocked?: boolean
  last_password_reset?: string
}

function normalizeDomain(domain: string) {
  return domain.startsWith('http://') || domain.startsWith('https://')
    ? domain
    : `https://${domain}`
}

function resolveManagementAudience(config: ReturnType<typeof loadProvisioningEnvironment>) {
  return config.AUTH0_MGMT_AUDIENCE ?? `${normalizeDomain(config.AUTH0_DOMAIN)}/api/v2/`
}

function sleep(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function resolveRetryDelay(response: Response, attempt: number) {
  const retryAfterSeconds = Number(response.headers.get('retry-after'))

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000
  }

  return Math.min(1000 * 2 ** attempt, 8000)
}

async function getManagementAccessToken(environment: NodeJS.ProcessEnv = process.env) {
  const config = loadProvisioningEnvironment(environment)
  const response = await fetch(`${normalizeDomain(config.AUTH0_DOMAIN)}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.AUTH0_MGMT_CLIENT_ID,
      client_secret: config.AUTH0_MGMT_CLIENT_SECRET,
      audience: resolveManagementAudience(config)
    })
  })

  if (!response.ok) {
    throw new Error(`Auth0 management token request failed with status ${response.status}.`)
  }

  const payload = await response.json() as { access_token?: string }

  if (!payload.access_token) {
    throw new Error('Auth0 management token response did not include an access token.')
  }

  return payload.access_token
}

async function auth0ManagementRequest(
  path: string,
  init: RequestInit,
  environment: NodeJS.ProcessEnv,
  accessToken: string
) {
  const config = loadProvisioningEnvironment(environment)
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(`${normalizeDomain(config.AUTH0_DOMAIN)}${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'content-type': 'application/json',
        ...(init.headers ?? {})
      }
    })

    if (response.ok) {
      return response
    }

    if (response.status === 429 && attempt < 4) {
      await sleep(resolveRetryDelay(response, attempt))
      continue
    }

    const errorBody = await response.text()
    throw new Error(`Auth0 management request for ${path} failed with status ${response.status}: ${errorBody}`)
  }

  throw new Error(`Auth0 management request for ${path} exhausted retry attempts.`)
}

async function findUserByEmail(email: string, environment: NodeJS.ProcessEnv, accessToken: string) {
  const response = await auth0ManagementRequest(
    `/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
    { method: 'GET' },
    environment,
    accessToken
  )

  return await response.json() as Auth0UserRecord[]
}

async function clearUserBlocks(userId: string, environment: NodeJS.ProcessEnv, accessToken: string) {
  const basePath = `/api/v2/user-blocks/${encodeURIComponent(userId)}`
  const config = loadProvisioningEnvironment(environment)
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(`${normalizeDomain(config.AUTH0_DOMAIN)}${basePath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'content-type': 'application/json'
      }
    })

    if (response.ok || response.status === 404) {
      return
    }

    if (response.status === 429 && attempt < 4) {
      await sleep(resolveRetryDelay(response, attempt))
      continue
    }

    const errorBody = await response.text()
    throw new Error(`Auth0 user block clear for ${userId} failed with status ${response.status}: ${errorBody}`)
  }
}

async function createUser(
  persona: ReturnType<typeof getStablePersonas>[number],
  environment: NodeJS.ProcessEnv,
  accessToken: string
) {
  const config = loadProvisioningEnvironment(environment)

  if (!config.NUXT_AUTH0_DATABASE_CONNECTION_NAME) {
    throw new Error('NUXT_AUTH0_DATABASE_CONNECTION_NAME is required to create missing Auth0 personas.')
  }

  const response = await auth0ManagementRequest('/api/v2/users', {
    method: 'POST',
    body: JSON.stringify({
      connection: config.NUXT_AUTH0_DATABASE_CONNECTION_NAME,
      email: persona.email,
      password: persona.password,
      name: persona.displayName,
      nickname: persona.nickname,
      email_verified: true,
      verify_email: false
    })
  }, environment, accessToken)

  return await response.json() as Auth0UserRecord
}

function userMatchesPersona(
  user: Auth0UserRecord,
  persona: ReturnType<typeof getStablePersonas>[number],
  environment: NodeJS.ProcessEnv
) {
  const config = loadProvisioningEnvironment(environment)

  return user.email === persona.email
    && user.email_verified === true
    && user.name === persona.displayName
    && user.nickname === persona.nickname
    && user.blocked === false
    && Boolean(user.last_password_reset)
    && user.identities?.[0]?.connection === config.NUXT_AUTH0_DATABASE_CONNECTION_NAME
}

async function updateUserProfile(
  userId: string,
  persona: ReturnType<typeof getStablePersonas>[number],
  environment: NodeJS.ProcessEnv,
  accessToken: string
) {
  const response = await auth0ManagementRequest(`/api/v2/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: persona.displayName,
      nickname: persona.nickname,
      blocked: false
    })
  }, environment, accessToken)

  return await response.json() as Auth0UserRecord
}

async function updateUserPassword(
  userId: string,
  connectionName: string | undefined,
  password: string,
  environment: NodeJS.ProcessEnv,
  accessToken: string
) {
  const config = loadProvisioningEnvironment(environment)
  const resolvedConnectionName = connectionName ?? config.NUXT_AUTH0_DATABASE_CONNECTION_NAME

  if (!resolvedConnectionName) {
    throw new Error('NUXT_AUTH0_DATABASE_CONNECTION_NAME is required when an existing Auth0 persona does not expose a connection name.')
  }

  const response = await auth0ManagementRequest(`/api/v2/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      connection: resolvedConnectionName,
      password
    })
  }, environment, accessToken)

  return await response.json() as Auth0UserRecord
}

export async function ensureStableAuth0Personas(environment: NodeJS.ProcessEnv = process.env): Promise<ProvisionedStablePersona[]> {
  const personas = getStablePersonas(environment)
  const accessToken = await getManagementAccessToken(environment)
  const ensuredPersonas: ProvisionedStablePersona[] = []

  for (const persona of personas) {
    try {
      const existingUsers = await findUserByEmail(persona.email, environment, accessToken)
      const matchedUser = existingUsers[0]
      const userRecord = matchedUser
        ? userMatchesPersona(matchedUser, persona, environment)
          ? matchedUser
          : await updateUserProfile(
              matchedUser.user_id,
              persona,
              environment,
              accessToken
            )
        : await createUser(persona, environment, accessToken)

      if (matchedUser) {
        await updateUserPassword(
          userRecord.user_id,
          userRecord.identities?.[0]?.connection ?? matchedUser.identities?.[0]?.connection,
          persona.password,
          environment,
          accessToken
        )
      }

      await clearUserBlocks(userRecord.user_id, environment, accessToken)

      ensuredPersonas.push({
        ...persona,
        auth0Subject: userRecord.user_id
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to reconcile stable Auth0 persona "${persona.key}" (${persona.email}): ${reason}`)
    }
  }

  return ensuredPersonas
}
