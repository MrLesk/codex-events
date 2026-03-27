import type { EventHandler } from 'h3'

import { createApp, createRouter, eventHandler, toWebHandler } from 'h3'

import { createDatabase, setDatabase } from '../../../server/database/client'
import { createTestD1Database } from './fake-d1'
import { stubAuth0Session } from './runtime'

interface TestSessionUser {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
  [key: string]: unknown
}

interface RouteDefinition {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete'
  path: string
  handler: EventHandler
}

export function createApiRouteTestHarness(options: {
  routes: RouteDefinition[]
  sessionUser?: TestSessionUser | null
  cloudflareEnv?: Record<string, unknown>
  runtimeConfig?: {
    database?: {
      binding?: string
    }
    profileIcons?: {
      binding?: string
    }
    hackathonImages?: {
      binding?: string
    }
    resend?: {
      apiKey?: string
      fromEmail?: string
      fromName?: string
      replyTo?: string
    }
    applicationReviewEmails?: {
      queueBinding?: string
      queueName?: string
      retryDelaySeconds?: number
    }
  }
}) {
  const d1Database = createTestD1Database()
  const database = createDatabase(d1Database as never)
  const app = createApp()
  const router = createRouter()

  stubAuth0Session(options.sessionUser ?? null)

  app.use(eventHandler((event) => {
    const databaseBinding = options.runtimeConfig?.database?.binding ?? 'DB'
    const profileIconsBinding = options.runtimeConfig?.profileIcons?.binding ?? 'PROFILE_ICONS'
    const hackathonImagesBinding = options.runtimeConfig?.hackathonImages?.binding ?? 'HACKATHON_IMAGES'
    const resendApiKey = options.runtimeConfig?.resend?.apiKey ?? ''
    const resendFromEmail = options.runtimeConfig?.resend?.fromEmail ?? ''
    const resendFromName = options.runtimeConfig?.resend?.fromName ?? 'Codex Hackathons'
    const resendReplyTo = options.runtimeConfig?.resend?.replyTo ?? ''
    const reviewEmailsQueueBinding = options.runtimeConfig?.applicationReviewEmails?.queueBinding ?? 'APPLICATION_REVIEW_EMAIL_QUEUE'
    const reviewEmailsQueueName = options.runtimeConfig?.applicationReviewEmails?.queueName ?? 'codex-hackathons-application-review-email-delivery'
    const reviewEmailsRetryDelaySeconds = options.runtimeConfig?.applicationReviewEmails?.retryDelaySeconds ?? 120

    event.context.cloudflare = {
      env: {
        [databaseBinding]: d1Database,
        ...(options.cloudflareEnv ?? {})
      }
    } as never
    event.context.runtimeConfig = {
      auth0: {},
      database: {
        binding: databaseBinding
      },
      profileIcons: {
        binding: profileIconsBinding
      },
      hackathonImages: {
        binding: hackathonImagesBinding
      },
      resend: {
        apiKey: resendApiKey,
        fromEmail: resendFromEmail,
        fromName: resendFromName,
        replyTo: resendReplyTo
      },
      applicationReviewEmails: {
        queueBinding: reviewEmailsQueueBinding,
        queueName: reviewEmailsQueueName,
        retryDelaySeconds: reviewEmailsRetryDelaySeconds
      }
    }
    event.context.auth0ClientOptions = {}
    event.context.d1Database = d1Database as never
    setDatabase(event, database)
  }))

  for (const route of options.routes) {
    router[route.method](route.path, route.handler)
  }

  app.use(router)

  const handleRequest = toWebHandler(app)

  return {
    database,
    d1Database,
    async request(path: string, init: RequestInit = {}) {
      const headers = new Headers(init.headers)
      const isFormDataBody = typeof FormData !== 'undefined' && init.body instanceof FormData

      if (init.body && !isFormDataBody && !headers.has('content-type')) {
        headers.set('content-type', 'application/json')
      }

      return await handleRequest(new Request(`http://localhost${path}`, {
        ...init,
        headers
      }))
    }
  }
}
