import 'dotenv/config'

type CommandMode = 'apply' | 'check'

interface TenantConfig {
  tenantDomain: string
  managementClientId: string
  managementClientSecret: string
  managementAudience: string
  appClientId: string
  appBaseUrl: string
  loginUri: string
  customDomain: string
  termsUrl: string
  privacyUrl: string
  actionName: string
  actionRuntime: string
  brandingPrimaryColor: string
  brandingPageBackgroundColor: string
  brandingLogoUrl: string
  brandingFaviconUrl: string
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
  initiate_login_uri?: string
}

interface Auth0TenantSettings {
  default_redirection_uri?: string | null
}

interface Auth0Branding {
  logo_url?: string
  favicon_url?: string
  colors?: {
    primary?: string
    page_background?: string
  }
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
const termsConsentCheckboxId = 'ulp-terms-of-service'
const privacyConsentCheckboxId = 'ulp-privacy-policy'
const consentHelperMessageId = 'ulp-consent-helper'
const consentGuardScriptMarker = 'consent-guard-v2'
const signupPromptKeys = ['signup-id', 'signup'] as const
type SignupPromptKey = typeof signupPromptKeys[number]

function buildConsentCheckboxPartials(config: TenantConfig) {
  return [
    '<style>',
    `#${consentHelperMessageId} {`,
    '  margin-top: 8px;',
    '  font-size: 12px;',
    '  color: #b42318;',
    '}',
    'button[disabled][type="submit"], button[disabled][name="action"] {',
    '  cursor: not-allowed;',
    '  opacity: 0.65;',
    '  filter: saturate(0.7);',
    '}',
    '.consent-disabled {',
    '  cursor: not-allowed !important;',
    '  opacity: 0.65 !important;',
    '  filter: saturate(0.7) !important;',
    '  pointer-events: none !important;',
    '}',
    '</style>',
    `<div class="ulp-field"><input class="ulp-input" type="checkbox" id="${termsConsentCheckboxId}" name="${termsConsentCheckboxId}" required><label for="${termsConsentCheckboxId}">I agree to the <a href="${config.termsUrl}" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>.</label></div>`,
    `<div class="ulp-field"><input class="ulp-input" type="checkbox" id="${privacyConsentCheckboxId}" name="${privacyConsentCheckboxId}" required><label for="${privacyConsentCheckboxId}">I agree to the <a href="${config.privacyUrl}" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</label></div>`,
    `<p id="${consentHelperMessageId}" role="alert" aria-live="polite">Accept both consents to continue.</p>`,
    `<script data-consent-guard="${consentGuardScriptMarker}">(function(){function init(){var terms=document.getElementById('${termsConsentCheckboxId}');var privacy=document.getElementById('${privacyConsentCheckboxId}');var helper=document.getElementById('${consentHelperMessageId}');var submitButton=document.querySelector('button[type="submit"],button[name="action"]:not([value])');var socialButtons=Array.prototype.slice.call(document.querySelectorAll('button[name="action"][value],button[data-action-button-social],button[data-provider],a[data-action-button-social],a[href*="connection="]'));if(!terms||!privacy||!submitButton){return;}function setDisabled(el,disabled){if('disabled'in el){el.disabled=disabled;}el.setAttribute('aria-disabled',String(disabled));el.classList.toggle('consent-disabled',disabled);}function update(){var ready=Boolean(terms.checked&&privacy.checked);setDisabled(submitButton,!ready);submitButton.title=ready?'':'Accept both consents to continue';socialButtons.forEach(function(button){setDisabled(button,!ready);button.title=ready?'':'Accept both consents to continue';});if(helper){helper.style.display=ready?'none':'block';}}terms.addEventListener('change',update);privacy.addEventListener('change',update);update();}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}})();</script>`
  ].join('\n')
}

const consentActionCode = `exports.onExecutePostLogin = async (event, api) => {
  const claimNamespace = '${consentClaimNamespace}';
  const metadata = (event.user.app_metadata && event.user.app_metadata.codex_consents) || {};
  const hasRecordedConsent = Boolean(metadata.privacy_policy_accepted_at && metadata.platform_terms_accepted_at);

  const body = (event.request && event.request.body) || {};
  const accepted = (value) => value === true
    || value === 'true'
    || value === 'on'
    || value === '1'
    || value === 1;
  const acceptedTerms = accepted(body['${termsConsentCheckboxId}']);
  const acceptedPrivacy = accepted(body['${privacyConsentCheckboxId}']);
  const acceptedThisSignup = acceptedTerms && acceptedPrivacy;

  if (!hasRecordedConsent && !acceptedThisSignup) {
    return;
  }

  if (!hasRecordedConsent) {
    const now = new Date().toISOString();
    const nextConsent = {
      ...metadata,
      privacy_policy_accepted_at: metadata.privacy_policy_accepted_at || now,
      platform_terms_accepted_at: metadata.platform_terms_accepted_at || now
    };
    api.user.setAppMetadata('codex_consents', nextConsent);
  }

  api.idToken.setCustomClaim(\`\${claimNamespace}/privacy_policy\`, true);
  api.idToken.setCustomClaim(\`\${claimNamespace}/platform_terms\`, true);
};
`

function getUsageMessage() {
  return `Usage: bun tools/auth0/auth0-bootstrap.ts <apply|check>

Environment variables:
- AUTH0_DOMAIN (fallback: AUTH0_TEST_DOMAIN)
- AUTH0_MGMT_CLIENT_ID (fallback: AUTH0_TEST_MGMT_CLIENT_ID)
- AUTH0_MGMT_CLIENT_SECRET (fallback: AUTH0_TEST_MGMT_CLIENT_SECRET)
- AUTH0_MGMT_AUDIENCE (fallback: AUTH0_TEST_MGMT_AUDIENCE or https://<AUTH0_DOMAIN>/api/v2/)
- AUTH0_APP_CLIENT_ID (fallback: NUXT_AUTH0_CLIENT_ID)
- AUTH0_APP_BASE_URL (fallback: NUXT_AUTH0_APP_BASE_URL)
- AUTH0_LOGIN_URI (required when AUTH0_APP_BASE_URL is not https; must be https)
- AUTH0_CUSTOM_DOMAIN (fallback: NUXT_AUTH0_DOMAIN)
- AUTH0_TERMS_URL (default: <AUTH0_APP_BASE_URL>/terms-and-conditions)
- AUTH0_PRIVACY_URL (default: <AUTH0_APP_BASE_URL>/privacy-policy)
- AUTH0_CONSENT_ACTION_NAME (default: ${defaultActionName})
- AUTH0_CONSENT_ACTION_RUNTIME (default: ${defaultActionRuntime})
- AUTH0_BRANDING_PRIMARY_COLOR (optional hex color, example: #1f2937)
- AUTH0_BRANDING_PAGE_BACKGROUND_COLOR (optional hex color, example: #f8fafc)
- AUTH0_BRANDING_LOGO_URL (optional URL)
- AUTH0_BRANDING_FAVICON_URL (optional URL)
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

function normalizeHttpsUrlString(value: string, name: string) {
  const normalized = normalizeUrlString(value)

  if (!normalized.startsWith('https://')) {
    throw new Error(`${name} must be an https URL.`)
  }

  return normalized
}

function normalizeHexColor(value: string, name: string) {
  const normalized = value.trim().toLowerCase()

  if (!/^#[0-9a-f]{6}$/.test(normalized)) {
    throw new Error(`${name} must be a 6-digit hex color in the form #rrggbb.`)
  }

