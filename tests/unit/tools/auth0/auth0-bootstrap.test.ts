import { describe, expect, test } from 'vitest'

import {
  Auth0ManagementRequestError,
  assertManagementAccessTokenScopes,
  buildRequiredClientUrls,
  buildClearedSignupPartials,
  buildExpectedLoginCustomText,
  buildUniversalLoginPageTemplate,
  isPaidAuth0LoginCustomizationUnavailable,
  requiredManagementApiScopes,
  resolveConfig,
  runOptionalPaidAuth0LoginCustomization
} from '../../../../tools/auth0/auth0-bootstrap'

function createFixtureJwt(payload: Record<string, unknown>) {
  return [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature'
  ].join('.')
}

describe('auth0 bootstrap config', () => {
  test('infers the dedicated local BDD app base url for localhost development', () => {
    const config = resolveConfig({
      AUTH0_MANAGEMENT_DOMAIN: 'codex-events-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_BASE_URL: 'http://localhost:3000',
      AUTH0_LOGIN_URI: 'https://dev.codex-events.com/auth/login',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-events.com'
    })

    expect(config.appBaseUrl).toBe('http://localhost:3000')
    expect(config.bddAppBaseUrl).toBe('http://localhost:3100')
  })

  test('infers the canonical branding defaults from an https app base url', () => {
    const config = resolveConfig({
      AUTH0_MANAGEMENT_DOMAIN: 'codex-events-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_BASE_URL: 'https://dev.codex-events.com',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-events.com'
    })

    expect(config.appDisplayName).toBe('Codex Events')
    expect(config.bddAppBaseUrl).toBe('')
    expect(config.loginUri).toBe('https://dev.codex-events.com/auth/login')
    expect(config.brandingPrimaryColor).toBe('#030213')
    expect(config.brandingPageBackgroundColor).toBe('#f3f3f5')
    expect(config.brandingLogoUrl).toBe('https://dev.codex-events.com/auth0/codex-events-wordmark.svg')
    expect(config.brandingFaviconUrl).toBe('https://dev.codex-events.com/favicon.ico')
  })

  test('preserves explicit branding overrides', () => {
    const config = resolveConfig({
      AUTH0_MANAGEMENT_DOMAIN: 'codex-events-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_DISPLAY_NAME: 'Codex Community',
      AUTH0_APP_BASE_URL: 'https://dev.codex-events.com',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-events.com',
      AUTH0_LOGIN_URI: 'https://dev.codex-events.com/custom-login',
      AUTH0_BRANDING_PRIMARY_COLOR: '#111111',
      AUTH0_BRANDING_PAGE_BACKGROUND_COLOR: '#fafafa',
      AUTH0_BRANDING_LOGO_URL: 'https://cdn.example.com/codex.svg',
      AUTH0_BRANDING_FAVICON_URL: 'https://cdn.example.com/favicon.ico'
    })

    expect(config.appDisplayName).toBe('Codex Community')
    expect(config.loginUri).toBe('https://dev.codex-events.com/custom-login')
    expect(config.brandingPrimaryColor).toBe('#111111')
    expect(config.brandingPageBackgroundColor).toBe('#fafafa')
    expect(config.brandingLogoUrl).toBe('https://cdn.example.com/codex.svg')
    expect(config.brandingFaviconUrl).toBe('https://cdn.example.com/favicon.ico')
  })

  test('builds the required callback, logout, and origin URLs for local app and BDD origins', () => {
    const urls = buildRequiredClientUrls({
      appBaseUrl: 'http://localhost:3000',
      bddAppBaseUrl: 'http://localhost:3100'
    })

    expect(urls).toEqual({
      callbacks: [
        'http://localhost:3000/auth/bdd-callback',
        'http://localhost:3000/auth/callback',
        'http://localhost:3000/auth/link/callback',
        'http://localhost:3100/auth/bdd-callback',
        'http://localhost:3100/auth/callback',
        'http://localhost:3100/auth/link/callback'
      ],
      logoutUrls: [
        'http://localhost:3000',
        'http://localhost:3100'
      ],
      origins: [
        'http://localhost:3000',
        'http://localhost:3100'
      ]
    })
  })

  test('builds canonical login prompt subtitle copy from config', () => {
    const config = resolveConfig({
      AUTH0_MANAGEMENT_DOMAIN: 'codex-events-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_DISPLAY_NAME: 'Codex Events',
      AUTH0_APP_BASE_URL: 'https://dev.codex-events.com',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-events.com'
    })

    expect(buildExpectedLoginCustomText(config)).toEqual({
      login: {
        description: 'Sign in to access your events, applications, submissions, and judging workspace in Codex Events.'
      }
    })
  })

  test('builds canonical Universal Login template with theme-colored links', () => {
    const config = resolveConfig({
      AUTH0_MANAGEMENT_DOMAIN: 'codex-events-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_BASE_URL: 'https://dev.codex-events.com',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-events.com'
    })

    const template = buildUniversalLoginPageTemplate(config)

    expect(template).toContain('body._widget-auto-layout a { color: #030213 !important; }')
    expect(template).toContain('body._widget-auto-layout #prompt-logo-center {')
    expect(template).toContain('{%- auth0:widget -%}')
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

  test('accepts management tokens that include the full required scope set', () => {
    const accessToken = createFixtureJwt({
      permissions: [...requiredManagementApiScopes]
    })

    expect(() => assertManagementAccessTokenScopes({
      accessToken
    })).not.toThrow()
  })
})
