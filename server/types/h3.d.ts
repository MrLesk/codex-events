import type { AppDatabase, D1DatabaseBinding } from '#server/database/client'
import type { RequestActor } from '#server/auth/actor'
import type {
  HackathonAuthorization,
  JudgeAssignmentAuthorization,
  TeamAuthorization
} from '#server/auth/authorization'
import type { LinkablePlatformAccountIdentity } from '#server/domains/accounts/linking'

declare module 'h3' {
  interface H3EventContext {
    appDb?: AppDatabase
    d1Database?: D1DatabaseBinding
    requestActor?: RequestActor | Promise<RequestActor>
    linkablePlatformAccountIdentity?: Promise<LinkablePlatformAccountIdentity | null>
    hackathonAuthorizationByHackathonId?: Map<string, Promise<HackathonAuthorization>>
    teamAuthorizationByTeamId?: Map<string, Promise<TeamAuthorization>>
    judgeAssignmentAuthorizationByAssignmentId?: Map<string, Promise<JudgeAssignmentAuthorization>>
  }
}

export {}
