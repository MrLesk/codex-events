import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../auth/actor'
import { assertPlatformAdminAccess } from '../../auth/authorization'
import { writeAuditLog } from '../../database/audit-log'
import { getDatabase } from '../../database/client'
import { hackathons } from '../../database/schema'
import { defineApiHandler } from '../../utils/api-handler'
import { apiData } from '../../utils/api-response'
import {
  assertHackathonSchedule,
  assertHackathonSlugAvailable,
  createHackathonBodySchema,
  serializeHackathonAgendaItems,
  serializeHackathon
} from '../../utils/hackathon-management'
import { parseValidatedBody } from '../../utils/validation'

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
    lumaEventUrl: body.lumaEventUrl ?? null,
    city: body.city,
    country: body.country,
    address: body.address,
    registrationOpensAt: body.registrationOpensAt,
    registrationClosesAt: body.registrationClosesAt,
    submissionOpensAt: body.submissionOpensAt,
    submissionClosesAt: body.submissionClosesAt,
    maxTeamMembers: body.maxTeamMembers,
    participantsLimit: body.participantsLimit,
    inPersonEvent: body.inPersonEvent,
    requireXProfile: body.requireXProfile,
    requireLinkedinProfile: body.requireLinkedinProfile,
    requireGithubProfile: body.requireGithubProfile,
    requireChatgptEmail: body.requireChatgptEmail,
    requireOpenaiOrgId: body.requireOpenaiOrgId,
    requireLumaProfile: body.requireLumaProfile,
    requireWhyThisHackathon: body.requireWhyThisHackathon,
    requireProofOfExecution: body.requireProofOfExecution,
    state: 'draft',
    createdByUserId: actor.platformUser.id,
    createdAt,
    updatedAt: createdAt
  })

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

  return apiData(serializeHackathon(createdHackathon!))
})