  return normalized
}

function normalizeOptionalHexColor(value: string | undefined, name: string) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) {
    return ''
  }
  return normalizeHexColor(trimmed, name)
}

function normalizeOptionalUrl(value: string | undefined) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) {
    return ''
  }
  return normalizeUrlString(trimmed)
}

function normalizeColorForComparison(value: string | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function normalizeUrlForComparison(value: string | undefined) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    return ''
  }

  try {
    return normalizeUrlString(trimmed)
  } catch {
    return trimmed
  }
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
  const inferredLoginUri = normalizedAppBaseUrl.startsWith('https://')
    ? `${normalizedAppBaseUrl}/auth/login`
    : ''
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
    loginUri: normalizeHttpsUrlString(
      requireConfigField(
        firstDefinedValue(environment.AUTH0_LOGIN_URI, inferredLoginUri),
        'AUTH0_LOGIN_URI (or inferred AUTH0_APP_BASE_URL/auth/login when AUTH0_APP_BASE_URL is https)'
      ),
      'AUTH0_LOGIN_URI (or inferred AUTH0_APP_BASE_URL/auth/login)'
    ),
    customDomain: requireConfigField(
      firstDefinedValue(environment.AUTH0_CUSTOM_DOMAIN, environment.NUXT_AUTH0_DOMAIN),
      'AUTH0_CUSTOM_DOMAIN (or NUXT_AUTH0_DOMAIN)'
    ),
    termsUrl: normalizeUrlString(firstDefinedValue(environment.AUTH0_TERMS_URL, `${normalizedAppBaseUrl}/terms-and-conditions`)),
    privacyUrl: normalizeUrlString(firstDefinedValue(environment.AUTH0_PRIVACY_URL, `${normalizedAppBaseUrl}/privacy-policy`)),
    actionName: firstDefinedValue(environment.AUTH0_CONSENT_ACTION_NAME, defaultActionName),
    actionRuntime: firstDefinedValue(environment.AUTH0_CONSENT_ACTION_RUNTIME, defaultActionRuntime),
    brandingPrimaryColor: normalizeOptionalHexColor(environment.AUTH0_BRANDING_PRIMARY_COLOR, 'AUTH0_BRANDING_PRIMARY_COLOR'),
    brandingPageBackgroundColor: normalizeOptionalHexColor(
      environment.AUTH0_BRANDING_PAGE_BACKGROUND_COLOR,
      'AUTH0_BRANDING_PAGE_BACKGROUND_COLOR'
    ),
    brandingLogoUrl: normalizeOptionalUrl(environment.AUTH0_BRANDING_LOGO_URL),
    brandingFaviconUrl: normalizeOptionalUrl(environment.AUTH0_BRANDING_FAVICON_URL)
  }
}

