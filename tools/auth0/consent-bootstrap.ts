import 'dotenv/config'

type CommandMode = 'apply' | 'check'

interface TenantConfig {
  tenantDomain: string
  managementClientId: string
  managementClientSecret: string
  managementAudience: string
  appClientId: string
  appBaseUrl: string
  customDomain: string
  termsUrl: string
  privacyUrl: string
  actionName: string
  actionRuntime: string
}

interface Auth0CustomDomain {
  custom_domain_id: string
  domain: string
  primary: boolean
  is_default: boolean
  status?: string
  verification?: {
    status?: string
  }
  certificate?: {
    status?: string
  }
}

interface Auth0Client {
  client_id: string
  callbacks?: string[]
  allowed_logout_urls?: string[]
  web_origins?: string[]
  allowed_origins?: string[]
}

interface Auth0ActionVersion {
  id: string
  code?: string
  runtime?: string
}

interface Auth0ActionSummary {
  id: string
  name: string
  runtime?: string
  code?: string
  deployed_version?: Auth0ActionVersion | null
  current_version?: Auth0ActionVersion | null
  all_changes_deployed?: boolean
}

interface Auth0BindingsResponse {
  bindings: Array<{
    action?: {
      id: string
      name: string
    }
    display_name?: string
  }>
}

const consentClaimNamespace = 'https://codex-hackathons/consents'
const defaultActionName = 'codex-signup-consent-claims'
const defaultActionRuntime = 'node22'
const consentCheckboxId = 'ulp-terms-of-service'
const consentCheckboxTemplate = `<div class="ulp-field"><input class="ulp-input" type="checkbox" id="${consentCheckboxId}" name="${consentCheckboxId}" required><label for="${consentCheckboxId}">{{ prompt.screen.texts.var-tos }}</label></div>`

const consentActionCode = `exports.onExecutePostLogin = async (event, api) => {
  const claimNamespace = '${consentClaimNamespace}';
  const metadata = (event.user.app_metadata && event.user.app_metadata.codex_consents) || {};
  const hasRecordedConsent = Boolean(metadata.privacy_policy_accepted_at && metadata.platform_terms_accepted_at);
  const loginCount = Number(event.stats && event.stats.logins_count ? event.stats.logins_count : 0);

  const rawSignupConsent = event.request && event.request.body
    ? event.request.body['${consentCheckboxId}']
    : undefined;
  const acceptedThisSignup = rawSignupConsent === true
    || rawSignupConsent === 'true'
    || rawSignupConsent === 'on'
    || rawSignupConsent === '1'
    || rawSignupConsent === 1;

  if (!hasRecordedConsent && loginCount <= 1 && !acceptedThisSignup) {
    api.access.deny('consent_required', 'You must accept Terms and Conditions and Privacy Policy to create your account.');
    return;
  }

  const now = new Date().toISOString();
  const nextConsent = {
    ...metadata,
    privacy_policy_accepted_at: metadata.privacy_policy_accepted_at || now,
    platform_terms_accepted_at: metadata.platform_terms_accepted_at || now
  };

  if (!hasRecordedConsent) {
    api.user.setAppMetadata('codex_consents', nextConsent);
  }

  api.idToken.setCustomClaim(\`\${claimNamespace}/privacy_policy\`, true);
  api.idToken.setCustomClaim(\`\${claimNamespace}/platform_terms\`, true);
};
`

function getUsageMessage() {
  return `Usage: bun tools/auth0/consent-bootstrap.ts <apply|check>

Environment variables:
- AUTH0_DOMAIN (fallback: AUTH0_TEST_DOMAIN)
- AUTH0_MGMT_CLIENT_ID (fallback: AUTH0_TEST_MGMT_CLIENT_ID)
- AUTH0_MGMT_CLIENT_SECRET (fallback: AUTH0_TEST_MGMT_CLIENT_SECRET)
- AUTH0_MGMT_AUDIENCE (fallback: AUTH0_TEST_MGMT_AUDIENCE or https://<AUTH0_DOMAIN>/api/v2/)
- AUTH0_APP_CLIENT_ID (fallback: NUXT_AUTH0_CLIENT_ID)
- AUTH0_APP_BASE_URL (fallback: NUXT_AUTH0_APP_BASE_URL)
- AUTH0_CUSTOM_DOMAIN (fallback: NUXT_AUTH0_DOMAIN)
- AUTH0_TERMS_URL (default: <AUTH0_APP_BASE_URL>/terms-and-conditions)
- AUTH0_PRIVACY_URL (default: <AUTH0_APP_BASE_URL>/privacy-policy)
- AUTH0_CONSENT_ACTION_NAME (default: ${defaultActionName})
- AUTH0_CONSENT_ACTION_RUNTIME (default: ${defaultActionRuntime})
`
}

