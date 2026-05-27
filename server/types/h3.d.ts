import type { AppDatabase, D1DatabaseBinding } from '#server/database/client'
import type { RequestActor } from '#server/auth/actor'
import type {
  EventAuthorization,
  JudgeAssignmentAuthorization,
  TeamAuthorization
} from '#server/auth/authorization'

declare module 'h3' {
  interface H3EventContext {
    appDb?: AppDatabase
    d1Database?: D1DatabaseBinding
    requestActor?: RequestActor | Promise<RequestActor>
    eventAuthorizationByEventId?: Map<string, Promise<EventAuthorization>>
    teamAuthorizationByTeamId?: Map<string, Promise<TeamAuthorization>>
    judgeAssignmentAuthorizationByAssignmentId?: Map<string, Promise<JudgeAssignmentAuthorization>>
  }
}

export {}
