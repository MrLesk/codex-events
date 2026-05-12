import { describe, expect, test } from 'vitest'

import {
  buildDeployWranglerConfig,
  parseDeployTarget,
  resolveDeployConfigInput
} from '../../../../tools/deploy/generate-wrangler-config'

function createEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    DEPLOY_DEV_BASE_DOMAIN: 'dev.example.com',
    DEPLOY_PRODUCTION_BASE_DOMAIN: 'events.example.com',
    DEPLOY_ZONE_NAME: 'example.com',
    DEPLOY_WORKER_NAME: 'events-worker',
    DEPLOY_D1_DATABASE_NAME: 'events-db',
    DEPLOY_D1_DATABASE_ID: '11111111-1111-4111-8111-111111111111',
    DEPLOY_PROFILE_ICONS_BUCKET: 'events-profile-icons',
    DEPLOY_EVENT_IMAGES_BUCKET: 'events-event-images',
    DEPLOY_APPLICATION_REVIEW_EMAIL_QUEUE: 'events-application-review-email-delivery',
    DEPLOY_EVENT_OUTCOME_EMAIL_QUEUE: 'events-event-outcome-email-delivery',
    DEPLOY_LUMA_SYNC_QUEUE: 'events-application-luma-sync',
    NUXT_AUTH0_MANAGEMENT_DOMAIN: 'tenant.eu.auth0.com',
    NUXT_AUTH0_DATABASE_CONNECTION_NAME: 'Username-Password-Authentication',
    NUXT_OUTBOUND_EMAIL_FROM_EMAIL: 'notifications@example.com',
    NUXT_OUTBOUND_EMAIL_REPLY_TO: 'support@example.com',
    ...overrides
  }
}

describe('deploy Wrangler config generator', () => {
  test('parses explicit deployment targets', () => {
    expect(parseDeployTarget('dev')).toBe('dev')
    expect(parseDeployTarget('production')).toBe('production')
    expect(() => parseDeployTarget('staging')).toThrow('Usage:')
  })

  test('generates dev config from DEPLOY_DEV_BASE_DOMAIN', () => {
    const input = resolveDeployConfigInput('dev', createEnvironment())
    const config = buildDeployWranglerConfig(input)

    expect(input.appBaseUrl).toBe('https://dev.example.com')
    expect(input.auth0CustomDomain).toBe('auth.dev.example.com')
    expect(input.eventImagesPublicCdnBaseUrl).toBe('https://cdn.dev.example.com')
    expect(input.lumaWebhookUrl).toBe('https://dev.example.com/api/public/luma/webhooks')
    expect(config.name).toBe('events-worker')
    expect(config.routes).toEqual([
      {
        pattern: 'dev.example.com',
        zone_name: 'example.com',
        custom_domain: true
      }
    ])
    expect(config.vars).toMatchObject({
      NUXT_AUTH0_DOMAIN: 'auth.dev.example.com',
      NUXT_AUTH0_APP_BASE_URL: 'https://dev.example.com',
      NUXT_EVENT_IMAGES_PUBLIC_CDN_BASE_URL: 'https://cdn.dev.example.com',
      NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME: 'events-application-review-email-delivery',
      NUXT_EVENT_OUTCOME_EMAILS_QUEUE_NAME: 'events-event-outcome-email-delivery',
      NUXT_LUMA_QUEUE_NAME: 'events-application-luma-sync'
    })
    expect(config.d1_databases[0]).toMatchObject({
      database_name: 'events-db',
      database_id: '11111111-1111-4111-8111-111111111111'
    })
  })

  test('generates production config from DEPLOY_PRODUCTION_BASE_DOMAIN', () => {
    const input = resolveDeployConfigInput('production', createEnvironment())
    const config = buildDeployWranglerConfig(input)

    expect(input.appBaseUrl).toBe('https://events.example.com')
    expect(config.routes[0]?.pattern).toBe('events.example.com')
    expect(config.vars.NUXT_AUTH0_DOMAIN).toBe('auth.events.example.com')
    expect(config.vars.NUXT_EVENT_IMAGES_PUBLIC_CDN_BASE_URL).toBe('https://cdn.events.example.com')
    expect(config.ratelimits.map(rateLimit => rateLimit.namespace_id)).toEqual([
      '3001',
      '3002',
      '3003'
    ])
  })

  test('requires target-specific base domain and shared deploy metadata', () => {
    expect(() => resolveDeployConfigInput('dev', createEnvironment({
      DEPLOY_DEV_BASE_DOMAIN: ''
    }))).toThrow('DEPLOY_DEV_BASE_DOMAIN is required')

    expect(() => resolveDeployConfigInput('production', createEnvironment({
      DEPLOY_D1_DATABASE_ID: ''
    }))).toThrow('DEPLOY_D1_DATABASE_ID is required')
  })

  test('honors explicit domain overrides', () => {
    const input = resolveDeployConfigInput('production', createEnvironment({
      DEPLOY_AUTH0_CUSTOM_DOMAIN: 'login.example.com',
      DEPLOY_EVENT_IMAGES_PUBLIC_CDN_BASE_URL: 'https://media.example.com/assets/',
      DEPLOY_LUMA_WEBHOOK_URL: 'https://hooks.example.com/luma/'
    }))

    expect(input.auth0CustomDomain).toBe('login.example.com')
    expect(input.eventImagesPublicCdnBaseUrl).toBe('https://media.example.com/assets')
    expect(input.lumaWebhookUrl).toBe('https://hooks.example.com/luma')
  })
})
