import { describe, expect, test } from 'vitest'

import {
  buildExpectedLoginCustomText,
  buildUniversalLoginPageTemplate,
  resolveConfig
} from '../../../../tools/auth0/auth0-bootstrap'

describe('auth0 bootstrap config', () => {
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
})
