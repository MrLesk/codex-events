import type { H3Event } from 'h3'

import { and, eq, isNull } from 'drizzle-orm'

import { assertRegularPlatformAccess, getRequestActor, type PlatformActor } from '#server/auth/actor'
import { resolveEventAuthorization, type EventAuthorization } from '#server/auth/authorization'
import { getDatabase, type AppDatabase } from '#server/database/client'
import { events, teamMembers, teams, userApplications } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'

export type AccountEventPageEventRecord = typeof events.$inferSelect

export interface AccountEventPageContext {
  actor: PlatformActor
  authorization: EventAuthorization
  database: AppDatabase
  event: AccountEventPageEventRecord
}

async function assertAccountEventPageVisibilityAndAccess(input: {
  actor: PlatformActor
  authorization: EventAuthorization
  database: AppDatabase
  event: AccountEventPageEventRecord
}) {
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
    return
  }

  const hasApplication = await input.database.query.userApplications.findFirst({
    columns: {
      id: true
    },
    where: and(
      eq(userApplications.eventId, input.event.id),
      eq(userApplications.userId, input.actor.platformUser.id)
    )
  })

  const activeMembership = await input.database
    .select({
      teamId: teamMembers.teamId
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teamMembers.userId, input.actor.platformUser.id),
      isNull(teamMembers.leftAt),
      eq(teams.eventId, input.event.id)
    ))
    .limit(1)

  if (
    !hasApplication
    && input.authorization.explicitRole === null
    && activeMembership.length === 0
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

  await assertAccountEventPageVisibilityAndAccess({
    actor,
    authorization,
    database,
    event
  })

  return {
    actor,
    authorization,
    database,
    event
  }
}
