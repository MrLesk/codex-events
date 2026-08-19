import { setResponseHeader } from 'h3'

import { d1BookmarkHeader, getDatabaseBookmark } from '#server/database/client'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    const bookmark = getDatabaseBookmark(event)

    if (bookmark) {
      setResponseHeader(event, d1BookmarkHeader, bookmark)
    }
  })
})
