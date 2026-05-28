import 'dotenv/config'

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const deployTargets = ['dev', 'production'] as const

export type DeployTarget = (typeof deployTargets)[number]

type EnvironmentValues = Record<string, string | undefined>

interface QueueConfig {
  binding: string
  queue: string
  retryDelaySeconds: number
}

interface ResolvedDeployConfigInput {
  target: DeployTarget
  environmentName: string
  resourcePrefix: string
  baseDomain: string
  appBaseUrl: string
  auth0CustomDomain: string
  eventImagesPublicCdnBaseUrl: string
  lumaWebhookUrl: string
  zoneName: string
  workerName: string
  d1DatabaseName: string
  d1DatabaseId: string
  profileIconsBucket: string
  eventImagesBucket: string
  outboundEmailBinding: string
  outboundEmailFromEmail: string
  outboundEmailFromName: string
  outboundEmailReplyTo: string
  auth0DatabaseConnectionName: string
  applicationReviewEmails: QueueConfig
  eventOutcomeEmails: QueueConfig
  lumaSync: QueueConfig
}

export interface GeneratedDeployWranglerConfig {
  $schema: string
  name: string
  main: string
  compatibility_date: string
  compatibility_flags: string[]
  workers_dev: boolean
  preview_urls: boolean
  build: {
    command: string
  }
  ratelimits: Array<{
    name: string
    namespace_id: string
    simple: {
      limit: number
      period: number
    }
  }>
  assets: {
    binding: string
    directory: string
  }
  routes: Array<{
    pattern: string
    zone_name: string
    custom_domain: boolean
  }>
  vars: Record<string, string>
  d1_databases: Array<{
    binding: string
    database_name: string
    database_id: string
    migrations_dir: string
  }>
  r2_buckets: Array<{
    binding: string
    bucket_name: string
  }>
  images: {
    binding: string
  }
  send_email: Array<{
    name: string
    allowed_sender_addresses: string[]
  }>
  queues: {
    producers: Array<{
      binding: string
      queue: string
    }>
    consumers: Array<{
      queue: string
      max_batch_size: number
      max_batch_timeout: number
      max_retries: number
      retry_delay: number
    }>
  }
}

const outputPathsByTarget: Record<DeployTarget, string> = {
  dev: '.wrangler/generated/dev.jsonc',
  production: '.wrangler/generated/production.jsonc'
}

const defaultDeployEnvironmentNameByTarget: Record<DeployTarget, string> = {
  dev: 'dev',
  production: 'prod'
}

const defaultDeployResourcePrefix = 'codex-events'
const productionDeployEnvironmentName = 'prod'
const defaultAuth0DatabaseConnectionName = 'Username-Password-Authentication'

const rateLimitNamespaceIdsByTarget: Record<DeployTarget, {
  publicContact: string
  authenticatedUpload: string
  publicEventFeedback: string
}> = {
  dev: {
    publicContact: '2001',
    authenticatedUpload: '2002',
    publicEventFeedback: '2003'
  },
  production: {
    publicContact: '3001',
    authenticatedUpload: '3002',
    publicEventFeedback: '3003'
  }
}

function readOptionalEnvironmentValue(environment: EnvironmentValues, name: string) {
  return environment[name]?.trim() ?? ''
}

function readRequiredEnvironmentValue(environment: EnvironmentValues, name: string) {
  const value = readOptionalEnvironmentValue(environment, name)

  if (!value) {
    throw new Error(`${name} is required to generate the Wrangler deployment config.`)
  }

  return value
}

function normalizeHostname(value: string, name: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`${name} is required.`)
  }

  const valueWithProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  const parsed = new URL(valueWithProtocol)

  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password || parsed.port) {
    throw new Error(`${name} must be a hostname without a path, query, fragment, credentials, or port.`)
  }

  return parsed.hostname.toLowerCase()
}

function normalizeHttpsUrl(value: string, name: string) {
  const parsed = new URL(value.trim())

  if (parsed.protocol !== 'https:') {
    throw new Error(`${name} must be an https URL.`)
  }

  return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}${parsed.search}${parsed.hash}`
}

function normalizeResourceName(value: string, name: string) {
  const normalized = value.trim().toLowerCase()

  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalized)) {
    throw new Error(`${name} must contain only lowercase letters, numbers, and hyphens, and must not start or end with a hyphen.`)
  }

  return normalized
}

function readRetryDelaySeconds(environment: EnvironmentValues, name: string) {
  const rawValue = readOptionalEnvironmentValue(environment, name)

  if (!rawValue) {
    return 120
  }

  const value = Number.parseInt(rawValue, 10)

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer number of seconds.`)
  }

  return value
}