function normalizeDomain(domain: string) {
  return domain.startsWith('http://') || domain.startsWith('https://')
    ? domain
    : `https://${domain}`
}

function normalizeMultiline(value: string | undefined) {
  return (value ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
}

function normalizeUrlString(value: string) {
  const url = new URL(value)
  return `${url.origin}${url.pathname.replace(/\/$/, '')}${url.search}${url.hash}`
}

function asSet(values: string[] | undefined) {
  return new Set((values ?? []).filter(Boolean))
}

function parseCommandMode(argument: string | undefined): CommandMode {
  if (argument === 'apply' || argument === 'check') {
    return argument
  }

  throw new Error(getUsageMessage())
}

function firstDefinedValue(...values: Array<string | undefined>) {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return value.trim()
    }
  }

  return ''
}

function requireConfigField(value: string, name: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function resolveConfig(environment: NodeJS.ProcessEnv): TenantConfig {
  const tenantDomain = requireConfigField(
    firstDefinedValue(environment.AUTH0_DOMAIN, environment.AUTH0_TEST_DOMAIN),
    'AUTH0_DOMAIN (or AUTH0_TEST_DOMAIN)'
  )
  const appBaseUrl = requireConfigField(
    firstDefinedValue(environment.AUTH0_APP_BASE_URL, environment.NUXT_AUTH0_APP_BASE_URL),
    'AUTH0_APP_BASE_URL (or NUXT_AUTH0_APP_BASE_URL)'
  )

  const normalizedAppBaseUrl = normalizeUrlString(appBaseUrl)
  const defaultManagementAudience = `${normalizeDomain(tenantDomain)}/api/v2/`

  return {
    tenantDomain,
    managementClientId: requireConfigField(
      firstDefinedValue(environment.AUTH0_MGMT_CLIENT_ID, environment.AUTH0_TEST_MGMT_CLIENT_ID),
      'AUTH0_MGMT_CLIENT_ID (or AUTH0_TEST_MGMT_CLIENT_ID)'
    ),
    managementClientSecret: requireConfigField(
      firstDefinedValue(environment.AUTH0_MGMT_CLIENT_SECRET, environment.AUTH0_TEST_MGMT_CLIENT_SECRET),
      'AUTH0_MGMT_CLIENT_SECRET (or AUTH0_TEST_MGMT_CLIENT_SECRET)'
    ),
    managementAudience: firstDefinedValue(
      environment.AUTH0_MGMT_AUDIENCE,
      environment.AUTH0_TEST_MGMT_AUDIENCE,
      defaultManagementAudience
    ),
    appClientId: requireConfigField(
      firstDefinedValue(environment.AUTH0_APP_CLIENT_ID, environment.NUXT_AUTH0_CLIENT_ID),
      'AUTH0_APP_CLIENT_ID (or NUXT_AUTH0_CLIENT_ID)'
    ),
    appBaseUrl: normalizedAppBaseUrl,
    customDomain: requireConfigField(
      firstDefinedValue(environment.AUTH0_CUSTOM_DOMAIN, environment.NUXT_AUTH0_DOMAIN),
      'AUTH0_CUSTOM_DOMAIN (or NUXT_AUTH0_DOMAIN)'
    ),
    termsUrl: normalizeUrlString(firstDefinedValue(environment.AUTH0_TERMS_URL, `${normalizedAppBaseUrl}/terms-and-conditions`)),
    privacyUrl: normalizeUrlString(firstDefinedValue(environment.AUTH0_PRIVACY_URL, `${normalizedAppBaseUrl}/privacy-policy`)),
    actionName: firstDefinedValue(environment.AUTH0_CONSENT_ACTION_NAME, defaultActionName),
    actionRuntime: firstDefinedValue(environment.AUTH0_CONSENT_ACTION_RUNTIME, defaultActionRuntime)
  }
}

function buildExpectedConsentText(config: TenantConfig) {
  return `I agree to the [Terms and Conditions](${config.termsUrl}) and [Privacy Policy](${config.privacyUrl}).`
}

function hasRequiredConsentCheckbox(partial: string | undefined) {
  const normalized = normalizeMultiline(partial)

  return normalized.includes(`id="${consentCheckboxId}"`)
    && normalized.includes(`name="${consentCheckboxId}"`)
    && normalized.includes('required')
    && normalized.includes('{{ prompt.screen.texts.var-tos }}')
}

function resolveRetryDelay(response: Response, attempt: number) {
  const retryAfterSeconds = Number(response.headers.get('retry-after'))

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000
  }

  return Math.min(1000 * 2 ** attempt, 8000)
}

