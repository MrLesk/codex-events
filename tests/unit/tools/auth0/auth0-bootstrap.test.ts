import { describe, expect, test } from 'vitest'

import {
  assertManagementAccessTokenScopes,
  buildRequiredClientUrls,
  buildClearedSignupPartials,
  buildExpectedLoginCustomText,
  buildUniversalLoginPageTemplate,
  requiredManagementApiScopes,
  resolveConfig
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
      AUTH0_DOMAIN: 'codex-hackathons-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_BASE_URL: 'http://localhost:3000',
      AUTH0_LOGIN_URI: 'https://dev.codex-hackathons.com/auth/login',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-hackathons.com'
    })

    expect(config.appBaseUrl).toBe('http://localhost:3000')
    expect(config.bddAppBaseUrl).toBe('http://localhost:3100')
  })

  test('infers the canonical branding defaults from an https app base url', () => {
    const config = resolveConfig({
      AUTH0_DOMAIN: 'codex-hackathons-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_BASE_URL: 'https://dev.codex-hackathons.com',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-hackathons.com'
    })

    expect(config.appDisplayName).toBe('Codex Hackathons')
    expect(config.bddAppBaseUrl).toBe('')
    expect(config.loginUri).toBe('https://dev.codex-hackathons.com/auth/login')
    expect(config.brandingPrimaryColor).toBe('#030213')
    expect(config.brandingPageBackgroundColor).toBe('#f3f3f5')
    expect(config.brandingLogoUrl).toBe('https://dev.codex-hackathons.com/auth0/codex-hackathons-wordmark.svg')
    expect(config.brandingFaviconUrl).toBe('https://dev.codex-hackathons.com/favicon.ico')
  })

  test('preserves explicit branding overrides', () => {
    const config = resolveConfig({
      AUTH0_DOMAIN: 'codex-hackathons-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_DISPLAY_NAME: 'Codex Community',
      AUTH0_APP_BASE_URL: 'https://dev.codex-hackathons.com',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-hackathons.com',
      AUTH0_LOGIN_URI: 'https://dev.codex-hackathons.com/custom-login',
      AUTH0_BRANDING_PRIMARY_COLOR: '#111111',
      AUTH0_BRANDING_PAGE_BACKGROUND_COLOR: '#fafafa',
      AUTH0_BRANDING_LOGO_URL: 'https://cdn.example.com/codex.svg',
      AUTH0_BRANDING_FAVICON_URL: 'https://cdn.example.com/favicon.ico'
    })

    expect(config.appDisplayName).toBe('Codex Community')
    expect(config.loginUri).toBe('https://dev.codex-hackathons.com/custom-login')
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
      AUTH0_DOMAIN: 'codex-hackathons-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_DISPLAY_NAME: 'Codex Hackathons',
      AUTH0_APP_BASE_URL: 'https://dev.codex-hackathons.com',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-hackathons.com'
    })

    expect(buildExpectedLoginCustomText(config)).toEqual({
      login: {
        description: 'Sign in to access your hackathons, applications, submissions, and judging workspace in Codex Hackathons.'
      }
    })
  })

  test('builds canonical Universal Login template with theme-colored links', () => {
    const config = resolveConfig({
      AUTH0_DOMAIN: 'codex-hackathons-dev.eu.auth0.com',
      AUTH0_MGMT_CLIENT_ID: 'management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'management-client-secret',
      AUTH0_APP_CLIENT_ID: 'app-client-id',
      AUTH0_APP_BASE_URL: 'https://dev.codex-hackathons.com',
      AUTH0_CUSTOM_DOMAIN: 'auth.dev.codex-hackathons.com'
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