function resolveQueueConfig(environment: EnvironmentValues, options: {
  bindingEnvName: string
  queueEnvName: string
  retryDelayEnvName: string
  defaultBinding: string
  defaultQueue: string
}) {
  return {
    binding: readOptionalEnvironmentValue(environment, options.bindingEnvName) || options.defaultBinding,
    queue: readOptionalEnvironmentValue(environment, options.queueEnvName) || options.defaultQueue,
    retryDelaySeconds: readRetryDelaySeconds(environment, options.retryDelayEnvName)
  } satisfies QueueConfig
}

function resolveDeployEnvironmentName(target: DeployTarget, environment: EnvironmentValues) {
  return normalizeResourceName(
    readOptionalEnvironmentValue(environment, 'DEPLOY_ENV_NAME') || defaultDeployEnvironmentNameByTarget[target],
    'DEPLOY_ENV_NAME'
  )
}

function resolveDeployResourcePrefix(environment: EnvironmentValues) {
  return normalizeResourceName(
    readOptionalEnvironmentValue(environment, 'DEPLOY_RESOURCE_PREFIX') || defaultDeployResourcePrefix,
    'DEPLOY_RESOURCE_PREFIX'
  )
}

function buildDefaultResourceName(environmentName: string, resourcePrefix: string, suffix?: string) {
  const baseName = environmentName === productionDeployEnvironmentName
    ? resourcePrefix
    : `${environmentName}-${resourcePrefix}`

  return suffix ? `${baseName}-${suffix}` : baseName
}

function resolveResourceName(environment: EnvironmentValues, name: string, defaultValue: string) {
  return normalizeResourceName(
    readOptionalEnvironmentValue(environment, name) || defaultValue,
    name
  )
}

export function parseDeployTarget(value: string | undefined): DeployTarget {
  if (value === 'dev' || value === 'production') {
    return value
  }

  throw new Error('Usage: bun tools/deploy/generate-wrangler-config.ts <dev|production>')
}

export function getGeneratedWranglerConfigPath(target: DeployTarget) {
  return outputPathsByTarget[target]
}