async function sleep(milliseconds: number) {
  await new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function getManagementAccessToken(config: TenantConfig) {
  const response = await fetch(`${normalizeDomain(config.tenantDomain)}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.managementClientId,
      client_secret: config.managementClientSecret,
      audience: config.managementAudience
    })
  })

  if (!response.ok) {
    const reason = await response.text()
    throw new Error(`Auth0 management token request failed with status ${response.status}: ${reason}`)
  }

  const payload = await response.json() as { access_token?: string }

  if (!payload.access_token) {
    throw new Error('Auth0 management token response did not include an access token.')
  }

  return payload.access_token
}

async function auth0ManagementRequest(
  config: TenantConfig,
  token: string,
  path: string,
  init: RequestInit,
  options: { ignoreNotFound?: boolean } = {}
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${normalizeDomain(config.tenantDomain)}${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init.headers ?? {})
      }
    })

    if (response.ok) {
      return response
    }

    if (options.ignoreNotFound && response.status === 404) {
      return response
    }

    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      await sleep(resolveRetryDelay(response, attempt))
      continue
    }

    const errorBody = await response.text()
    throw new Error(`Auth0 management request for ${path} failed with status ${response.status}: ${errorBody}`)
  }

  throw new Error(`Auth0 management request for ${path} exhausted retry attempts.`)
}

async function getCustomDomains(config: TenantConfig, token: string) {
  const response = await auth0ManagementRequest(config, token, '/api/v2/custom-domains', {
    method: 'GET'
  })

  return await response.json() as Auth0CustomDomain[]
}

async function ensureCustomDomain(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  let customDomains = await getCustomDomains(config, token)
  let customDomain = customDomains.find(domain => domain.domain === config.customDomain)

  if (!customDomain && mode === 'apply') {
    await auth0ManagementRequest(config, token, '/api/v2/custom-domains', {
      method: 'POST',
      body: JSON.stringify({
        domain: config.customDomain,
        type: 'auth0_managed_certs',
        tls_policy: 'recommended'
      })
    })
    customDomains = await getCustomDomains(config, token)
    customDomain = customDomains.find(domain => domain.domain === config.customDomain)
    console.log(`Applied: created custom domain ${config.customDomain}.`)
  }

  if (!customDomain) {
    failures.push(`Missing custom domain ${config.customDomain}.`)
    return
  }

  if (mode === 'apply' && (!customDomain.primary || !customDomain.is_default)) {
    await auth0ManagementRequest(config, token, `/api/v2/custom-domains/${encodeURIComponent(customDomain.custom_domain_id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        primary: true
      })
    })
    customDomains = await getCustomDomains(config, token)
    customDomain = customDomains.find(domain => domain.domain === config.customDomain)
    console.log(`Applied: set ${config.customDomain} as primary Auth0 custom domain.`)
  }

  if (!customDomain?.primary) {
    failures.push(`Custom domain ${config.customDomain} is not primary.`)
  }

  if (!customDomain?.is_default) {
    failures.push(`Custom domain ${config.customDomain} is not default.`)
  }

  if (customDomain?.status !== 'ready') {
    failures.push(`Custom domain ${config.customDomain} status is ${customDomain?.status ?? 'unknown'}, expected ready.`)
  }

  if (customDomain?.verification?.status !== 'verified') {
    failures.push(`Custom domain ${config.customDomain} verification status is ${customDomain?.verification?.status ?? 'unknown'}, expected verified.`)
  }

  if (customDomain?.certificate?.status !== 'provisioned') {
    failures.push(`Custom domain ${config.customDomain} certificate status is ${customDomain?.certificate?.status ?? 'unknown'}, expected provisioned.`)
  }
}

