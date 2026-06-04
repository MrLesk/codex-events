import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { assertEventCreatorAccess } from '#server/auth/authorization'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertEventApplicationFieldConfiguration,
  assertEventSchedule,
  assertEventSlugAvailable,
  createEventAdminAssignmentsForNewEvent,
  createEventTracks,
  createEventBodySchema,
  listEventTracks,
  serializeEventAgendaItems,
  serializeAdminEvent
} from '#server/domains/events'
import { reconcileEventLumaWebhook } from '#server/domains/events/luma-webhook-registration'
import { parseValidatedBody } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertEventCreatorAccess(actor)

  const body = await parseValidatedBody(h3Event, createEventBodySchema)
  const database = getDatabase(h3Event)

  assertEventSchedule(body)
  assertEventApplicationFieldConfiguration(body as Record<string, unknown>)
  await assertEventSlugAvailable(database, body.slug)

  const eventId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const isHackathon = body.eventType === 'hackathon'
  const submissionOpensAt = isHackathon ? body.submissionOpensAt! : body.registrationClosesAt
  const submissionClosesAt = isHackathon
    ? body.submissionClosesAt!
    : new Date(Date.parse(body.registrationClosesAt) + 1000).toISOString()

  await database.insert(events).values({
    id: eventId,
    eventType: body.eventType,
    name: body.name,
    slug: body.slug,
    description: body.description,
    agendaItemsJson: serializeEventAgendaItems(body.agendaItems),
    backgroundImageUrl: body.backgroundImageUrl ?? null,
    bannerImageUrl: body.bannerImageUrl ?? null,
    discordServerUrl: body.discordServerUrl ?? null,
    lumaEventUrl: body.lumaEventUrl ?? null,
    lumaEventApiId: body.lumaEventApiId ?? null,
    lumaApiKey: body.lumaApiKey ?? null,
    city: body.city,
    country: body.country,
    address: body.address,
    registrationOpensAt: body.registrationOpensAt,
    registrationClosesAt: body.registrationClosesAt,
    submissionOpensAt,
    submissionClosesAt,
    maxTeamMembers: isHackathon ? body.maxTeamMembers : 1,
    participantsLimit: body.participantsLimit,
    autoApproveApplications: body.autoApproveApplications,
    blindReviewCount: isHackathon ? body.blindReviewCount : 1,
    pitchReviewEnabled: isHackathon ? body.pitchReviewEnabled : false,
    blindScoreWeightPercent: isHackathon ? body.blindScoreWeightPercent : 100,
    pitchScoreWeightPercent: isHackathon ? body.pitchScoreWeightPercent : 0,
    shortlistFinalistCount: isHackathon ? body.shortlistFinalistCount : 1,
    inPersonEvent: body.inPersonEvent,
    applicationXProfileVisible: body.applicationXProfileVisible,
    applicationLinkedinProfileVisible: body.applicationLinkedinProfileVisible,
    applicationGithubProfileVisible: body.applicationGithubProfileVisible,
    applicationChatgptEmailVisible: body.applicationChatgptEmailVisible,
    applicationOpenaiOrgIdVisible: body.applicationOpenaiOrgIdVisible,
    applicationLumaEmailVisible: body.applicationLumaEmailVisible,
    applicationWhyThisEventVisible: body.applicationWhyThisEventVisible,
    applicationProofOfExecutionVisible: body.applicationProofOfExecutionVisible,
    applicationTeamIntentVisible: body.applicationTeamIntentVisible,
    applicationAiKnowledgeVisible: body.applicationAiKnowledgeVisible,
    requireXProfile: body.requireXProfile,
    requireLinkedinProfile: body.requireLinkedinProfile,
    requireGithubProfile: body.requireGithubProfile,
    requireChatgptEmail: body.requireChatgptEmail,
    requireOpenaiOrgId: body.requireOpenaiOrgId,
    requireLumaEmail: body.requireLumaEmail,
    requireWhyThisEvent: body.requireWhyThisEvent,
    requireProofOfExecution: body.requireProofOfExecution,
    requireTeamIntent: body.requireTeamIntent,
    requireAiKnowledge: body.requireAiKnowledge,
    requireSubmissionSummary: isHackathon ? body.requireSubmissionSummary : false,
    requireSubmissionRepositoryUrl: isHackathon ? body.requireSubmissionRepositoryUrl : false,
    requireSubmissionDemoUrl: isHackathon ? body.requireSubmissionDemoUrl : false,
    state: 'draft',
    createdByUserId: actor.platformUser.id,
    createdAt,
    updatedAt: createdAt
  })

  await createEventAdminAssignmentsForNewEvent(database, {
    eventId,
    creatorUserId: actor.platformUser.id,
    createdAt
  })
  await createEventTracks(database, eventId, isHackathon ? body.tracks : [])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event.created',
    metadata: {
      slug: body.slug
    }
  })

  const createdEvent = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })
  await reconcileEventLumaWebhook({
    database,
    event: createdEvent!,
    runtimeConfig: useRuntimeConfig(h3Event)
  })

  const configuredEvent = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })
  const createdTracks = await listEventTracks(database, eventId)

  return apiData(serializeAdminEvent(configuredEvent!, undefined, createdTracks, {
    appBaseUrl: useRuntimeConfig(h3Event).auth0.appBaseUrl
  }))
})
