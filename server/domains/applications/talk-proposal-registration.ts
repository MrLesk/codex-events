import { and, eq, exists, gt, gte, isNull, lte, notExists, sql } from 'drizzle-orm'
import type { z } from 'zod'

import type { AppDatabase } from '#server/database/client'
import { events, talkProposals, userApplications } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'
import {
  assertEventAllowsApplications,
  assertNoExistingApplication
} from '#server/domains/applications'
import {
  assertNoOwnTalkProposal,
  assertTalkProposalAnswers,
  assertTalkProposalWindowOpen
} from '#server/domains/talk-proposals'
import type { talkProposalContentBodySchema } from '#server/domains/talk-proposals'

type EventRecord = typeof events.$inferSelect
type UserApplicationInsert = typeof userApplications.$inferInsert
type TalkProposalContent = z.infer<typeof talkProposalContentBodySchema>

export async function createApplicationWithSubmittedTalkProposal(options: {
  database: AppDatabase
  event: EventRecord
  application: UserApplicationInsert & { id: string }
  proposal: TalkProposalContent
  now?: Date
}) {
  const now = options.now ?? new Date()
  const timestamp = now.toISOString()
  const eventId = options.event.id
  const userId = options.application.userId

  assertEventAllowsApplications(options.event, now)
  assertTalkProposalWindowOpen(options.event, now)
  assertTalkProposalAnswers(
    options.event,
    options.proposal.questionSetRevision,
    options.proposal.answers,
    true
  )
  await assertNoExistingApplication(options.database, eventId, userId)
  await assertNoOwnTalkProposal(options.database, eventId, userId)

  const proposalId = crypto.randomUUID()
  const currentTermsPredicate = options.application.applicationTermsDocumentId
    ? eq(events.currentApplicationTermsDocumentId, options.application.applicationTermsDocumentId)
    : isNull(events.currentApplicationTermsDocumentId)
  const canCreateRegistration = and(
    exists(
      options.database
        .select({ id: events.id })
        .from(events)
        .where(and(
          eq(events.id, eventId),
          eq(events.state, 'registration_open'),
          lte(events.registrationOpensAt, timestamp),
          gt(events.registrationClosesAt, timestamp),
          eq(events.eventType, 'meetup'),
          eq(events.talkProposalsEnabled, true),
          lte(events.talkProposalOpensAt, timestamp),
          gte(events.talkProposalClosesAt, timestamp),
          eq(events.talkProposalQuestionsRevision, options.proposal.questionSetRevision),
          currentTermsPredicate
        ))
    ),
    notExists(
      options.database
        .select({ id: userApplications.id })
        .from(userApplications)
        .where(and(
          eq(userApplications.eventId, eventId),
          eq(userApplications.userId, userId)
        ))
    ),
    notExists(
      options.database
        .select({ id: talkProposals.id })
        .from(talkProposals)
        .where(and(
          eq(talkProposals.eventId, eventId),
          eq(talkProposals.userId, userId)
        ))
    )
  )

  try {
    await options.database.batch([
      options.database.insert(talkProposals).values({
        id: sql<string>`case when ${canCreateRegistration} then ${proposalId} else null end`,
        eventId,
        userId,
        status: 'submitted',
        title: options.proposal.title,
        abstract: options.proposal.abstract,
        demoOrSlidesUrl: options.proposal.demoOrSlidesUrl?.trim() || null,
        questionSetRevision: options.proposal.questionSetRevision,
        answersJson: JSON.stringify(options.proposal.answers),
        submittedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      }),
      options.database.insert(userApplications).values(options.application)
    ])
  } catch (error) {
    const currentEvent = await options.database.query.events.findFirst({
      where: eq(events.id, eventId)
    })

    if (currentEvent) {
      assertEventAllowsApplications(currentEvent, now)
      assertTalkProposalWindowOpen(currentEvent, now)
      assertTalkProposalAnswers(
        currentEvent,
        options.proposal.questionSetRevision,
        options.proposal.answers,
        true
      )
    }

    await assertNoExistingApplication(options.database, eventId, userId)
    await assertNoOwnTalkProposal(options.database, eventId, userId)
    throw error
  }

  const [application, proposal] = await Promise.all([
    options.database.query.userApplications.findFirst({
      where: eq(userApplications.id, options.application.id)
    }),
    options.database.query.talkProposals.findFirst({
      where: eq(talkProposals.id, proposalId)
    })
  ])

  if (!application || !proposal) {
    throw new ApiError({
      statusCode: 500,
      code: 'talk_proposal_registration_failed',
      message: 'The registration and Talk proposal could not be submitted.'
    })
  }

  return { application, proposal }
}
