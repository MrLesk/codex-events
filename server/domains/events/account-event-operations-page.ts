import { asc, eq, getTableColumns } from 'drizzle-orm'
import type { z } from 'zod'

import type { AccountEventOperationsPage } from '#shared/domains/events/account-event-operations-page'
import { accountEventOperationsPageSchema } from '#shared/domains/events/account-event-operations-page'
import {
  getCurrentEventTerms,
  listEventTracks,
  serializeAdminEvent,
  serializeEventRoleAssignment,
  serializePrize
} from '#server/domains/events'
import { assertEventAdminAccess } from '#server/auth/authorization'
import {
  eventRoleAssignments,
  prizes,
  users
} from '#server/database/schema'
import {
  getJudgingAssignmentSummary,
  listActiveJudgeAssignmentSummaries
} from '#server/domains/judging'
import {
  getEventSubmissionSummary,
  listSubmissionMonitorTeams
} from '#server/domains/submissions'
import { listEventApplications } from '#server/domains/applications'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import type { listTeamsQuerySchema } from '#server/domains/teams'
import { listVisibleTeams } from '#server/domains/teams'
import {
  getFinalDeliberationView,
  getShortlistView,
  getWinnersView,
  listBlindRankingEntries,
  listLeaderboardEntries,
  serializeLeaderboardEntry
} from '#server/domains/outcomes'
import {
  listEventPrizeRedemptions,
  listOperationalPrizeRedemptionTeamMembersByTeamId
} from '#server/domains/prize-redemptions'
import type { AccountEventPageContext } from './account-event-page-context'
import { defineAccountEventPageRoute } from './account-event-page-contract'

const firstPageQuery = { page: 1, page_size: 100 } as const satisfies z.infer<typeof listTeamsQuerySchema>

function emptySubmissionSummary() {
  return {
    totalTeams: 0,
    noSubmissionTeamCount: 0,
    submittedOrLaterTeamCount: 0,
    statusCounts: {
      none: 0,
      draft: 0,
      submitted: 0,
      locked: 0,
      withdrawn: 0,
      disqualified: 0
    }
  }
}

function emptyJudgingSummary() {
  return {
    totalAssignmentCount: 0,
    activeAssignmentCount: 0,
    completedPitchAssignmentCount: 0
  }
}

async function loadRoleAssignments(context: AccountEventPageContext) {
  const [assignments, relatedUsers] = await Promise.all([
    context.database.query.eventRoleAssignments.findMany({
      where: eq(eventRoleAssignments.eventId, context.event.id),
      orderBy: [asc(eventRoleAssignments.createdAt)]
    }),
    context.database
      .select(getTableColumns(users))
      .from(users)
      .innerJoin(eventRoleAssignments, eq(eventRoleAssignments.userId, users.id))
      .where(eq(eventRoleAssignments.eventId, context.event.id))
  ])
  const usersById = new Map(relatedUsers.map(user => [user.id, user]))

  return assignments.map(assignment =>
    serializeEventRoleAssignment(assignment, usersById.get(assignment.userId) ?? null)
  )
}

async function loadPrizeRedemptionData(
  context: AccountEventPageContext,
  eventState: string
) {
  if (!['winners_announced', 'completed'].includes(eventState)) {
    return {
      redemptions: [],
      finalRankingEntries: [],
      blindRankingEntries: []
    }
  }

  const [winners, redemptions, finalDeliberation, blindRankingEntries] = await Promise.all([
    getWinnersView(context.database, context.event.id),
    listEventPrizeRedemptions(context.database, context.event.id),
    getFinalDeliberationView(context.database, context.event.id),
    listBlindRankingEntries(context.database, context.event.id)
  ])
  const rankedFinalEntries = finalDeliberation.entries.filter(
    (entry): entry is typeof finalDeliberation.entries[number] & { finalRank: number } =>
      entry.finalRank !== null
  )
  const rankedBlindEntries = blindRankingEntries.filter(
    (entry): entry is typeof blindRankingEntries[number] & { rank: number } =>
      entry.rank !== null
  )
  const teamIds = [...new Set([
    ...winners.map(entry => entry.teamId),
    ...rankedFinalEntries.map(entry => entry.teamId),
    ...rankedBlindEntries.map(entry => entry.teamId)
  ])]
  const teamMembersByTeamId = await listOperationalPrizeRedemptionTeamMembersByTeamId(
    context.database,
    context.event.id,
    teamIds
  )

  return {
    redemptions,
    finalRankingEntries: rankedFinalEntries.map(entry => ({
      teamId: entry.teamId,
      teamName: entry.teamName,
      submissionId: entry.submissionId,
      projectName: entry.projectName,
      summary: entry.summary,
      repositoryUrl: entry.repositoryUrl,
      demoUrl: entry.demoUrl,
      finalRank: entry.finalRank,
      teamMembers: teamMembersByTeamId.get(entry.teamId) ?? []
    })),
    blindRankingEntries: rankedBlindEntries.map(entry => ({
      teamId: entry.teamId,
      teamName: entry.teamName,
      submissionId: entry.submissionId,
      projectName: entry.projectName,
      summary: entry.summary,
      repositoryUrl: entry.repositoryUrl,
      demoUrl: entry.demoUrl,
      blindRank: entry.rank,
      teamMembers: teamMembersByTeamId.get(entry.teamId) ?? []
    }))
  }
}

