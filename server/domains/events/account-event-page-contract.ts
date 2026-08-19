import { getQuery, type H3Event } from 'h3'
import { z } from 'zod'

import { apiData } from '#server/http/api-response'
import type { EventAuthorization } from '#server/auth/authorization'
import { routeSlugParamsSchema } from '#server/domains/events'
import {
  accountEventPageNames,
  accountEventPagePaths,
  accountJudgeAssignmentWorkspaceRoutePath,
  normalizeAccountEventPageQuery,
  type AccountEventPageName,
  type AccountEventPageQuery
} from '#shared/domains/events/account-event-page-registry'
import {
  resolveAccountEventPageContext,
  type AccountEventPageContext,
  type AccountEventPageEventRecord
} from './account-event-page-context'

export {
  accountEventPageNames,
  accountEventPagePaths,
  accountJudgeAssignmentWorkspaceRoutePath,
  type AccountEventPageName,
  type AccountEventPageQuery
}

export const accountEventPageParamsSchema = routeSlugParamsSchema.extend({
  page: z.enum(accountEventPageNames)
})

export const accountEventPageQuerySchema = z.object({
  selectedTeamSlug: z.string().trim().toLowerCase().min(1).max(120).optional()
}).passthrough()

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

export const accountEventPageRoutePaths = accountEventPagePaths

export type AccountEventPageLoader<TSchema extends z.ZodTypeAny> = (
  context: AccountEventPageContext,
  query: AccountEventPageQuery
) => z.input<TSchema> | Promise<z.input<TSchema>>

/**
 * Child routes assert page-specific access from the already-resolved context.
 * The callback receives no H3 event and must not resolve actor, authorization,
 * database, or another HTTP endpoint.
 */
export type AccountEventPageAuthorizer = (
  context: AccountEventPageContext
) => void | Promise<void>

export interface AccountEventPageRouteDefinition<
  TPageName extends AccountEventPageName,
  TSchema extends z.ZodTypeAny
> {
  page: TPageName
  schema: TSchema
  authorize: AccountEventPageAuthorizer
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
  await definition.authorize(context)
  const query = normalizeAccountEventPageQuery(
    accountEventPageQuerySchema.parse(getQuery(h3Event))
  )
  const page = definition.schema.parse(await definition.load(context, query))

  return apiData<AccountEventPageResponse<z.output<TSchema>>>({
    event: toPageEvent(context.event),
    visibility: toPageVisibility(context.authorization),
    page
  })
}
