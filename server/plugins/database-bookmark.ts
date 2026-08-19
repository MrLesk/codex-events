import { emitD1Bookmark } from '#server/database/client'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', emitD1Bookmark)
})