export function assertAccountEventOperationsAccess(context: AccountEventPageContext) {
  assertEventAdminAccess(context.authorization)
}

export async function loadAccountEventOperationsPage(
  context: AccountEventPageContext
): Promise<AccountEventOperationsPage> {
  const event = context.event
  const isCompetition = event.eventType === 'hackathon'
  const [tracks, currentTerms, imageOptions, roleAssignments, teams, applications] = await Promise.all([
    listEventTracks(context.database, event.id),
    getCurrentEventTerms(context.database, event),
    getEventDisplayImageOptions(context.database),
    loadRoleAssignments(context),
    listVisibleTeams(context.database, event, event.id, firstPageQuery, {
      includeInactiveTeams: true
    }),
    listEventApplications(context.database, event.id, firstPageQuery)
  ])

  const [submissionSummary, submissionMonitor, judgingSummary, assignmentResult, leaderboard] = isCompetition
    ? await Promise.all([
        getEventSubmissionSummary(context.database, event.id),
        listSubmissionMonitorTeams(context.database, event.id),
        getJudgingAssignmentSummary(context.database, event),
        listActiveJudgeAssignmentSummaries(context.database, event.id, firstPageQuery),
        listLeaderboardEntries(context.database, event.id)
      ])
    : [
        emptySubmissionSummary(),
        { teamDetails: [], teamSubmissions: [] },
        emptyJudgingSummary(),
        { data: [], total: 0 },
        []
      ]

  const [shortlist, finalDeliberation, winners, prizeRedemptions] = await Promise.all([
    isCompetition && event.state === 'shortlist'
      ? getShortlistView(context.database, event.id)
      : Promise.resolve({ entries: [], hasSavedShortlistSelection: false }),
    isCompetition && event.state === 'final_deliberation'
      ? getFinalDeliberationView(context.database, event.id)
      : Promise.resolve({ entries: [], finalRankingSubmissionIds: [] }),
    isCompetition && ['winners_announced', 'completed'].includes(event.state)
      ? getWinnersView(context.database, event.id)
      : Promise.resolve([]),
    loadPrizeRedemptionData(context, event.state)
  ])
  return {
    event: serializeAdminEvent(event, currentTerms, tracks, { appBaseUrl: '', ...imageOptions }),
    roles: {
      assignments: roleAssignments
    },
    assignments: {
      data: assignmentResult.data,
      total: assignmentResult.total
    },
    judgingSummary,
    leaderboard: leaderboard.map(serializeLeaderboardEntry),
    teams: {
      data: teams.data,
      total: teams.total
    },
    prizes: isCompetition
      ? (await context.database.query.prizes.findMany({
          where: eq(prizes.eventId, event.id),
          orderBy: [asc(prizes.displayOrder)]
        })).map(serializePrize)
      : [],
    applications: applications.data,
    submissionSummary,
    submissionMonitor,
    shortlist,
    finalDeliberation,
    winners,
    prizeRedemptions
  }
}

export const accountEventOperationsPageRoute = defineAccountEventPageRoute({
  page: 'operations',
  schema: accountEventOperationsPageSchema,
  authorize: assertAccountEventOperationsAccess,
  load: loadAccountEventOperationsPage
})