export function resolveDeployConfigInput(
  target: DeployTarget,
  environment: EnvironmentValues
): ResolvedDeployConfigInput {
  const environmentName = resolveDeployEnvironmentName(target, environment)
  const resourcePrefix = resolveDeployResourcePrefix(environment)
  const resourceBaseName = buildDefaultResourceName(environmentName, resourcePrefix)
  const baseDomain = normalizeHostname(
    readRequiredEnvironmentValue(environment, 'DEPLOY_BASE_DOMAIN'),
    'DEPLOY_BASE_DOMAIN'
  )
  const appBaseUrl = `https://${baseDomain}`
  const auth0CustomDomain = normalizeHostname(
    readRequiredEnvironmentValue(environment, 'DEPLOY_AUTH0_CUSTOM_DOMAIN'),
    'DEPLOY_AUTH0_CUSTOM_DOMAIN'
  )
  const explicitEventImagesPublicCdnBaseUrl = readOptionalEnvironmentValue(environment, 'DEPLOY_EVENT_IMAGES_PUBLIC_CDN_BASE_URL')
  const eventImagesPublicCdnBaseUrl = explicitEventImagesPublicCdnBaseUrl
    ? normalizeHttpsUrl(explicitEventImagesPublicCdnBaseUrl, 'DEPLOY_EVENT_IMAGES_PUBLIC_CDN_BASE_URL')
    : ''
  const lumaWebhookUrl = normalizeHttpsUrl(
    readOptionalEnvironmentValue(environment, 'DEPLOY_LUMA_WEBHOOK_URL') || `${appBaseUrl}/api/public/luma/webhooks`,
    'DEPLOY_LUMA_WEBHOOK_URL'
  )
  return {
    target,
    environmentName,
    resourcePrefix,
    baseDomain,
    appBaseUrl,
    auth0CustomDomain,
    eventImagesPublicCdnBaseUrl,
    lumaWebhookUrl,
    zoneName: readRequiredEnvironmentValue(environment, 'DEPLOY_CF_ZONE_NAME'),
    workerName: resolveResourceName(environment, 'DEPLOY_CF_WORKER_NAME', resourceBaseName),
    d1DatabaseName: resolveResourceName(environment, 'DEPLOY_CF_D1_DATABASE_NAME', resourceBaseName),
    d1DatabaseId: readRequiredEnvironmentValue(environment, 'DEPLOY_CF_D1_DATABASE_ID'),
    profileIconsBucket: resolveResourceName(environment, 'DEPLOY_CF_PROFILE_ICONS_BUCKET', buildDefaultResourceName(environmentName, resourcePrefix, 'profile-icons')),
    eventImagesBucket: resolveResourceName(environment, 'DEPLOY_CF_EVENT_IMAGES_BUCKET', buildDefaultResourceName(environmentName, resourcePrefix, 'event-images')),
    outboundEmailBinding: readOptionalEnvironmentValue(environment, 'NUXT_OUTBOUND_EMAIL_BINDING') || 'EMAIL',
    outboundEmailFromEmail: readRequiredEnvironmentValue(environment, 'NUXT_OUTBOUND_EMAIL_FROM_EMAIL'),
    outboundEmailFromName: readOptionalEnvironmentValue(environment, 'NUXT_OUTBOUND_EMAIL_FROM_NAME') || 'Codex Events',
    outboundEmailReplyTo: readRequiredEnvironmentValue(environment, 'NUXT_OUTBOUND_EMAIL_REPLY_TO'),
    auth0DatabaseConnectionName: readOptionalEnvironmentValue(environment, 'NUXT_AUTH0_DATABASE_CONNECTION_NAME') || defaultAuth0DatabaseConnectionName,
    applicationReviewEmails: resolveQueueConfig(environment, {
      bindingEnvName: 'NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING',
      queueEnvName: 'DEPLOY_CF_APPLICATION_REVIEW_EMAIL_QUEUE',
      retryDelayEnvName: 'NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS',
      defaultBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE',
      defaultQueue: buildDefaultResourceName(environmentName, resourcePrefix, 'application-review-email-delivery')
    }),
    eventOutcomeEmails: resolveQueueConfig(environment, {
      bindingEnvName: 'NUXT_EVENT_OUTCOME_EMAILS_QUEUE_BINDING',
      queueEnvName: 'DEPLOY_CF_EVENT_OUTCOME_EMAIL_QUEUE',
      retryDelayEnvName: 'NUXT_EVENT_OUTCOME_EMAILS_RETRY_DELAY_SECONDS',
      defaultBinding: 'EVENT_OUTCOME_EMAIL_QUEUE',
      defaultQueue: buildDefaultResourceName(environmentName, resourcePrefix, 'event-outcome-email-delivery')
    }),
    lumaSync: resolveQueueConfig(environment, {
      bindingEnvName: 'NUXT_LUMA_QUEUE_BINDING',
      queueEnvName: 'DEPLOY_CF_LUMA_SYNC_QUEUE',
      retryDelayEnvName: 'NUXT_LUMA_RETRY_DELAY_SECONDS',
      defaultBinding: 'APPLICATION_LUMA_SYNC_QUEUE',
      defaultQueue: buildDefaultResourceName(environmentName, resourcePrefix, 'application-luma-sync')
    })
  }
}