async function getClient(config: TenantConfig, token: string) {
  const response = await auth0ManagementRequest(config, token, `/api/v2/clients/${encodeURIComponent(config.appClientId)}`, {
    method: 'GET'
  })

  return await response.json() as Auth0Client
}

function addAll(values: Set<string>, additions: string[]) {
  let changed = false

  for (const value of additions) {
    if (!values.has(value)) {
      values.add(value)
      changed = true
    }
  }

  return changed
}

function hasAll(set: Set<string>, required: string[]) {
  return required.every(value => set.has(value))
}

async function ensureClientUrls(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  const client = await getClient(config, token)
  const callbackUrl = new URL('/auth/callback', `${config.appBaseUrl}/`).toString()
  const baseOrigin = new URL(config.appBaseUrl).origin
  const requiredCallbacks = [callbackUrl]
  const requiredLogoutUrls = [config.appBaseUrl]
  const requiredOrigins = [baseOrigin]

  const callbacks = asSet(client.callbacks)
  const allowedLogoutUrls = asSet(client.allowed_logout_urls)
  const webOrigins = asSet(client.web_origins)
  const allowedOrigins = asSet(client.allowed_origins)

  const callbackChanged = addAll(callbacks, requiredCallbacks)
  const logoutChanged = addAll(allowedLogoutUrls, requiredLogoutUrls)
  const webOriginsChanged = addAll(webOrigins, requiredOrigins)
  const allowedOriginsChanged = addAll(allowedOrigins, requiredOrigins)
  const needsPatch = callbackChanged || logoutChanged || webOriginsChanged || allowedOriginsChanged

  if (mode === 'apply' && needsPatch) {
    await auth0ManagementRequest(config, token, `/api/v2/clients/${encodeURIComponent(config.appClientId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        callbacks: [...callbacks].sort(),
        allowed_logout_urls: [...allowedLogoutUrls].sort(),
        web_origins: [...webOrigins].sort(),
        allowed_origins: [...allowedOrigins].sort()
      })
    })
    console.log(`Applied: ensured callback/logout/origin URLs on Auth0 client ${config.appClientId}.`)
  }

  if (!hasAll(callbacks, requiredCallbacks)) {
    failures.push(`Auth0 client ${config.appClientId} is missing required callback URL ${callbackUrl}.`)
  }

  if (!hasAll(allowedLogoutUrls, requiredLogoutUrls)) {
    failures.push(`Auth0 client ${config.appClientId} is missing required logout URL ${config.appBaseUrl}.`)
  }

  if (!hasAll(webOrigins, requiredOrigins)) {
    failures.push(`Auth0 client ${config.appClientId} is missing required web origin ${baseOrigin}.`)
  }

  if (!hasAll(allowedOrigins, requiredOrigins)) {
    failures.push(`Auth0 client ${config.appClientId} is missing required allowed origin ${baseOrigin}.`)
  }
}

async function getSignupCustomText(config: TenantConfig, token: string) {
  const response = await auth0ManagementRequest(config, token, '/api/v2/prompts/signup-id/custom-text/en', {
    method: 'GET'
  })
  return await response.json() as { ['signup-id']?: { ['var-tos']?: string } }
}

async function ensureSignupCustomText(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  const expectedConsentText = buildExpectedConsentText(config)
  let currentCustomText = await getSignupCustomText(config, token)
  let currentValue = currentCustomText['signup-id']?.['var-tos'] ?? ''

  if (mode === 'apply' && normalizeMultiline(currentValue) !== normalizeMultiline(expectedConsentText)) {
    await auth0ManagementRequest(config, token, '/api/v2/prompts/signup-id/custom-text/en', {
      method: 'PUT',
      body: JSON.stringify({
        'signup-id': {
          ...currentCustomText['signup-id'],
          'var-tos': expectedConsentText
        }
      })
    })
    currentCustomText = await getSignupCustomText(config, token)
    currentValue = currentCustomText['signup-id']?.['var-tos'] ?? ''
    console.log('Applied: updated signup prompt consent text (var-tos).')
  }

  if (normalizeMultiline(currentValue) !== normalizeMultiline(expectedConsentText)) {
    failures.push('Auth0 signup prompt custom text var-tos does not match expected privacy/terms links.')
  }
}

async function getSignupPartials(config: TenantConfig, token: string) {
  const response = await auth0ManagementRequest(config, token, '/api/v2/prompts/signup-id/partials', {
    method: 'GET'
  })
  return await response.json() as { ['signup-id']?: Record<string, string> }
}

async function ensureSignupPartials(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  let currentPartials = await getSignupPartials(config, token)
  let signupPartials = currentPartials['signup-id'] ?? {}
  let currentFormContentEnd = signupPartials['form-content-end']

  if (mode === 'apply' && !hasRequiredConsentCheckbox(currentFormContentEnd)) {
    const nextFormContentEnd = normalizeMultiline(currentFormContentEnd)
      ? `${normalizeMultiline(currentFormContentEnd)}\n${consentCheckboxTemplate}`
      : consentCheckboxTemplate

    await auth0ManagementRequest(config, token, '/api/v2/prompts/signup-id/partials', {
      method: 'PUT',
      body: JSON.stringify({
        'signup-id': {
          ...signupPartials,
          'form-content-end': nextFormContentEnd
        }
      })
    })
    currentPartials = await getSignupPartials(config, token)
    signupPartials = currentPartials['signup-id'] ?? {}
    currentFormContentEnd = signupPartials['form-content-end']
    console.log('Applied: ensured mandatory signup consent checkbox partial.')
  }

  if (!hasRequiredConsentCheckbox(currentFormContentEnd)) {
    failures.push(`Auth0 signup prompt partial form-content-end is missing required ${consentCheckboxId} consent checkbox.`)
  }
}

async function listActions(config: TenantConfig, token: string) {
  const response = await auth0ManagementRequest(config, token, '/api/v2/actions/actions?per_page=100', {
    method: 'GET'
  })
  const payload = await response.json() as { actions?: Auth0ActionSummary[] } | Auth0ActionSummary[]

  if (Array.isArray(payload)) {
    return payload
  }

  return payload.actions ?? []
}

async function ensureAction(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  let actions = await listActions(config, token)
  let action = actions.find(candidate => candidate.name === config.actionName)

  if (!action && mode === 'apply') {
    const response = await auth0ManagementRequest(config, token, '/api/v2/actions/actions', {
      method: 'POST',
      body: JSON.stringify({
        name: config.actionName,
        supported_triggers: [{ id: 'post-login', version: 'v3' }],
        runtime: config.actionRuntime,
        code: consentActionCode
      })
    })
    action = await response.json() as Auth0ActionSummary
    console.log(`Applied: created Auth0 post-login action ${config.actionName}.`)
  }

  if (!action) {
    failures.push(`Missing Auth0 action ${config.actionName}.`)
    return null
  }

  const expectedCode = normalizeMultiline(consentActionCode)
  const runtimeMatches = normalizeMultiline(action.runtime) === normalizeMultiline(config.actionRuntime)
  const currentVersionMatches = normalizeMultiline(action.current_version?.code) === expectedCode
  const needsUpdate = !runtimeMatches || !currentVersionMatches

  if (mode === 'apply' && needsUpdate) {
    await auth0ManagementRequest(config, token, `/api/v2/actions/actions/${encodeURIComponent(action.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        runtime: config.actionRuntime,
        code: consentActionCode
      })
    })
    console.log(`Applied: updated Auth0 action ${config.actionName} code/runtime.`)
    actions = await listActions(config, token)
    action = actions.find(candidate => candidate.name === config.actionName)
  }

  if (!action) {
    failures.push(`Auth0 action ${config.actionName} could not be loaded after update.`)
    return null
  }

  const stillNeedsDeploy = normalizeMultiline(action.deployed_version?.code) !== expectedCode
    || !action.all_changes_deployed

  if (mode === 'apply' && stillNeedsDeploy) {
    await auth0ManagementRequest(config, token, `/api/v2/actions/actions/${encodeURIComponent(action.id)}/deploy`, {
      method: 'POST',
      body: JSON.stringify({})
    })
    console.log(`Applied: deployed Auth0 action ${config.actionName}.`)
  }

  const refreshedActions = await listActions(config, token)
  const refreshedAction = refreshedActions.find(candidate => candidate.name === config.actionName)

  if (!refreshedAction) {
    failures.push(`Auth0 action ${config.actionName} could not be loaded after deploy.`)
    return null
  }

  const refreshedDeployedCode = normalizeMultiline(refreshedAction.deployed_version?.code)

  if (refreshedDeployedCode !== expectedCode) {
    failures.push(`Auth0 action ${config.actionName} deployed code does not match expected canonical consent logic.`)
  }

  if (normalizeMultiline(refreshedAction.runtime) !== normalizeMultiline(config.actionRuntime)) {
    failures.push(`Auth0 action ${config.actionName} runtime is ${refreshedAction.runtime ?? 'unknown'}, expected ${config.actionRuntime}.`)
  }

  return refreshedAction
}

