import { defineEventHandler } from 'h3'

import { readLocalCodexUser } from '#server/auth/local-codex-auth'

export default defineEventHandler((event) => {
  if (!useRuntimeConfig(event).localCodexAuth) {
    return
  }

  const user = readLocalCodexUser(event)

  event.context.auth0Client = {
    getUser: async () => user ?? undefined,
    getSession: async () => user ? { user } : null
  } as never
})