function buildExpectedConsentText(config: TenantConfig) {
  return `I agree to the [Terms and Conditions](${config.termsUrl}) and [Privacy Policy](${config.privacyUrl}).`
}

function hasRequiredConsentUi(partial: string | undefined, config: TenantConfig) {
  const normalized = normalizeMultiline(partial)

  return normalized.includes(`id="${termsConsentCheckboxId}"`)
    && normalized.includes(`name="${termsConsentCheckboxId}"`)
    && normalized.includes(`id="${privacyConsentCheckboxId}"`)
    && normalized.includes(`name="${privacyConsentCheckboxId}"`)
    && normalized.includes('required')
    && normalized.includes(config.termsUrl)
    && normalized.includes(config.privacyUrl)
    && normalized.includes(`id="${consentHelperMessageId}"`)
    && normalized.includes(`data-consent-guard="${consentGuardScriptMarker}"`)
}

function buildExpectedResetPasswordCustomText(config: TenantConfig) {
  return {
    'reset-password-success': {
      buttonText: 'Back to Codex Hackathons',
      description: `Your password has been changed successfully. Continue at ${config.loginUri}.`
    },
    'reset-password-error': {
      backToLoginLinkText: 'Back to Codex Hackathons',
      descriptionExpired: `This link has expired. Return to ${config.loginUri} and select "Forgot Your Password" to request a new email.`,
      descriptionGeneric: `There was a problem processing this request. Return to ${config.loginUri} and request a new password reset email.`,
      descriptionUsed: `This link has already been used. Return to ${config.loginUri} and request a new password reset email.`,
      eventTitleExpired: 'Link Expired',
      eventTitleGeneric: 'Link Invalid',
      eventTitleUsed: 'Link Already Used'
    }
  } as const
}