export function buildDeployWranglerConfig(input: ResolvedDeployConfigInput): GeneratedDeployWranglerConfig {
  const rateLimitNamespaceIds = rateLimitNamespaceIdsByTarget[input.target]

  return {
    $schema: '../../node_modules/wrangler/config-schema.json',
    name: input.workerName,
    main: '../../.output/server/index.mjs',
    compatibility_date: '2026-03-23',
    compatibility_flags: [
      'nodejs_compat',
      'no_nodejs_compat_v2'
    ],
    workers_dev: false,
    preview_urls: false,
    build: {
      command: 'bun run build:cloudflare'
    },
    ratelimits: [
      {
        name: 'PUBLIC_CONTACT_RATE_LIMITER',
        namespace_id: rateLimitNamespaceIds.publicContact,
        simple: {
          limit: 5,
          period: 60
        }
      },
      {
        name: 'AUTHENTICATED_UPLOAD_RATE_LIMITER',
        namespace_id: rateLimitNamespaceIds.authenticatedUpload,
        simple: {
          limit: 10,
          period: 60
        }
      },
      {
        name: 'PUBLIC_EVENT_FEEDBACK_RATE_LIMITER',
        namespace_id: rateLimitNamespaceIds.publicEventFeedback,
        simple: {
          limit: 1,
          period: 60
        }
      }
    ],
    assets: {
      binding: 'ASSETS',
      directory: '../../.output/public'
    },
    routes: [
      {
        pattern: input.baseDomain,
        zone_name: input.zoneName,
        custom_domain: true
      }
    ],
    vars: {
      NUXT_AUTH0_DOMAIN: input.auth0CustomDomain,
      NUXT_AUTH0_APP_BASE_URL: input.appBaseUrl,
      NUXT_EVENT_IMAGES_PUBLIC_CDN_BASE_URL: input.eventImagesPublicCdnBaseUrl,
      NUXT_AUTH0_DATABASE_CONNECTION_NAME: input.auth0DatabaseConnectionName,
      NUXT_OUTBOUND_EMAIL_BINDING: input.outboundEmailBinding,
      NUXT_OUTBOUND_EMAIL_FROM_EMAIL: input.outboundEmailFromEmail,
      NUXT_OUTBOUND_EMAIL_FROM_NAME: input.outboundEmailFromName,
      NUXT_OUTBOUND_EMAIL_REPLY_TO: input.outboundEmailReplyTo,
      NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING: input.applicationReviewEmails.binding,
      NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME: input.applicationReviewEmails.queue,
      NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS: String(input.applicationReviewEmails.retryDelaySeconds),
      NUXT_EVENT_OUTCOME_EMAILS_QUEUE_BINDING: input.eventOutcomeEmails.binding,
      NUXT_EVENT_OUTCOME_EMAILS_QUEUE_NAME: input.eventOutcomeEmails.queue,
      NUXT_EVENT_OUTCOME_EMAILS_RETRY_DELAY_SECONDS: String(input.eventOutcomeEmails.retryDelaySeconds),
      NUXT_LUMA_QUEUE_BINDING: input.lumaSync.binding,
      NUXT_LUMA_QUEUE_NAME: input.lumaSync.queue,
      NUXT_LUMA_RETRY_DELAY_SECONDS: String(input.lumaSync.retryDelaySeconds)
    },
    d1_databases: [
      {
        binding: 'DB',
        database_name: input.d1DatabaseName,
        database_id: input.d1DatabaseId,
        migrations_dir: '../../drizzle'
      }
    ],
    r2_buckets: [
      {
        binding: 'PROFILE_ICONS',
        bucket_name: input.profileIconsBucket
      },
      {
        binding: 'EVENT_IMAGES',
        bucket_name: input.eventImagesBucket
      }
    ],
    images: {
      binding: 'IMAGES'
    },
    send_email: [
      {
        name: input.outboundEmailBinding,
        allowed_sender_addresses: [
          input.outboundEmailFromEmail
        ]
      }
    ],
    queues: {
      producers: [
        {
          binding: input.applicationReviewEmails.binding,
          queue: input.applicationReviewEmails.queue
        },
        {
          binding: input.eventOutcomeEmails.binding,
          queue: input.eventOutcomeEmails.queue
        },
        {
          binding: input.lumaSync.binding,
          queue: input.lumaSync.queue
        }
      ],
      consumers: [
        {
          queue: input.applicationReviewEmails.queue,
          max_batch_size: 10,
          max_batch_timeout: 5,
          max_retries: 10,
          retry_delay: input.applicationReviewEmails.retryDelaySeconds
        },
        {
          queue: input.eventOutcomeEmails.queue,
          max_batch_size: 10,
          max_batch_timeout: 5,
          max_retries: 10,
          retry_delay: input.eventOutcomeEmails.retryDelaySeconds
        },
        {
          queue: input.lumaSync.queue,
          max_batch_size: 10,
          max_batch_timeout: 5,
          max_retries: 10,
          retry_delay: input.lumaSync.retryDelaySeconds
        }
      ]
    }
  }
}

export async function writeDeployWranglerConfig(target: DeployTarget, environment: EnvironmentValues = process.env) {
  const outputPath = getGeneratedWranglerConfigPath(target)
  const config = buildDeployWranglerConfig(resolveDeployConfigInput(target, environment))
  await mkdir(dirname(outputPath), {
    recursive: true
  })
  await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

  return {
    outputPath,
    config
  }
}

if (import.meta.main) {
  try {
    const target = parseDeployTarget(process.argv[2])
    const { outputPath, config } = await writeDeployWranglerConfig(target)
    process.stdout.write(`Generated ${target} Wrangler config at ${outputPath} for ${config.vars.NUXT_AUTH0_APP_BASE_URL}\n`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate Wrangler deployment config.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
