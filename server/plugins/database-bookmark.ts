import { emitD1Bookmark } from '#server/database/client'
import { applyApiResponseCachePolicy } from '#server/http/cache-policy'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    applyApiResponseCachePolicy(event, response)
    return emitD1Bookmark(event) as never
  })
})