function hasRequiredResetPasswordText(
  customText: Record<string, Record<string, string>> | undefined,
  config: TenantConfig
) {
  const success = customText?.['reset-password-success'] ?? {}
  const error = customText?.['reset-password-error'] ?? {}
  const buttonText = normalizeMultiline(success.buttonText)
  const description = normalizeMultiline(success.description)
  const backToLoginLinkText = normalizeMultiline(error.backToLoginLinkText)
  const descriptionExpired = normalizeMultiline(error.descriptionExpired)
  const descriptionGeneric = normalizeMultiline(error.descriptionGeneric)
  const descriptionUsed = normalizeMultiline(error.descriptionUsed)

  return buttonText === 'Back to Codex Hackathons'
    && description.includes(config.loginUri)
    && backToLoginLinkText === 'Back to Codex Hackathons'
    && descriptionExpired.includes(config.loginUri)
    && descriptionGeneric.includes(config.loginUri)
    && descriptionUsed.includes(config.loginUri)
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

  if (mode === 'apply' && !customDomain.primary) {
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

async function getTenantSettings(config: TenantConfig, token: string) {
  const response = await auth0ManagementRequest(config, token, '/api/v2/tenants/settings', {
    method: 'GET'
  })

  return await response.json() as Auth0TenantSettings
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
  const expectedLoginUri = config.loginUri

  const callbacks = asSet(client.callbacks)
  const allowedLogoutUrls = asSet(client.allowed_logout_urls)
  const webOrigins = asSet(client.web_origins)
  const allowedOrigins = asSet(client.allowed_origins)
  const currentLoginUri = client.initiate_login_uri ? normalizeUrlString(client.initiate_login_uri) : ''

  const callbackChanged = addAll(callbacks, requiredCallbacks)
  const logoutChanged = addAll(allowedLogoutUrls, requiredLogoutUrls)
  const webOriginsChanged = addAll(webOrigins, requiredOrigins)
  const allowedOriginsChanged = addAll(allowedOrigins, requiredOrigins)
  const loginUriChanged = currentLoginUri !== expectedLoginUri
  const needsPatch = callbackChanged || logoutChanged || webOriginsChanged || allowedOriginsChanged || loginUriChanged

  if (mode === 'apply' && needsPatch) {
    await auth0ManagementRequest(config, token, `/api/v2/clients/${encodeURIComponent(config.appClientId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        callbacks: [...callbacks].sort(),
        allowed_logout_urls: [...allowedLogoutUrls].sort(),
        web_origins: [...webOrigins].sort(),
        allowed_origins: [...allowedOrigins].sort(),
        initiate_login_uri: expectedLoginUri
      })
    })
    console.log(`Applied: ensured callback/logout/origin URLs and initiate_login_uri on Auth0 client ${config.appClientId}.`)
  }

  const verifiedClient = mode === 'apply' && needsPatch
    ? await getClient(config, token)
    : client
  const verifiedCallbacks = asSet(verifiedClient.callbacks)
  const verifiedAllowedLogoutUrls = asSet(verifiedClient.allowed_logout_urls)
  const verifiedWebOrigins = asSet(verifiedClient.web_origins)
  const verifiedAllowedOrigins = asSet(verifiedClient.allowed_origins)
  const verifiedLoginUri = verifiedClient.initiate_login_uri ? normalizeUrlString(verifiedClient.initiate_login_uri) : ''

  if (!hasAll(verifiedCallbacks, requiredCallbacks)) {
    failures.push(`Auth0 client ${config.appClientId} is missing required callback URL ${callbackUrl}.`)
  }

  if (!hasAll(verifiedAllowedLogoutUrls, requiredLogoutUrls)) {
    failures.push(`Auth0 client ${config.appClientId} is missing required logout URL ${config.appBaseUrl}.`)
  }

  if (!hasAll(verifiedWebOrigins, requiredOrigins)) {
    failures.push(`Auth0 client ${config.appClientId} is missing required web origin ${baseOrigin}.`)
  }

  if (!hasAll(verifiedAllowedOrigins, requiredOrigins)) {
    failures.push(`Auth0 client ${config.appClientId} is missing required allowed origin ${baseOrigin}.`)
  }

  if (verifiedLoginUri !== expectedLoginUri) {
    failures.push(`Auth0 client ${config.appClientId} initiate_login_uri is ${verifiedClient.initiate_login_uri ?? 'unset'}, expected ${expectedLoginUri}.`)
  }
}

async function ensureTenantDefaultRedirection(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  const settings = await getTenantSettings(config, token)
  const expectedDefaultRedirectionUri = config.loginUri
  const currentDefaultRedirectionUri = settings.default_redirection_uri
    ? normalizeUrlString(settings.default_redirection_uri)
    : ''
  const needsPatch = currentDefaultRedirectionUri !== expectedDefaultRedirectionUri

  if (mode === 'apply' && needsPatch) {
    await auth0ManagementRequest(config, token, '/api/v2/tenants/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        default_redirection_uri: expectedDefaultRedirectionUri
      })
    })
    console.log('Applied: ensured Auth0 tenant default_redirection_uri for reset-password fallback return.')
  }

  const verifiedSettings = mode === 'apply' && needsPatch
    ? await getTenantSettings(config, token)
    : settings
  const verifiedDefaultRedirectionUri = verifiedSettings.default_redirection_uri
    ? normalizeUrlString(verifiedSettings.default_redirection_uri)
    : ''

  if (verifiedDefaultRedirectionUri !== expectedDefaultRedirectionUri) {
    failures.push(`Auth0 tenant default_redirection_uri is ${verifiedSettings.default_redirection_uri ?? 'unset'}, expected ${expectedDefaultRedirectionUri}.`)
  }
}

function hasRequestedBrandingConfig(config: TenantConfig) {
  return Boolean(
    config.brandingPrimaryColor
    || config.brandingPageBackgroundColor
    || config.brandingLogoUrl
    || config.brandingFaviconUrl
  )
}

async function getBranding(config: TenantConfig, token: string) {
  const response = await auth0ManagementRequest(config, token, '/api/v2/branding', {
    method: 'GET'
  })
  return await response.json() as Auth0Branding
}

async function ensureBranding(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  if (!hasRequestedBrandingConfig(config)) {
    return
  }

  const expected: Auth0Branding = {}
  if (config.brandingLogoUrl) {
    expected.logo_url = config.brandingLogoUrl
  }
  if (config.brandingFaviconUrl) {
    expected.favicon_url = config.brandingFaviconUrl
  }
  if (config.brandingPrimaryColor || config.brandingPageBackgroundColor) {
    expected.colors = {}
    if (config.brandingPrimaryColor) {
      expected.colors.primary = config.brandingPrimaryColor
    }
    if (config.brandingPageBackgroundColor) {
      expected.colors.page_background = config.brandingPageBackgroundColor
    }
  }

  const current = await getBranding(config, token)
  const currentPrimary = normalizeColorForComparison(current.colors?.primary)
  const currentPageBackground = normalizeColorForComparison(current.colors?.page_background)
  const expectedPrimary = normalizeColorForComparison(expected.colors?.primary)
  const expectedPageBackground = normalizeColorForComparison(expected.colors?.page_background)
  const currentLogoUrl = normalizeUrlForComparison(current.logo_url)
  const currentFaviconUrl = normalizeUrlForComparison(current.favicon_url)
  const expectedLogoUrl = normalizeOptionalUrl(expected.logo_url)
  const expectedFaviconUrl = normalizeOptionalUrl(expected.favicon_url)

  const primaryNeedsPatch = Boolean(expectedPrimary) && currentPrimary !== expectedPrimary
  const pageBackgroundNeedsPatch = Boolean(expectedPageBackground) && currentPageBackground !== expectedPageBackground
  const logoNeedsPatch = Boolean(expectedLogoUrl) && currentLogoUrl !== expectedLogoUrl
  const faviconNeedsPatch = Boolean(expectedFaviconUrl) && currentFaviconUrl !== expectedFaviconUrl
  const needsPatch = primaryNeedsPatch || pageBackgroundNeedsPatch || logoNeedsPatch || faviconNeedsPatch

  if (mode === 'apply' && needsPatch) {
    await auth0ManagementRequest(config, token, '/api/v2/branding', {
      method: 'PATCH',
      body: JSON.stringify(expected)
    })
    console.log('Applied: ensured Auth0 branding colors/logo/favicon.')
  }

  const verified = mode === 'apply' && needsPatch
    ? await getBranding(config, token)
    : current

  if (expectedPrimary && normalizeColorForComparison(verified.colors?.primary) !== expectedPrimary) {
    failures.push(`Auth0 branding primary color is ${verified.colors?.primary ?? 'unset'}, expected ${expected.colors?.primary}.`)
  }

  if (expectedPageBackground && normalizeColorForComparison(verified.colors?.page_background) !== expectedPageBackground) {
    failures.push(`Auth0 branding page background color is ${verified.colors?.page_background ?? 'unset'}, expected ${expected.colors?.page_background}.`)
  }

  if (expectedLogoUrl && normalizeUrlForComparison(verified.logo_url) !== expectedLogoUrl) {
    failures.push(`Auth0 branding logo_url is ${verified.logo_url ?? 'unset'}, expected ${expected.logo_url}.`)
  }

  if (expectedFaviconUrl && normalizeUrlForComparison(verified.favicon_url) !== expectedFaviconUrl) {
    failures.push(`Auth0 branding favicon_url is ${verified.favicon_url ?? 'unset'}, expected ${expected.favicon_url}.`)
  }
}

async function getSignupCustomText(config: TenantConfig, token: string, promptKey: SignupPromptKey) {
  const response = await auth0ManagementRequest(config, token, `/api/v2/prompts/${promptKey}/custom-text/en`, {
    method: 'GET'
  })
  return await response.json() as Record<string, { ['var-tos']?: string }>
}

async function ensureSignupCustomText(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  const expectedConsentText = buildExpectedConsentText(config)
  for (const promptKey of signupPromptKeys) {
    let currentCustomText = await getSignupCustomText(config, token, promptKey)
    let currentValue = currentCustomText[promptKey]?.['var-tos'] ?? ''

    if (mode === 'apply' && normalizeMultiline(currentValue) !== normalizeMultiline(expectedConsentText)) {
      await auth0ManagementRequest(config, token, `/api/v2/prompts/${promptKey}/custom-text/en`, {
        method: 'PUT',
        body: JSON.stringify({
          [promptKey]: {
            ...currentCustomText[promptKey],
            'var-tos': expectedConsentText
          }
        })
      })
      currentCustomText = await getSignupCustomText(config, token, promptKey)
      currentValue = currentCustomText[promptKey]?.['var-tos'] ?? ''
      console.log(`Applied: updated signup prompt (${promptKey}) consent text (var-tos).`)
    }

    if (normalizeMultiline(currentValue) !== normalizeMultiline(expectedConsentText)) {
      failures.push(`Auth0 signup prompt (${promptKey}) custom text var-tos does not match expected privacy/terms links.`)
    }
  }
}

async function getSignupPartials(config: TenantConfig, token: string, promptKey: SignupPromptKey) {
  const response = await auth0ManagementRequest(config, token, `/api/v2/prompts/${promptKey}/partials`, {
    method: 'GET'
  })
  return await response.json() as Record<string, Record<string, string>>
}

async function ensureSignupPartials(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  const expectedPartials = buildConsentCheckboxPartials(config)

  for (const promptKey of signupPromptKeys) {
    let currentPartials = await getSignupPartials(config, token, promptKey)
    let signupPartials = currentPartials[promptKey] ?? {}
    let currentFormContentEnd = signupPartials['form-content-end']

    if (mode === 'apply' && normalizeMultiline(currentFormContentEnd) !== normalizeMultiline(expectedPartials)) {
      await auth0ManagementRequest(config, token, `/api/v2/prompts/${promptKey}/partials`, {
        method: 'PUT',
        body: JSON.stringify({
          [promptKey]: {
            ...signupPartials,
            'form-content-end': expectedPartials
          }
        })
      })
      currentPartials = await getSignupPartials(config, token, promptKey)
      signupPartials = currentPartials[promptKey] ?? {}
      currentFormContentEnd = signupPartials['form-content-end']
      console.log(`Applied: ensured canonical signup consent UI partial for ${promptKey}.`)
    }

    if (!hasRequiredConsentUi(currentFormContentEnd, config)) {
      failures.push(`Auth0 signup prompt (${promptKey}) partial form-content-end is missing required two-consent UI and guard behavior.`)
    }
  }
}

async function getResetPasswordCustomText(config: TenantConfig, token: string) {
  const response = await auth0ManagementRequest(config, token, '/api/v2/prompts/reset-password/custom-text/en', {
    method: 'GET'
  })
  return await response.json() as Record<string, Record<string, string>>
}

async function ensureResetPasswordCustomText(config: TenantConfig, token: string, mode: CommandMode, failures: string[]) {
  const expected = buildExpectedResetPasswordCustomText(config)
  let current = await getResetPasswordCustomText(config, token)

  if (
    mode === 'apply'
    && normalizeMultiline(JSON.stringify(current)) !== normalizeMultiline(JSON.stringify(expected))
  ) {
    await auth0ManagementRequest(config, token, '/api/v2/prompts/reset-password/custom-text/en', {
      method: 'PUT',
      body: JSON.stringify(expected)
    })
    current = await getResetPasswordCustomText(config, token)
    console.log('Applied: updated reset-password success/error copy with app return CTA.')
  }

  if (!hasRequiredResetPasswordText(current, config)) {
    failures.push('Auth0 reset-password copy is missing required app return CTA text for success and error states.')
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

    console.log(`Auth0 bootstrap mode: ${mode}`)
    console.log(`Tenant domain: ${config.tenantDomain}`)
    console.log(`Custom domain target: ${config.customDomain}`)
    console.log(`App base URL target: ${config.appBaseUrl}`)

    await ensureCustomDomain(config, managementToken, mode, failures)
    await ensureClientUrls(config, managementToken, mode, failures)
    await ensureTenantDefaultRedirection(config, managementToken, mode, failures)
    await ensureBranding(config, managementToken, mode, failures)
    await ensureSignupCustomText(config, managementToken, mode, failures)
    await ensureSignupPartials(config, managementToken, mode, failures)
    await ensureResetPasswordCustomText(config, managementToken, mode, failures)
    const action = await ensureAction(config, managementToken, mode, failures)
    await ensureActionBinding(config, managementToken, mode, action, failures)

    if (failures.length > 0) {
      console.error('Auth0 bootstrap check failed:')
      for (const failure of failures) {
        console.error(`- ${failure}`)
      }
      process.exit(1)
    }

    console.log('Auth0 bootstrap check passed.')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}

await main()
