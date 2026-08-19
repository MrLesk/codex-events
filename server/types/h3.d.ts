import type { RequestActor } from '#server/auth/actor'
import type {
  EventAuthorization,
  JudgeAssignmentAuthorization,
  TeamAuthorization
} from '#server/auth/authorization'

declare module 'h3' {
  interface H3EventContext {
    requestActor?: RequestActor | Promise<RequestActor>
    eventAuthorizationByEventId?: Map<string, Promise<EventAuthorization>>
    teamAuthorizationByTeamId?: Map<string, Promise<TeamAuthorization>>
    judgeAssignmentAuthorizationByAssignmentId?: Map<string, Promise<JudgeAssignmentAuthorization>>
  }
}

export {}
