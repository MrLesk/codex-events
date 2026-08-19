import type { H3Event } from 'h3'
import { z } from 'zod'

import { apiData } from '#server/http/api-response'
import type { EventAuthorization } from '#server/auth/authorization'
import { routeSlugParamsSchema } from '#server/domains/events'
import {
  resolveAccountEventPageContext,
  type AccountEventPageContext,
  type AccountEventPageEventRecord
} from './account-event-page-context'

export const accountEventPageNames = [
  'entry',
  'prizes',
  'operations',
  'submissions',
  'judging',
  'settings',
  'participants',
  'workspace',
  'teams',
  'rosters',
  'gallery',
  'feedback',
  'certificates'
] as const

export type AccountEventPageName = (typeof accountEventPageNames)[number]

export const accountEventPageParamsSchema = routeSlugParamsSchema.extend({
  page: z.enum(accountEventPageNames)
})

export type AccountEventPageEvent = Pick<
  AccountEventPageEventRecord,
  'id' | 'slug' | 'name' | 'eventType' | 'state'
>

export interface AccountEventPageVisibility {
  canManage: boolean
  canJudge: boolean
  canViewParticipantsAndTeams: boolean
  isStaff: boolean
}

export interface AccountEventPageResponse<TPage> {
  event: AccountEventPageEvent
  visibility: AccountEventPageVisibility
  page: TPage
}

export type AccountEventEntryPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventPrizesPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventOperationsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventSubmissionsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventJudgingPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventSettingsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventParticipantsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventWorkspacePage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventTeamsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventRostersPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventGalleryPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventFeedbackPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventCertificatesPage<TPage> = AccountEventPageResponse<TPage>

export const accountEventPageRoutePaths = {
  entry: '/api/account/events/:slug/entry',
  prizes: '/api/account/events/:slug/prizes',
  operations: '/api/account/events/:slug/operations',
  submissions: '/api/account/events/:slug/submissions',
  judging: '/api/account/events/:slug/judging',
  settings: '/api/account/events/:slug/settings',
  participants: '/api/account/events/:slug/participants',
  workspace: '/api/account/events/:slug/workspace',
  teams: '/api/account/events/:slug/teams',
  rosters: '/api/account/events/:slug/rosters',
  gallery: '/api/account/events/:slug/gallery',
  feedback: '/api/account/events/:slug/feedback',
  certificates: '/api/account/events/:slug/certificates'
} as const satisfies Record<AccountEventPageName, string>

export type AccountEventPageLoader<TSchema extends z.ZodTypeAny> = (
  context: AccountEventPageContext
) => z.input<TSchema> | Promise<z.input<TSchema>>

export interface AccountEventPageRouteDefinition<
  TPageName extends AccountEventPageName,
  TSchema extends z.ZodTypeAny
> {
  page: TPageName
  schema: TSchema
  load: AccountEventPageLoader<TSchema>
}

export function defineAccountEventPageRoute<
  TPageName extends AccountEventPageName,
  TSchema extends z.ZodTypeAny
>(
  definition: AccountEventPageRouteDefinition<TPageName, TSchema>
) {
  return definition
}

function toPageEvent(event: AccountEventPageEventRecord): AccountEventPageEvent {
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    eventType: event.eventType,
    state: event.state
  }
}

function toPageVisibility(authorization: EventAuthorization): AccountEventPageVisibility {
  return {
    canManage: authorization.isEventAdmin,
    canJudge: authorization.canReviewThroughAssignment,
    canViewParticipantsAndTeams: authorization.canViewParticipantsAndTeams,
    isStaff: authorization.isStaff
  }
}

export async function executeAccountEventPageRoute<
  TPageName extends AccountEventPageName,
  TSchema extends z.ZodTypeAny
>(
  h3Event: H3Event,
  slug: string,
  definition: AccountEventPageRouteDefinition<TPageName, TSchema>
) {
  const params = accountEventPageParamsSchema.parse({
    slug,
    page: definition.page
  })
  const context = await resolveAccountEventPageContext(h3Event, params.slug)
  const page = definition.schema.parse(await definition.load(context))

  return apiData<AccountEventPageResponse<z.output<TSchema>>>({
    event: toPageEvent(context.event),
    visibility: toPageVisibility(context.authorization),
    page
  })
}
