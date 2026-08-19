import { emitD1Bookmark } from '#server/database/client'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', event => emitD1Bookmark(event) as never)
})
