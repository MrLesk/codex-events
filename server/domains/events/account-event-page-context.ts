import type { H3Event } from 'h3'

import { and, desc, eq, getTableColumns } from 'drizzle-orm'

import { assertRegularPlatformAccess, getRequestActor, type PlatformActor } from '#server/auth/actor'
import { resolveEventAuthorization, type EventAuthorization } from '#server/auth/authorization'
import { getDatabase, type AppDatabase } from '#server/database/client'
import { events, teamMembers, teams, userApplications } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'

export type AccountEventPageEventRecord = typeof events.$inferSelect
type AccountEventPageApplicationRecord = typeof userApplications.$inferSelect
type AccountEventPageTeamRecord = typeof teams.$inferSelect
type AccountEventPageMembershipRecord = typeof teamMembers.$inferSelect

export interface AccountEventPageAuthorizedAccess {
  application: AccountEventPageApplicationRecord | null
  memberships: Array<{
    team: AccountEventPageTeamRecord
    membership: AccountEventPageMembershipRecord
  }>
}

export interface AccountEventPageContext {
  actor: PlatformActor
  authorization: EventAuthorization
  access: AccountEventPageAuthorizedAccess | null
  database: AppDatabase
  event: AccountEventPageEventRecord
}

async function resolveAccountEventPageVisibilityAndAccess(input: {
  actor: PlatformActor
  authorization: EventAuthorization
  database: AppDatabase
  event: AccountEventPageEventRecord
}): Promise<AccountEventPageAuthorizedAccess | null> {
  const hasInternalVisibilityRole = input.authorization.isEventAdmin
    || input.authorization.isStaff
    || input.authorization.explicitRole === 'staff'

  if (
    (input.event.hiddenAt && !input.authorization.isPlatformAdmin && !input.authorization.isEventAdmin)
    || (
      input.event.state === 'draft'
      && !input.authorization.isPlatformAdmin
      && !hasInternalVisibilityRole
    )
  ) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_not_found',
      message: 'The requested event was not found.',
      details: { eventId: input.event.id }
    })
  }

  if (input.authorization.isPlatformAdmin) {
    return null
  }

  if (input.authorization.explicitRole !== null) {
    return null
  }

  const [application, membershipRows] = await Promise.all([
    input.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, input.event.id),
        eq(userApplications.userId, input.actor.platformUser.id)
      )
    }),
    input.database
      .select({
        team: getTableColumns(teams),
        membership: getTableColumns(teamMembers)
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(and(
        eq(teamMembers.userId, input.actor.platformUser.id),
        eq(teams.eventId, input.event.id)
      ))
      .orderBy(desc(teamMembers.joinedAt), desc(teamMembers.createdAt))
  ])
  const access: AccountEventPageAuthorizedAccess = {
    application: application ?? null,
    memberships: membershipRows as AccountEventPageAuthorizedAccess['memberships']
  }

  if (
    !access.application
    && !access.memberships.some(({ membership }) => membership.leftAt === null)
  ) {
    throw new ApiError({
      statusCode: 403,
      code: 'event_workspace_access_required',
      message: 'This operation requires access to the event workspace.',
      details: {
        eventId: input.event.id
      }
    })
  }

  return access
}

/**
 * Resolve participant-owned application and team data only when the shared
 * page boundary did not already authorize and load it. Explicit event roles
 * bypass the participant gate, but admin/staff pages may still request this
 * data when their response contract needs it.
 */
export async function loadAccountEventPageAccess(
  context: Pick<AccountEventPageContext, 'actor' | 'database' | 'event'>
): Promise<AccountEventPageAuthorizedAccess> {
  const [application, membershipRows] = await Promise.all([
    context.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, context.event.id),
        eq(userApplications.userId, context.actor.platformUser.id)
      )
    }),
    context.database
      .select({
        team: getTableColumns(teams),
        membership: getTableColumns(teamMembers)
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(and(
        eq(teamMembers.userId, context.actor.platformUser.id),
        eq(teams.eventId, context.event.id)
      ))
      .orderBy(desc(teamMembers.joinedAt), desc(teamMembers.createdAt))
  ])

  return {
    application: application ?? null,
    memberships: membershipRows as AccountEventPageAuthorizedAccess['memberships']
  }
}

/**
 * Resolve the shared page boundary once. The actor, authorization, and
 * database accessors are request-cached; child loaders receive this context
 * and must not resolve them or call another HTTP endpoint.
 */
export async function resolveAccountEventPageContext(
  h3Event: H3Event,
  slug: string
): Promise<AccountEventPageContext> {
  const actor = await getRequestActor(h3Event)
  assertRegularPlatformAccess(actor)
  const database = getDatabase(h3Event)
  const event = await database.query.events.findFirst({
    where: eq(events.slug, slug)
  })

  if (!event) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_not_found',
      message: 'The requested event was not found.',
      details: { slug }
    })
  }

  const authorization = await resolveEventAuthorization(h3Event, event.id)

  const access = await resolveAccountEventPageVisibilityAndAccess({
    actor,
    authorization,
    database,
    event
  })

  return {
    actor,
    authorization,
    access,
    database,
    event
  }
}
