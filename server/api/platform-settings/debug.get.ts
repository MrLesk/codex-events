import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { buildLumaWebhookUrl } from '#shared/domains/luma/webhook-url'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertPlatformAdminAccess(actor)

  const runtimeConfig = useRuntimeConfig(h3Event)
  const appBaseUrl = runtimeConfig.auth0.appBaseUrl

  return apiData({
    luma: {
      webhookUrl: buildLumaWebhookUrl(appBaseUrl, 'NUXT_AUTH0_APP_BASE_URL')
    }
  })
})
