import type { AppDatabase, D1DatabaseBinding } from '../database/client'
import type { RequestActor } from '../auth/actor'

declare module 'h3' {
  interface H3EventContext {
    appDb?: AppDatabase
    d1Database?: D1DatabaseBinding
    requestActor?: RequestActor | Promise<RequestActor>
  }
}

export {}
