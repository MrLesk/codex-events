import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  Auth0ManagementRequestError,
  assertManagementAccessTokenScopes,
  buildDefaultBrandingTheme,
  buildMcpDefaultClientGrant,
  buildMcpResourceServerPayload,
  buildMcpTenantSettings,
  buildMcpTenantSettingsUpdate,
  buildRequiredClientUrls,
  buildClearedSignupPartials,
  buildExpectedLoginCustomText,
  buildPostLoginActionSecrets,
  buildUniversalLoginPageTemplate,
  ensureTrustedMcpCimdClients,
  isAuth0DefaultBrandingThemeUnavailable,
  isPaidAuth0LoginCustomizationUnavailable,
  parseMcpClientMetadataUrls,
  requiredManagementApiScopes,
  resolveConfig,
  resolvePrimaryButtonLabelColor,
  runOptionalPaidAuth0LoginCustomization
} from '../../../../tools/auth0/auth0-bootstrap'
import { deriveAuth0GeneratedSecret } from '../../../../tools/auth0/generated-secrets'

function createFixtureJwt(payload: Record<string, unknown>) {
  return [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature'
  ].join('.')
}

function createAuth0BootstrapEnvironment(overrides: Record<string, string> = {}) {
  return {
    AUTH0_MANAGEMENT_DOMAIN: 'codex-events-test.eu.auth0.com',
    AUTH0_MGMT_CLIENT_ID: 'management-client-id',
    AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
    NUXT_AUTH0_CLIENT_ID: 'app-client-id',
    NUXT_AUTH0_CLIENT_SECRET: 'app-client-secret',
    AUTH0_APP_BASE_URL: 'https://test.codex-events.com',
    AUTH0_CUSTOM_DOMAIN: 'auth.test.codex-events.com',
    AUTH0_DATABASE_CONNECTION_NAME: 'Username-Password-Authentication',
    AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: 'link-secret',
    AUTH0_MCP_CLIENT_METADATA_URLS: 'https://chatgpt.com/oauth/codex/test/client.json',
    ...overrides
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('auth0 bootstrap config', () => {
  test('keeps localhost Auth0 configuration limited to the application origin', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment({
      AUTH0_APP_BASE_URL: 'http://localhost:3000',
      AUTH0_BDD_APP_BASE_URL: 'http://localhost:3100',
      AUTH0_LOGIN_URI: 'https://test.codex-events.com/auth/login'
    }))

    expect(config.appBaseUrl).toBe('http://localhost:3000')
    expect(config).not.toHaveProperty('bddAppBaseUrl')
  })

  test('infers the canonical branding defaults from an https app base url', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment())

    expect(config.appDisplayName).toBe('Codex Events')
    expect(config.databaseConnectionName).toBe('Username-Password-Authentication')
    expect(config.loginUri).toBe('https://test.codex-events.com/auth/login')
    expect(config.brandingPrimaryColor).toBe('#030213')
    expect(config.brandingPrimaryButtonLabelColor).toBe('#ffffff')
    expect(config.brandingPageBackgroundColor).toBe('#f3f3f5')
    expect(config.brandingLogoUrl).toBe('https://test.codex-events.com/auth0/codex-events-wordmark.svg')
    expect(config.brandingFaviconUrl).toBe('https://test.codex-events.com/favicon.ico')
    expect(config.mcpResourceIdentifier).toBe('https://test.codex-events.com/mcp')
    expect(config.mcpScope).toBe('mcp')
    expect(config.mcpClientMetadataUrls).toEqual([
      'https://chatgpt.com/oauth/codex/test/client.json'
    ])
  })

  test('builds the strict Auth0 OAuth configuration for third-party MCP clients', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment())

    expect(buildMcpResourceServerPayload(config)).toEqual({
      name: 'Codex Events MCP',
      identifier: 'https://test.codex-events.com/mcp',
      signing_alg: 'RS256',
      token_dialect: 'rfc9068_profile',
      allow_offline_access: true,
      enforce_policies: false,
      subject_type_authorization: {
        user: { policy: 'require_client_grant' },
        client: { policy: 'deny_all' }
      },
      scopes: [{ value: 'mcp', description: 'Access Codex Events through MCP' }]
    })
    expect(buildMcpDefaultClientGrant(config)).toEqual({
      audience: 'https://test.codex-events.com/mcp',
      scope: ['mcp'],
      subject_type: 'user',
      default_for: 'third_party_clients'
    })
    expect(buildMcpTenantSettings()).toEqual({
      resource_parameter_profile: 'compatibility',
      authorization_response_iss_parameter_supported: true,
      client_id_metadata_document_supported: true,
      flags: { enable_dynamic_client_registration: false }
    })
    expect(buildMcpTenantSettingsUpdate({
      flags: {
        enable_dynamic_client_registration: false,
        disable_impersonation: true,
        allow_changing_enable_sso: false
      }
    })).toEqual(buildMcpTenantSettings())
  })

  test('validates and deduplicates trusted MCP Client ID Metadata Document URLs', () => {
    expect(parseMcpClientMetadataUrls([
      'https://chatgpt.com/oauth/codex/one/client.json',
      'https://chatgpt.com/oauth/codex/two/client.json',
      'https://chatgpt.com/oauth/codex/one/client.json'
    ].join(', '))).toEqual([
      'https://chatgpt.com/oauth/codex/one/client.json',
      'https://chatgpt.com/oauth/codex/two/client.json'
    ])

    expect(() => parseMcpClientMetadataUrls('')).toThrow('must contain at least one')
    expect(() => parseMcpClientMetadataUrls('http://chatgpt.com/client.json')).toThrow('invalid trusted CIMD URL')
    expect(() => parseMcpClientMetadataUrls('https://user:pass@chatgpt.com/client.json')).toThrow('invalid trusted CIMD URL')
    expect(() => parseMcpClientMetadataUrls('https://chatgpt.com/client.json#fragment')).toThrow('invalid trusted CIMD URL')
  })

  test('registers configured CIMD clients through the idempotent Auth0 upsert endpoint', async () => {
    const externalClientId = 'https://chatgpt.com/oauth/codex/test/client.json'
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      client_id: 'tpc_test',
      mapped_fields: { external_client_id: externalClientId },
      validation: { valid: true, violations: [] }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)
    const config = resolveConfig(createAuth0BootstrapEnvironment())
    const firstFailures: string[] = []
    const secondFailures: string[] = []

    await ensureTrustedMcpCimdClients(config, 'management-token', 'apply', firstFailures)
    await ensureTrustedMcpCimdClients(config, 'management-token', 'apply', secondFailures)

    expect(firstFailures).toEqual([])
    expect(secondFailures).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toBe('https://codex-events-test.eu.auth0.com/api/v2/clients/cimd/register')
      expect(call[1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify({ external_client_id: externalClientId })
      })
    }
  })

  test('checks that trusted metadata is an administrator-managed CIMD client', async () => {
    const externalClientId = 'https://chatgpt.com/oauth/codex/test/client.json'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      client_id: 'tpc_test',
      external_client_id: externalClientId,
      external_metadata_type: 'cimd',
      external_metadata_created_by: 'admin'
    }]), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })))
    const failures: string[] = []

    await ensureTrustedMcpCimdClients(
      resolveConfig(createAuth0BootstrapEnvironment()),
      'management-token',
      'check',
      failures
    )

    expect(failures).toEqual([])
  })

  test('defaults the Auth0 custom domain from the app base url host', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment({
      AUTH0_CUSTOM_DOMAIN: ''
    }))

    expect(config.customDomain).toBe('auth.test.codex-events.com')
  })

  test('defaults the Auth0 database connection name when it is not set', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment({
      AUTH0_DATABASE_CONNECTION_NAME: ''
    }))

    expect(config.databaseConnectionName).toBe('Username-Password-Authentication')
  })

  test('preserves explicit branding overrides', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment({
      AUTH0_APP_DISPLAY_NAME: 'Codex Community',
      AUTH0_LOGIN_URI: 'https://test.codex-events.com/custom-login',
      AUTH0_BRANDING_PRIMARY_COLOR: '#111111',
      AUTH0_BRANDING_PAGE_BACKGROUND_COLOR: '#fafafa',
      AUTH0_BRANDING_LOGO_URL: 'https://cdn.example.com/codex.svg',
      AUTH0_BRANDING_FAVICON_URL: 'https://cdn.example.com/favicon.ico'
    }))

    expect(config.appDisplayName).toBe('Codex Community')
    expect(config.loginUri).toBe('https://test.codex-events.com/custom-login')
    expect(config.brandingPrimaryColor).toBe('#111111')
    expect(config.brandingPrimaryButtonLabelColor).toBe('#ffffff')
    expect(config.brandingPageBackgroundColor).toBe('#fafafa')
    expect(config.brandingLogoUrl).toBe('https://cdn.example.com/codex.svg')
    expect(config.brandingFaviconUrl).toBe('https://cdn.example.com/favicon.ico')
  })

  test('derives a readable Auth0 primary button label color', () => {
    expect(resolvePrimaryButtonLabelColor('#030213')).toBe('#ffffff')
    expect(resolvePrimaryButtonLabelColor('#f3f3f5')).toBe('#030213')
  })

  test('builds the required callback, logout, and origin URLs for the application origin', () => {
    const urls = buildRequiredClientUrls({
      appBaseUrl: 'http://localhost:3000'
    })

    expect(urls).toEqual({
      callbacks: [
        'http://localhost:3000/auth/callback',
        'http://localhost:3000/auth/link/callback'
      ],
      logoutUrls: [
        'http://localhost:3000'
      ],
      origins: [
        'http://localhost:3000'
      ]
    })
  })

  test('builds canonical login prompt subtitle copy from config', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment({
      AUTH0_APP_DISPLAY_NAME: 'Codex Events'
    }))

    expect(buildExpectedLoginCustomText(config)).toEqual({
      login: {
        description: 'Sign in to access your events, applications, submissions, and judging workspace in Codex Events.'
      }
    })
  })

  test('builds Auth0 Action secrets for account linking without app-runtime management names', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment())

    const secrets = buildPostLoginActionSecrets(config)
    expect(secrets.map(secret => secret.name)).toEqual([
      'APP_BASE_URL',
      'APP_CLIENT_ID',
      'DATABASE_CONNECTION_NAME',
      'ACCOUNT_LINK_CHALLENGE_SECRET',
      'MANAGEMENT_API_DOMAIN',
      'MANAGEMENT_API_CLIENT_ID',
      'MANAGEMENT_API_CLIENT_SECRET'
    ])
  })

  test('derives the account-link challenge secret from the Auth0 app client secret when omitted', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment({
      AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: ''
    }))

    expect(config.accountLinkChallengeSecret).toBe(
      deriveAuth0GeneratedSecret('app-client-secret', 'account-link-challenge')
    )
  })

  test('rejects mismatched account-link challenge secret overrides', () => {
    expect(() => resolveConfig(createAuth0BootstrapEnvironment({
      AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: 'action-secret',
      NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: 'runtime-secret'
    }))).toThrow('must match')
  })

  test('builds canonical Universal Login template with theme-colored links', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment())

    const template = buildUniversalLoginPageTemplate(config)

    expect(template).toContain(':where(body._widget-auto-layout a) { color: #030213; }')
    expect(template).not.toContain('body._widget-auto-layout a { color: #030213 !important; }')
    expect(template).toContain('body._widget-auto-layout a[role="button"],')
    expect(template).toContain('color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;')
    expect(template).toContain('body._widget-auto-layout #prompt-logo-center {')
    expect(template).toContain('{%- auth0:widget -%}')
  })

  test('detects missing Auth0 default branding theme responses for the create path', () => {
    const error = new Auth0ManagementRequestError(
      '/api/v2/branding/themes/default',
      404,
      '{"statusCode":404,"error":"Not Found","message":"There was an error retrieving branding settings: invalid theme ID","errorCode":"theme_not_found"}'
    )

    expect(isAuth0DefaultBrandingThemeUnavailable(error)).toBe(true)
  })

  test('builds a complete default Auth0 branding theme create payload', () => {
    const config = resolveConfig(createAuth0BootstrapEnvironment())

    expect(buildDefaultBrandingTheme(config)).toMatchObject({
      borders: {
        button_border_radius: 6,
        button_border_weight: 1,
        buttons_style: 'rounded',
        input_border_radius: 6,
        input_border_weight: 1,
        inputs_style: 'rounded',
        show_widget_shadow: true,
        widget_border_weight: 0,
        widget_corner_radius: 8
      },
      colors: {
        primary_button: '#030213',
        primary_button_label: '#ffffff',
        links_focused_components: '#030213',
        base_focus_color: '#030213',
        base_hover_color: '#030213',
        captcha_widget_theme: 'auto'
      },
      displayName: 'Codex Events',
      fonts: {
        font_url: '',
        links_style: 'normal',
        reference_text_size: 16
      },
      page_background: {
        background_color: '#f3f3f5',
        background_image_url: '',
        page_layout: 'center'
      },
      widget: {
        header_text_alignment: 'center',
        logo_height: 50,
        logo_position: 'center',
        logo_url: 'https://test.codex-events.com/auth0/codex-events-wordmark.svg',
        social_buttons_layout: 'bottom'
      }
    })
  })

  test('clears only the hosted signup consent partial while preserving other prompt partials', () => {
    expect(buildClearedSignupPartials({
      'form-content-start': '<p>Custom start</p>',
      'form-content-end': '<p>Consent checkboxes</p>'
    })).toEqual({
      'form-content-start': '<p>Custom start</p>'
    })

    expect(buildClearedSignupPartials({
      'form-content-end': '<p>Consent checkboxes</p>'
    })).toEqual({})
  })

  test('detects paid-plan Universal Login customization failures as skippable', () => {
    const error = new Auth0ManagementRequestError(
      '/api/v2/branding/templates/universal-login',
      402,
      '{"statusCode":402,"error":"Payment Required","message":"A paid subscription is required for this feature."}'
    )

    expect(isPaidAuth0LoginCustomizationUnavailable(error)).toBe(true)
  })

  test('continues after paid-plan Auth0 login customization failures', async () => {
    const warnings: string[] = []

    const skipped = await runOptionalPaidAuth0LoginCustomization(
      async () => {
        throw new Auth0ManagementRequestError(
          '/api/v2/prompts/signup/partials',
          402,
          '{"statusCode":402,"error":"Payment Required","message":"A paid subscription is required for this feature."}'
        )
      },
      warning => warnings.push(warning)
    )

    expect(skipped).toBe(true)
    expect(warnings).toEqual([
      expect.stringContaining('/api/v2/prompts/signup/partials')
    ])
  })

  test('rethrows non-paid Auth0 bootstrap failures', async () => {
    await expect(runOptionalPaidAuth0LoginCustomization(async () => {
      throw new Auth0ManagementRequestError(
        '/api/v2/clients/app-client-id',
        400,
        '{"statusCode":400,"error":"Bad Request","message":"Invalid callback URL"}'
      )
    })).rejects.toThrow('/api/v2/clients/app-client-id')
  })

  test('requires update:users in the Auth0 management token scope set', () => {
    const accessToken = createFixtureJwt({
      permissions: requiredManagementApiScopes.filter(scope => scope !== 'update:users')
    })

    expect(() => assertManagementAccessTokenScopes({
      accessToken
    })).toThrow('update:users')
  })

  test('requires MCP resource, client-grant, and connection management scopes', () => {
    for (const missing of ['create:clients', 'create:resource_servers', 'create:client_grants', 'update:connections']) {
      const accessToken = createFixtureJwt({
        permissions: requiredManagementApiScopes.filter(scope => scope !== missing)
      })
      expect(() => assertManagementAccessTokenScopes({ accessToken })).toThrow(missing)
    }
  })

  test('accepts management tokens that include the full required scope set', () => {
    const accessToken = createFixtureJwt({
      permissions: [...requiredManagementApiScopes]
    })

    expect(() => assertManagementAccessTokenScopes({
      accessToken
    })).not.toThrow()
  })
})