async function getPostLoginBindings(config: TenantConfig, token: string) {
  const response = await auth0ManagementRequest(config, token, '/api/v2/actions/triggers/post-login/bindings', {
    method: 'GET'
  })
  return await response.json() as Auth0BindingsResponse
}

async function ensureActionBinding(
  config: TenantConfig,
  token: string,
  mode: CommandMode,
  action: Auth0ActionSummary | null,
  failures: string[]
) {
  if (!action) {
    failures.push(`Cannot verify post-login action bindings because action ${config.actionName} is missing.`)
    return
  }

  const bindings = await getPostLoginBindings(config, token)
  const hasActionBinding = bindings.bindings.some(binding =>
    binding.action?.id === action.id || binding.action?.name === config.actionName
  )

  if (mode === 'apply' && !hasActionBinding) {
    const nextBindings = bindings.bindings.map(binding => ({
      ref: {
        type: 'action_name',
        value: binding.action?.name ?? ''
      },
      display_name: binding.display_name ?? binding.action?.name ?? ''
    }))
      .filter(binding => binding.ref.value.length > 0)

    nextBindings.push({
      ref: {
        type: 'action_name',
        value: config.actionName
      },
      display_name: config.actionName
    })

    await auth0ManagementRequest(config, token, '/api/v2/actions/triggers/post-login/bindings', {
      method: 'PATCH',
      body: JSON.stringify({
        bindings: nextBindings
      })
    })
    console.log(`Applied: bound Auth0 action ${config.actionName} to post-login trigger.`)
  }

  const refreshedBindings = await getPostLoginBindings(config, token)
  const nowHasBinding = refreshedBindings.bindings.some(binding =>
    binding.action?.id === action.id || binding.action?.name === config.actionName
  )

  if (!nowHasBinding) {
    failures.push(`Auth0 action ${config.actionName} is not bound to the post-login trigger.`)
  }
}

async function main() {
  try {
    const mode = parseCommandMode(process.argv[2])
    const config = resolveConfig(process.env)
    const managementToken = await getManagementAccessToken(config)
    const failures: string[] = []

    console.log(`Auth0 consent bootstrap mode: ${mode}`)
    console.log(`Tenant domain: ${config.tenantDomain}`)
    console.log(`Custom domain target: ${config.customDomain}`)
    console.log(`App base URL target: ${config.appBaseUrl}`)

    await ensureCustomDomain(config, managementToken, mode, failures)
    await ensureClientUrls(config, managementToken, mode, failures)
    await ensureSignupCustomText(config, managementToken, mode, failures)
    await ensureSignupPartials(config, managementToken, mode, failures)
    const action = await ensureAction(config, managementToken, mode, failures)
    await ensureActionBinding(config, managementToken, mode, action, failures)

    if (failures.length > 0) {
      console.error('Auth0 consent bootstrap check failed:')
      for (const failure of failures) {
        console.error(`- ${failure}`)
      }
      process.exit(1)
    }

    console.log('Auth0 consent bootstrap check passed.')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}

await main()
