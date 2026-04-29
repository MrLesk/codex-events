import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertHackathonSchedule,
  assertHackathonSlugAvailable,
  createHackathonTracks,
  createHackathonBodySchema,
  listHackathonTracks,
  serializeHackathonAgendaItems,
  serializeHackathon
} from '#server/domains/hackathons'
import { parseValidatedBody } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const body = await parseValidatedBody(event, createHackathonBodySchema)
  const database = getDatabase(event)

  assertHackathonSchedule(body)
  await assertHackathonSlugAvailable(database, body.slug)

  const hackathonId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await database.insert(hackathons).values({
    id: hackathonId,
    name: body.name,
    slug: body.slug,
    description: body.description,
    agendaItemsJson: serializeHackathonAgendaItems(body.agendaItems),
    backgroundImageUrl: body.backgroundImageUrl ?? null,
    bannerImageUrl: body.bannerImageUrl ?? null,
    discordServerUrl: body.discordServerUrl ?? null,
    lumaEventUrl: body.lumaEventUrl ?? null,
    lumaEventApiId: body.lumaEventApiId ?? null,
    city: body.city,
    country: body.country,
    address: body.address,
    registrationOpensAt: body.registrationOpensAt,
    registrationClosesAt: body.registrationClosesAt,
    submissionOpensAt: body.submissionOpensAt,
    submissionClosesAt: body.submissionClosesAt,
    maxTeamMembers: body.maxTeamMembers,
    participantsLimit: body.participantsLimit,
    blindReviewCount: body.blindReviewCount,
    pitchReviewEnabled: body.pitchReviewEnabled,
    blindScoreWeightPercent: body.blindScoreWeightPercent,
    pitchScoreWeightPercent: body.pitchScoreWeightPercent,
    shortlistFinalistCount: body.shortlistFinalistCount,
    inPersonEvent: body.inPersonEvent,
    requireXProfile: body.requireXProfile,
    requireLinkedinProfile: body.requireLinkedinProfile,
    requireGithubProfile: body.requireGithubProfile,
    requireChatgptEmail: body.requireChatgptEmail,
    requireOpenaiOrgId: body.requireOpenaiOrgId,
    requireLumaEmail: body.requireLumaEmail,
    requireWhyThisHackathon: body.requireWhyThisHackathon,
    requireProofOfExecution: body.requireProofOfExecution,
    requireSubmissionSummary: body.requireSubmissionSummary,
    requireSubmissionRepositoryUrl: body.requireSubmissionRepositoryUrl,
    requireSubmissionDemoUrl: body.requireSubmissionDemoUrl,
    state: 'draft',
    createdByUserId: actor.platformUser.id,
    createdAt,
    updatedAt: createdAt
  })

  await createHackathonTracks(database, hackathonId, body.tracks)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.created',
    metadata: {
      slug: body.slug
    }
  })

  const createdHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })
  const createdTracks = await listHackathonTracks(database, hackathonId)

  return apiData(serializeHackathon(createdHackathon!, undefined, createdTracks))
})
