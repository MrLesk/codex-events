import { describe, expect, test } from 'vitest'

import {
  buildDeployQueueConsumerConfigs,
  buildDeployWranglerConfig,
  parseDeployTarget,
  resolveDeployConfigInput,
  resolveDeployResourceNames
} from '../../../../tools/deploy/generate-wrangler-config'

function createEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    BASE_DOMAIN: 'events.example.com',
    CF_ZONE_NAME: 'example.com',
    DEPLOY_RESOLVED_D1_DATABASE_ID: '11111111-1111-4111-8111-111111111111',
    NUXT_OUTBOUND_EMAIL_FROM_EMAIL: 'notifications@example.com',
    NUXT_OUTBOUND_EMAIL_REPLY_TO: 'support@example.com',
    ...overrides
  }
}

describe('deploy Wrangler config generator', () => {
  test('parses explicit deployment targets', () => {
    expect(parseDeployTarget('test')).toBe('test')
    expect(parseDeployTarget('production')).toBe('production')
    expect(() => parseDeployTarget('staging')).toThrow('Usage:')
  })

  test('generates test config from environment-local domain and derived resource names', () => {
    const input = resolveDeployConfigInput('test', createEnvironment({
      BASE_DOMAIN: 'test.example.com',
      NUXT_FIRST_PLATFORM_ADMIN_EMAIL: 'admin@example.com'
    }))
    const config = buildDeployWranglerConfig(input)

    expect(input.environmentName).toBe('test')
    expect(input.resourcePrefix).toBe('codex-events')
    expect(input.appBaseUrl).toBe('https://test.example.com')
    expect(input.auth0CustomDomain).toBe('auth.test.example.com')
    expect(input.lumaWebhookUrl).toBe('https://test.example.com/api/public/luma/webhooks')
    expect(config.name).toBe('codex-events-test')
    expect(config.main).toBe('../../.output/server/index.mjs')
    expect(config.assets.directory).toBe('../../.output/public')
    expect(config.routes).toEqual([
      {
        pattern: 'test.example.com',
        zone_name: 'example.com',
        custom_domain: true
      }
    ])
    expect(config.vars).toMatchObject({
      NUXT_AUTH0_DOMAIN: 'auth.test.example.com',
      NUXT_AUTH0_APP_BASE_URL: 'https://test.example.com',
      NUXT_AUTH0_DATABASE_CONNECTION_NAME: 'Username-Password-Authentication',
      NUXT_FIRST_PLATFORM_ADMIN_EMAIL: 'admin@example.com',
      NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME: 'codex-events-test-application-review-email-delivery',
      NUXT_EVENT_OUTCOME_EMAILS_QUEUE_NAME: 'codex-events-test-event-outcome-email-delivery',
      NUXT_LUMA_QUEUE_NAME: 'codex-events-test-application-luma-sync'
    })
    expect(config.d1_databases[0]).toMatchObject({
      database_name: 'codex-events-test',
      database_id: '11111111-1111-4111-8111-111111111111',
      migrations_dir: '../../drizzle'
    })
    expect(config.r2_buckets).toEqual([
      {
        binding: 'PROFILE_ICONS',
        bucket_name: 'codex-events-test-profile-icons'
      },
      {
        binding: 'EVENT_IMAGES',
        bucket_name: 'codex-events-test-event-images'
      }
    ])
    expect(config.queues.consumers).toEqual([])
  })

  test('builds desired Queue consumer settings from deploy config input', () => {
    const input = resolveDeployConfigInput('test', createEnvironment({
      BASE_DOMAIN: 'test.example.com',
      AUTH0_CUSTOM_DOMAIN: 'auth.test.example.com',
      NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS: '60',
      NUXT_EVENT_OUTCOME_EMAILS_RETRY_DELAY_SECONDS: '90',
      NUXT_LUMA_RETRY_DELAY_SECONDS: '180'
    }))

    expect(buildDeployQueueConsumerConfigs(input)).toEqual([
      {
        queue: 'codex-events-test-application-review-email-delivery',
        max_batch_size: 10,
        max_batch_timeout: 5,
        max_retries: 10,
        retry_delay: 60
      },
      {
        queue: 'codex-events-test-event-outcome-email-delivery',
        max_batch_size: 10,
        max_batch_timeout: 5,
        max_retries: 10,
        retry_delay: 90
      },
      {
        queue: 'codex-events-test-application-luma-sync',
        max_batch_size: 10,
        max_batch_timeout: 5,
        max_retries: 10,
        retry_delay: 180
      }
    ])
  })

  test('generates production config from environment-local domain and prod resource defaults', () => {
    const input = resolveDeployConfigInput('production', createEnvironment())
    const config = buildDeployWranglerConfig(input)

    expect(input.environmentName).toBe('prod')
    expect(input.appBaseUrl).toBe('https://events.example.com')
    expect(config.name).toBe('codex-events-prod')
    expect(config.routes[0]?.pattern).toBe('events.example.com')
    expect(config.vars.NUXT_AUTH0_DOMAIN).toBe('auth.events.example.com')
    expect(config.d1_databases[0]?.database_name).toBe('codex-events-prod')
    expect(config.r2_buckets.map(bucket => bucket.bucket_name)).toEqual([
      'codex-events-prod-profile-icons',
      'codex-events-prod-event-images'
    ])
    expect(config.ratelimits.map(rateLimit => rateLimit.namespace_id)).toEqual([
      '3001',
      '3002',
      '3003'
    ])
  })

  test('requires environment-local base domain and non-derived metadata', () => {
    expect(() => resolveDeployConfigInput('test', createEnvironment({
      BASE_DOMAIN: ''
    }))).toThrow('BASE_DOMAIN is required')

    expect(() => resolveDeployConfigInput('production', createEnvironment({
      DEPLOY_RESOLVED_D1_DATABASE_ID: ''
    }))).toThrow('DEPLOY_RESOLVED_D1_DATABASE_ID is required')
  })

  test('resolves the D1 database name without requiring a database ID', () => {
    expect(resolveDeployResourceNames('test', {
      DEPLOY_RESOLVED_D1_DATABASE_ID: ''
    })).toMatchObject({
      d1DatabaseName: 'codex-events-test',
      profileIconsBucket: 'codex-events-test-profile-icons',
      eventImagesBucket: 'codex-events-test-event-images'
    })

    expect(resolveDeployResourceNames('production', {
      DEPLOY_CF_D1_DATABASE_NAME: 'existing-database'
    })).toMatchObject({
      d1DatabaseName: 'existing-database',
      profileIconsBucket: 'codex-events-prod-profile-icons',
      eventImagesBucket: 'codex-events-prod-event-images'
    })

    expect(resolveDeployResourceNames('production', {
      DEPLOY_ENV_NAME: 'preview',
      DEPLOY_RESOURCE_PREFIX: 'custom-events'
    })).toMatchObject({
      d1DatabaseName: 'custom-events-preview',
      profileIconsBucket: 'custom-events-preview-profile-icons',
      eventImagesBucket: 'custom-events-preview-event-images'
    })
  })

  test('honors explicit domain and resource overrides', () => {
    const input = resolveDeployConfigInput('production', createEnvironment({
      DEPLOY_ENV_NAME: 'preview',
      DEPLOY_RESOURCE_PREFIX: 'custom-events',
      AUTH0_CUSTOM_DOMAIN: 'login.example.com',
      DEPLOY_LUMA_WEBHOOK_URL: 'https://hooks.example.com/luma/',
      DEPLOY_CF_WORKER_NAME: 'custom-worker',
      DEPLOY_CF_D1_DATABASE_NAME: 'custom-d1',
      DEPLOY_CF_PROFILE_ICONS_BUCKET: 'custom-profile-icons',
      DEPLOY_CF_EVENT_IMAGES_BUCKET: 'custom-event-images',
      DEPLOY_CF_APPLICATION_REVIEW_EMAIL_QUEUE: 'custom-application-review',
      DEPLOY_CF_EVENT_OUTCOME_EMAIL_QUEUE: 'custom-event-outcome',
      DEPLOY_CF_LUMA_SYNC_QUEUE: 'custom-luma-sync',
      NUXT_AUTH0_DATABASE_CONNECTION_NAME: 'custom-users'
    }))

    expect(input.environmentName).toBe('preview')
    expect(input.resourcePrefix).toBe('custom-events')
    expect(input.auth0CustomDomain).toBe('login.example.com')
    expect(input.lumaWebhookUrl).toBe('https://hooks.example.com/luma')
    expect(input.workerName).toBe('custom-worker')
    expect(input.d1DatabaseName).toBe('custom-d1')
    expect(input.profileIconsBucket).toBe('custom-profile-icons')
    expect(input.eventImagesBucket).toBe('custom-event-images')
    expect(input.applicationReviewEmails.queue).toBe('custom-application-review')
    expect(input.eventOutcomeEmails.queue).toBe('custom-event-outcome')
    expect(input.lumaSync.queue).toBe('custom-luma-sync')
    expect(input.auth0DatabaseConnectionName).toBe('custom-users')
  })
})
