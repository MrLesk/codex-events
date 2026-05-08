import { and, asc, desc, eq, getTableColumns, isNull, ne, sql } from 'drizzle-orm'
import { z } from 'zod'

import type { AppDatabase } from '#server/database/client'
import {
  evaluationCriteria,
  eventOutcomeCacheEntries,
  eventOutcomeCaches,
  events,
  judgeAssignments,
  judgeCriterionScores,
  prizeEligibilitySnapshots,
  prizes,
  submissions,
  teamMembers,
  teams,
  users
} from '#server/database/schema'
import { ApiError } from '#server/http/api-error'
import {
  assertCompetitionEvent,
  serializeEventPublishedProjectTeamMember,
  serializeEventWinnerTeamMember,
  serializePrize
} from '#server/domains/events'
import {
  calculateAveragePitchScore,
  parseStoredPitchFinalistSubmissionIds
} from '#server/domains/judging'
import { assertAllowedState, assertGuard } from '#server/domains/lifecycle-guard'

type EventRecord = typeof events.$inferSelect
type TeamRecord = typeof teams.$inferSelect
type SubmissionRecord = typeof submissions.$inferSelect
type JudgeAssignmentRecord = typeof judgeAssignments.$inferSelect
type JudgeCriterionScoreRecord = typeof judgeCriterionScores.$inferSelect
type PrizeEligibilitySnapshotRecord = typeof prizeEligibilitySnapshots.$inferSelect
type PrizeRecord = typeof prizes.$inferSelect
type UserRecord = typeof users.$inferSelect
type SerializedPrizeSummary = ReturnType<typeof serializePrize>
type CompletedOutcomeCollections = {
  winners: Array<ReturnType<typeof serializeWinnerEntry> & {
    prizes: SerializedPrizeSummary[]
    teamMembers: Array<ReturnType<typeof serializeEventWinnerTeamMember>>
  }>
  publishedProjects: Array<ReturnType<typeof serializePublishedProjectEntry> & {
    teamMembers: Array<ReturnType<typeof serializeEventPublishedProjectTeamMember>>
  }>
}

type LeaderboardCriterionScore = {
  evaluationCriterionId: string
  criterionName: string | null
  criterionWeight: number | null
  score: number
  comment: string | null
}

type LeaderboardBaseEntry = {
  team: TeamRecord
  submission: SubmissionRecord
  reviewStatus: JudgeAssignmentRecord['status'] | null
  ineligibilityStatus: JudgeAssignmentRecord['ineligibilityStatus'] | null
  scoreTotal: number | null
  criterionScores: LeaderboardCriterionScore[]
  baseRank: number | null
  isRanked: boolean
}

type CompetitionEntry = {
  team: TeamRecord
  submission: SubmissionRecord
  blindReviewStatus: JudgeAssignmentRecord['status'] | null
  pitchReviewStatus: JudgeAssignmentRecord['status'] | null
  ineligibilityStatus: JudgeAssignmentRecord['ineligibilityStatus'] | null
  blindScore: number | null
  pitchScore: number | null
  scoreTotal: number | null
  criterionScores: LeaderboardCriterionScore[]
  blindRank: number | null
  finalScoreRank: number | null
  isBlindRanked: boolean
  isFinalRanked: boolean
}

type TeamCompetitionOutcome = {
  isShortlisted: boolean
  isWinner: boolean
  finalRank: number | null
  rankedTeamCount: number
  prizes: SerializedPrizeSummary[]
  rankSummary: {
    basis: 'final' | 'blind_review'
    rank: number
    rankedTeamCount: number
    totalTeamCount: number
  } | null
}

export const selectFinalistsBodySchema = z.object({
  orderedSubmissionIds: z.array(z.string().trim().min(1)).min(1),
  finalistSubmissionIds: z.array(z.string().trim().min(1))
})

export const reorderFinalDeliberationBodySchema = z.object({
  orderedSubmissionIds: z.array(z.string().trim().min(1)).min(1)
})

function mapCriterionScores(
  scoreRows: JudgeCriterionScoreRecord[],
  criteriaById: Map<string, typeof evaluationCriteria.$inferSelect>
): LeaderboardCriterionScore[] {
  return scoreRows.map(scoreRow => ({
    evaluationCriterionId: scoreRow.evaluationCriterionId,
    criterionName: criteriaById.get(scoreRow.evaluationCriterionId)?.name ?? null,
    criterionWeight: criteriaById.get(scoreRow.evaluationCriterionId)?.weight ?? null,
    score: scoreRow.score,
    comment: scoreRow.comment
  }))
}

function normalizeBlindAssignmentScore(criterionScores: LeaderboardCriterionScore[]) {
  const totalWeight = criterionScores.reduce(
    (total, scoreRow) => total + (scoreRow.criterionWeight ?? 0),
    0
  )

  if (criterionScores.length === 0 || totalWeight <= 0) {
    return null
  }

  const weightedTotal = criterionScores.reduce(
    (total, scoreRow) => total + (scoreRow.score * (scoreRow.criterionWeight ?? 0)),
    0
  )

  return weightedTotal / totalWeight
}

function averageNumbers(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((total, value) => total + value, 0) / values.length
}

function parseStoredFinalRankingSubmissionIds(
  event: Pick<EventRecord, 'id' | 'finalRankingSubmissionIdsJson'>
) {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(event.finalRankingSubmissionIdsJson)
  } catch {
    throw new ApiError({
      statusCode: 500,
      code: 'final_ranking_invalid',
      message: 'The stored ranking order is invalid.',
      details: {
        eventId: event.id
      }
    })
  }

  const result = z.array(z.string().trim().min(1)).safeParse(parsedValue)

  if (!result.success) {
    throw new ApiError({
      statusCode: 500,
      code: 'final_ranking_invalid',
      message: 'The stored ranking order is invalid.',
      details: {
        eventId: event.id
      }
    })
  }

  return result.data
}

export function hasSavedShortlistSelection(
  event: Pick<EventRecord, 'id' | 'finalRankingSubmissionIdsJson'>
) {
  return parseStoredFinalRankingSubmissionIds(event).length > 0
}

function compareEntriesByScore(
  left: Pick<CompetitionEntry, 'team' | 'submission'>,
  right: Pick<CompetitionEntry, 'team' | 'submission'>,
  leftScore: number | null,
  rightScore: number | null
) {
  if ((rightScore ?? -1) !== (leftScore ?? -1)) {
    return (rightScore ?? -1) - (leftScore ?? -1)
  }

  const leftSubmittedAt = left.submission.submittedAt ?? left.submission.createdAt
  const rightSubmittedAt = right.submission.submittedAt ?? right.submission.createdAt

  if (leftSubmittedAt !== rightSubmittedAt) {
    return leftSubmittedAt.localeCompare(rightSubmittedAt)
  }

  return left.team.id.localeCompare(right.team.id)
}

function assignRanks(
  entries: CompetitionEntry[],
  options: {
    isRanked: (entry: CompetitionEntry) => boolean
    getScore: (entry: CompetitionEntry) => number | null
    setRank: (entry: CompetitionEntry, rank: number) => CompetitionEntry
  }
) {
  const rankedEntries = [...entries]
    .filter(options.isRanked)
    .sort((left, right) =>
      compareEntriesByScore(left, right, options.getScore(left), options.getScore(right))
    )
    .map((entry, index) => options.setRank(entry, index + 1))

  const rankedBySubmissionId = new Map(
    rankedEntries.map(entry => [entry.submission.id, entry] as const)
  )
  const unrankedEntries = entries
    .filter(entry => !options.isRanked(entry))
    .sort((left, right) => left.team.name.localeCompare(right.team.name))

  return [...rankedEntries, ...unrankedEntries].map(
    entry => rankedBySubmissionId.get(entry.submission.id) ?? entry
  )
}

export function calculateFinalScore(
  event: Pick<
    EventRecord,
    'blindReviewCount' | 'pitchReviewEnabled' | 'blindScoreWeightPercent' | 'pitchScoreWeightPercent'
  >,
  scores: {
    blindScore: number | null
    pitchScore: number | null
  }
) {
  if (event.blindReviewCount > 0 && !event.pitchReviewEnabled) {
    return scores.blindScore
  }

  if (event.blindReviewCount === 0 && event.pitchReviewEnabled) {
    return scores.pitchScore
  }

  if (!event.pitchReviewEnabled) {
    return null
  }

  if (scores.blindScore === null || scores.pitchScore === null) {
    return null
  }

  return (scores.blindScore * event.blindScoreWeightPercent / 100)
    + (scores.pitchScore * event.pitchScoreWeightPercent / 100)
}

function shouldUseFinalScoreLeaderboard(event: EventRecord) {
  return event.pitchReviewEnabled && [
    'pitch_review',
    'final_deliberation',
    'winners_announced',
    'completed'
  ].includes(event.state)
}

function toBlindLeaderboardEntries(entries: CompetitionEntry[]): LeaderboardBaseEntry[] {
  const rankedEntries = entries
    .filter(entry => entry.isBlindRanked)
    .sort((left, right) => (left.blindRank ?? Number.MAX_SAFE_INTEGER) - (right.blindRank ?? Number.MAX_SAFE_INTEGER))
  const unrankedEntries = entries
    .filter(entry => !entry.isBlindRanked)
    .sort((left, right) => left.team.name.localeCompare(right.team.name))

  return [...rankedEntries, ...unrankedEntries].map(entry => ({
    team: entry.team,
    submission: entry.submission,
    reviewStatus: entry.blindReviewStatus,
    ineligibilityStatus: entry.ineligibilityStatus,
    scoreTotal: entry.blindScore,
    criterionScores: entry.criterionScores,
    baseRank: entry.blindRank,
    isRanked: entry.isBlindRanked
  }))
}

function toFinalLeaderboardEntries(
  entries: CompetitionEntry[],
  event: EventRecord
): LeaderboardBaseEntry[] {
  return entries.map(entry => ({
    team: entry.team,
    submission: entry.submission,
    reviewStatus: event.pitchReviewEnabled
      ? entry.pitchReviewStatus
      : entry.blindReviewStatus,
    ineligibilityStatus: entry.ineligibilityStatus,
    scoreTotal: entry.scoreTotal,
    criterionScores: entry.criterionScores,
    baseRank: entry.finalScoreRank,
    isRanked: entry.isFinalRanked
  }))
}

export function serializeLeaderboardEntry(entry: LeaderboardBaseEntry) {
  return {
    teamId: entry.team.id,
    teamName: entry.team.name,
    submissionId: entry.submission.id,
    projectName: entry.submission.projectName,
    summary: entry.submission.summary,
    repositoryUrl: entry.submission.repositoryUrl,
    demoUrl: entry.submission.demoUrl,
    submissionStatus: entry.submission.status,
    reviewStatus: entry.reviewStatus,
    ineligibilityStatus: entry.ineligibilityStatus,
    scoreTotal: entry.scoreTotal,
    rank: entry.baseRank,
    criterionScores: entry.criterionScores
  }
}

export function serializeShortlistEntry(
  entry: LeaderboardBaseEntry,
  pitchFinalistRank: number | null
) {
  return {
    submissionId: entry.submission.id,
    projectName: entry.submission.projectName,
    summary: entry.submission.summary,
    submissionStatus: entry.submission.status,
    reviewStatus: entry.reviewStatus,
    ineligibilityStatus: entry.ineligibilityStatus,
    scoreTotal: entry.scoreTotal,
    rank: entry.baseRank,
    criterionScores: entry.criterionScores,
    isPitchFinalist: pitchFinalistRank !== null,
    pitchFinalistRank
  }
}

function serializeFinalDeliberationEntry(
  entry: CompetitionEntry,
  event: EventRecord,
  finalRank: number | null
) {
  return {
    teamId: entry.team.id,
    teamName: entry.team.name,
    submissionId: entry.submission.id,
    projectName: entry.submission.projectName,
    summary: entry.submission.summary,
    repositoryUrl: entry.submission.repositoryUrl,
    demoUrl: entry.submission.demoUrl,
    submissionStatus: entry.submission.status,
    reviewStatus: event.pitchReviewEnabled
      ? entry.pitchReviewStatus
      : entry.blindReviewStatus,
    ineligibilityStatus: entry.ineligibilityStatus,
    scoreTotal: entry.scoreTotal,
    scoreRank: entry.finalScoreRank,
    finalRank,
    ...(event.blindReviewCount > 0
      ? { blindScore: entry.blindScore }
      : {}),
    ...(event.pitchReviewEnabled
      ? { pitchScore: entry.pitchScore }
      : {})
  }
}

function serializeWinnerEntry(
  entry: CompetitionEntry,
  _event: EventRecord,
  finalRank: number
) {
  return {
    teamId: entry.team.id,
    teamName: entry.team.name,
    submissionId: entry.submission.id,
    projectName: entry.submission.projectName,
    summary: entry.submission.summary,
    repositoryUrl: entry.submission.repositoryUrl,
    demoUrl: entry.submission.demoUrl,
    finalRank
  }
}

function serializePublishedProjectEntry(entry: CompetitionEntry) {
  return {
    teamId: entry.team.id,
    teamName: entry.team.name,
    submissionId: entry.submission.id,
    projectName: entry.submission.projectName,
    summary: entry.submission.summary,
    repositoryUrl: entry.submission.repositoryUrl,
    demoUrl: entry.submission.demoUrl
  }
}

function buildAwardsBySubmissionId(
  prizeList: PrizeRecord[],
  winnerEntries: Array<ReturnType<typeof serializeWinnerEntry>>
) {
  const awardsBySubmissionId = new Map<string, Array<PrizeRecord>>()

  for (const prize of prizeList) {
    for (const winnerEntry of winnerEntries) {
      if (winnerEntry.finalRank >= prize.rankStart && winnerEntry.finalRank <= prize.rankEnd) {
        const awardedPrizes = awardsBySubmissionId.get(winnerEntry.submissionId) ?? []
        awardedPrizes.push(prize)
        awardsBySubmissionId.set(winnerEntry.submissionId, awardedPrizes)
      }
    }
  }

  return awardsBySubmissionId
}

async function loadCompletedOutcomeTeamMembers(
  database: AppDatabase,
  eventId: string,
  teamIds: string[],
  eventSlug: string,
  serializeMember: (
    user: UserRecord,
    eventSlug: string
  ) => ReturnType<typeof serializeEventWinnerTeamMember>
) {
  if (teamIds.length === 0) {
    return new Map<string, Array<ReturnType<typeof serializeEventWinnerTeamMember>>>()
  }

  const requestedTeamIds = new Set(teamIds)
  const snapshots = (await database.query.prizeEligibilitySnapshots.findMany({
    where: eq(prizeEligibilitySnapshots.eventId, eventId),
    orderBy: [asc(prizeEligibilitySnapshots.teamId), asc(prizeEligibilitySnapshots.createdAt)]
  })).filter(snapshot => requestedTeamIds.has(snapshot.teamId)) as PrizeEligibilitySnapshotRecord[]
  const relatedUsers = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(prizeEligibilitySnapshots, eq(prizeEligibilitySnapshots.userId, users.id))
    .where(and(
      eq(prizeEligibilitySnapshots.eventId, eventId),
      isNull(users.deletedAt)
    )) as UserRecord[]
  const usersById = new Map(
    relatedUsers.map(user => [user.id, user] as const)
  )
  const teamMembersByTeamId = new Map<string, Array<ReturnType<typeof serializeEventWinnerTeamMember>>>()
  const seenTeamMemberKeys = new Set<string>()

  for (const snapshot of snapshots) {
    const user = usersById.get(snapshot.userId)

    if (!user) {
      continue
    }

    const teamMemberKey = `${snapshot.teamId}:${snapshot.userId}`

    if (seenTeamMemberKeys.has(teamMemberKey)) {
      continue
    }

    seenTeamMemberKeys.add(teamMemberKey)

    const teamMembers = teamMembersByTeamId.get(snapshot.teamId) ?? []
    teamMembers.push(serializeMember(user, eventSlug))
    teamMembersByTeamId.set(snapshot.teamId, teamMembers)
  }

  return teamMembersByTeamId
}

async function buildCompletedOutcomeCollections(database: AppDatabase, eventId: string): Promise<CompletedOutcomeCollections> {
  const [{ event, entries }, prizeList] = await Promise.all([
    loadCompetitionEntries(database, eventId),
    database.query.prizes.findMany({
      where: eq(prizes.eventId, eventId),
      orderBy: [asc(prizes.displayOrder), asc(prizes.rankEnd), desc(prizes.rankStart), asc(prizes.createdAt)]
    })
  ])

  if (!event) {
    return {
      winners: [],
      publishedProjects: []
    }
  }

  const {
    orderedRankedEntries,
    finalRanksBySubmissionId,
    unrankedEntries
  } = deriveFinalDeliberationOrdering(event, entries)
  const completedEntries = [
    ...orderedRankedEntries,
    ...unrankedEntries
  ]
  const winnerEntries = orderedRankedEntries.map(entry =>
    serializeWinnerEntry(
      entry,
      event,
      finalRanksBySubmissionId.get(entry.submission.id)!
    )
  )
  const awardsBySubmissionId = buildAwardsBySubmissionId(prizeList, winnerEntries)
  const winningEntries = winnerEntries
    .filter(entry => (awardsBySubmissionId.get(entry.submissionId) ?? []).length > 0)
    .map(entry => ({
      ...entry,
      prizes: (awardsBySubmissionId.get(entry.submissionId) ?? []).map(serializePrize)
    }))
  const publishedProjectEntries = completedEntries
    .filter(entry =>
      entry.submission.status === 'locked'
      && entry.submission.isPubliclyVisible
      && !awardsBySubmissionId.has(entry.submission.id)
    )
    .map(serializePublishedProjectEntry)
  const [winnerTeamMembersByTeamId, publishedTeamMembersByTeamId] = await Promise.all([
    loadCompletedOutcomeTeamMembers(
      database,
      eventId,
      [...new Set(winningEntries.map(entry => entry.teamId))],
      event.slug,
      serializeEventWinnerTeamMember
    ),
    loadCompletedOutcomeTeamMembers(
      database,
      eventId,
      [...new Set(publishedProjectEntries.map(entry => entry.teamId))],
      event.slug,
      serializeEventPublishedProjectTeamMember
    )
  ])

  return {
    winners: winningEntries.map(entry => ({
      ...entry,
      teamMembers: winnerTeamMembersByTeamId.get(entry.teamId) ?? []
    })),
    publishedProjects: publishedProjectEntries.map(entry => ({
      ...entry,
      teamMembers: publishedTeamMembersByTeamId.get(entry.teamId) ?? []
    }))
  }
}

async function readCompletedOutcomeCache(
  database: AppDatabase,
  cache: typeof eventOutcomeCaches.$inferSelect
): Promise<CompletedOutcomeCollections> {
  const rows = await database.query.eventOutcomeCacheEntries.findMany({
    where: and(
      eq(eventOutcomeCacheEntries.eventId, cache.eventId),
      eq(eventOutcomeCacheEntries.generationId, cache.generationId)
    ),
    orderBy: [
      asc(eventOutcomeCacheEntries.collection),
      asc(eventOutcomeCacheEntries.displayOrder)
    ]
  })
  const winners: CompletedOutcomeCollections['winners'] = []
  const publishedProjects: CompletedOutcomeCollections['publishedProjects'] = []

  for (const row of rows) {
    if (row.collection === 'winners') {
      winners.push(JSON.parse(row.payloadJson))
    } else {
      publishedProjects.push(JSON.parse(row.payloadJson))
    }
  }

  return {
    winners,
    publishedProjects
  }
}

async function insertCompletedOutcomeCacheEntries(
  database: AppDatabase,
  rows: Array<typeof eventOutcomeCacheEntries.$inferInsert>
) {
  const chunkSize = 10

  for (let index = 0; index < rows.length; index += chunkSize) {
    await database
      .insert(eventOutcomeCacheEntries)
      .values(rows.slice(index, index + chunkSize))
  }
}

async function writeCompletedOutcomeCache(
  database: AppDatabase,
  eventId: string,
  collections: CompletedOutcomeCollections,
  timestamp = new Date().toISOString()
) {
  const generationId = crypto.randomUUID()
  const rows: Array<typeof eventOutcomeCacheEntries.$inferInsert> = [
    ...collections.winners.map((entry, index) => ({
      eventId,
      generationId,
      collection: 'winners' as const,
      displayOrder: index,
      payloadJson: JSON.stringify(entry),
      createdAt: timestamp
    })),
    ...collections.publishedProjects.map((entry, index) => ({
      eventId,
      generationId,
      collection: 'published_projects' as const,
      displayOrder: index,
      payloadJson: JSON.stringify(entry),
      createdAt: timestamp
    }))
  ]

  if (rows.length > 0) {
    await insertCompletedOutcomeCacheEntries(database, rows)
  }

  await database
    .insert(eventOutcomeCaches)
    .values({
      eventId,
      generationId,
      generatedAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: eventOutcomeCaches.eventId,
      set: {
        generationId: sql`excluded.generation_id`,
        generatedAt: sql`excluded.generated_at`,
        updatedAt: timestamp
      }
    })

  await database
    .delete(eventOutcomeCacheEntries)
    .where(and(
      eq(eventOutcomeCacheEntries.eventId, eventId),
      ne(eventOutcomeCacheEntries.generationId, generationId)
    ))
}

async function loadCompletedOutcomeCollections(database: AppDatabase, eventId: string) {
  const event = await database.query.events.findFirst({
    columns: {
      id: true,
      state: true
    },
    where: eq(events.id, eventId)
  })

  if (event?.state === 'completed') {
    const cache = await database.query.eventOutcomeCaches.findFirst({
      where: eq(eventOutcomeCaches.eventId, eventId)
    })

    if (cache) {
      return await readCompletedOutcomeCache(database, cache)
    }
  }

  const collections = await buildCompletedOutcomeCollections(database, eventId)

  if (event?.state === 'completed') {
    await writeCompletedOutcomeCache(database, eventId, collections)
  }

  return collections
}

export async function refreshCompletedOutcomeCache(database: AppDatabase, eventId: string) {
  const collections = await buildCompletedOutcomeCollections(database, eventId)
  await writeCompletedOutcomeCache(database, eventId, collections)

  return collections
}

async function loadCompetitionEntries(
  database: AppDatabase,
  eventId: string
): Promise<{
  event: EventRecord | null
  entries: CompetitionEntry[]
  totalTeamCount: number
}> {
  const event = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })

  if (!event) {
    return {
      event: null,
      entries: [],
      totalTeamCount: 0
    }
  }

  const eventTeams = await database.query.teams.findMany({
    where: eq(teams.eventId, eventId),
    orderBy: [asc(teams.createdAt), asc(teams.name)]
  })

  if (eventTeams.length === 0) {
    return {
      event,
      entries: [],
      totalTeamCount: 0
    }
  }

  const activeMembershipRows = await database
    .select(getTableColumns(teamMembers))
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teams.eventId, eventId),
      isNull(teamMembers.leftAt)
    ))
  const totalTeamCount = new Set(activeMembershipRows.map(membership => membership.teamId)).size
  const submissionsForEvent = await database
    .select(getTableColumns(submissions))
    .from(submissions)
    .innerJoin(teams, eq(teams.id, submissions.teamId))
    .where(eq(teams.eventId, eventId))
    .orderBy(desc(submissions.createdAt))
  const latestSubmissionByTeamId = new Map<string, SubmissionRecord>()

  for (const submission of submissionsForEvent) {
    if (!latestSubmissionByTeamId.has(submission.teamId)) {
      latestSubmissionByTeamId.set(submission.teamId, submission)
    }
  }

  const trackedSubmissions = eventTeams
    .map(team => ({
      team,
      submission: latestSubmissionByTeamId.get(team.id) ?? null
    }))
    .filter(
      (entry): entry is { team: TeamRecord, submission: SubmissionRecord } =>
        entry.submission !== null && ['locked', 'disqualified'].includes(entry.submission.status)
    )

  if (trackedSubmissions.length === 0) {
    return {
      event,
      entries: [],
      totalTeamCount
    }
  }

  const assignmentRows = await database.query.judgeAssignments.findMany({
    where: eq(judgeAssignments.eventId, eventId),
    orderBy: [desc(judgeAssignments.createdAt)]
  })
  const assignmentsBySubmissionId = new Map<string, JudgeAssignmentRecord[]>()

  for (const assignment of assignmentRows) {
    const assignments = assignmentsBySubmissionId.get(assignment.submissionId) ?? []
    assignments.push(assignment)
    assignmentsBySubmissionId.set(assignment.submissionId, assignments)
  }

  const criteria = await database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.eventId, eventId),
    orderBy: [asc(evaluationCriteria.displayOrder), asc(evaluationCriteria.createdAt)]
  })
  const criteriaById = new Map(criteria.map(criterion => [criterion.id, criterion]))
  const scoreRows = assignmentRows.length === 0
    ? []
    : await database
        .select(getTableColumns(judgeCriterionScores))
        .from(judgeCriterionScores)
        .innerJoin(judgeAssignments, eq(judgeAssignments.id, judgeCriterionScores.judgeAssignmentId))
        .where(eq(judgeAssignments.eventId, eventId))
        .orderBy(asc(judgeCriterionScores.createdAt))
  const scoresByAssignmentId = new Map<string, Array<typeof scoreRows[number]>>()

  for (const scoreRow of scoreRows) {
    const rows = scoresByAssignmentId.get(scoreRow.judgeAssignmentId) ?? []
    rows.push(scoreRow)
    scoresByAssignmentId.set(scoreRow.judgeAssignmentId, rows)
  }

  const entries = trackedSubmissions.map(({ team, submission }) => {
    const nonSkippedAssignments = (assignmentsBySubmissionId.get(submission.id) ?? [])
      .filter(assignment => assignment.status !== 'skipped')
    const blindAssignments = nonSkippedAssignments
      .filter(assignment => assignment.reviewStage === 'blind_review')
    const pitchAssignments = nonSkippedAssignments
      .filter(assignment => assignment.reviewStage === 'pitch_review')
    const activeBlindAssignment = blindAssignments.find(
      assignment => ['assigned', 'judge_started'].includes(assignment.status)
    ) ?? null
    const completedBlindAssignments = blindAssignments
      .filter(assignment => assignment.status === 'judge_completed')
    const activePitchAssignment = pitchAssignments.find(
      assignment => ['assigned', 'judge_started'].includes(assignment.status)
    ) ?? null
    const completedPitchAssignments = pitchAssignments
      .filter(assignment => assignment.status === 'judge_completed')

    const completedBlindAssignmentDetails = completedBlindAssignments.map((assignment) => {
      const criterionScores = mapCriterionScores(
        scoresByAssignmentId.get(assignment.id) ?? [],
        criteriaById
      )

      return {
        criterionScores,
        normalizedScore: normalizeBlindAssignmentScore(criterionScores)
      }
    })
    const aggregatedCriterionScores = criteria
      .map<LeaderboardCriterionScore | null>((criterion) => {
        const criterionScores = completedBlindAssignmentDetails
          .map(({ criterionScores }) =>
            criterionScores.find(scoreRow => scoreRow.evaluationCriterionId === criterion.id) ?? null
          )
          .filter((scoreRow): scoreRow is LeaderboardCriterionScore => scoreRow !== null)

        if (criterionScores.length === 0) {
          return null
        }

        return {
          evaluationCriterionId: criterion.id,
          criterionName: criterion.name,
          criterionWeight: criterion.weight,
          score: averageNumbers(criterionScores.map(scoreRow => scoreRow.score)) ?? 0,
          comment: criterionScores.find(scoreRow => scoreRow.comment)?.comment ?? null
        }
      })
      .filter((scoreRow): scoreRow is LeaderboardCriterionScore => scoreRow !== null)

    const blindScore = averageNumbers(
      completedBlindAssignmentDetails
        .map(detail => detail.normalizedScore)
        .filter((score): score is number => score !== null)
    )
    const pitchScore = calculateAveragePitchScore(completedPitchAssignments)
    const blindReviewComplete = event.blindReviewCount > 0
      && completedBlindAssignments.length >= event.blindReviewCount
    const blindReviewStatus = activeBlindAssignment?.status
      ?? (blindReviewComplete
        ? 'judge_completed'
        : completedBlindAssignments.length > 0
          ? 'judge_started'
          : null)
    const pitchReviewStatus = activePitchAssignment?.status
      ?? (completedPitchAssignments.length > 0 ? 'judge_completed' : null)
    const ineligibilityStatus = nonSkippedAssignments.some(
      assignment => assignment.ineligibilityStatus === 'ineligible'
    )
      ? 'ineligible'
      : nonSkippedAssignments[0]?.ineligibilityStatus ?? null
    const scoreTotal = calculateFinalScore(event, {
      blindScore,
      pitchScore
    })
    const isBlindRanked = submission.status === 'locked'
      && blindReviewStatus === 'judge_completed'
      && ineligibilityStatus === 'eligible'
      && blindScore !== null
    const isFinalRanked = submission.status === 'locked'
      && ineligibilityStatus === 'eligible'
      && scoreTotal !== null

    return {
      team,
      submission,
      blindReviewStatus,
      pitchReviewStatus,
      ineligibilityStatus,
      blindScore,
      pitchScore,
      scoreTotal,
      criterionScores: aggregatedCriterionScores,
      blindRank: null,
      finalScoreRank: null,
      isBlindRanked,
      isFinalRanked
    } satisfies CompetitionEntry
  })

  const entriesWithBlindRanks = assignRanks(entries, {
    isRanked: entry => entry.isBlindRanked,
    getScore: entry => entry.blindScore,
    setRank: (entry, rank) => ({
      ...entry,
      blindRank: rank
    })
  })
  const entriesWithFinalRanks = assignRanks(entriesWithBlindRanks, {
    isRanked: entry => entry.isFinalRanked,
    getScore: entry => entry.scoreTotal,
    setRank: (entry, rank) => ({
      ...entry,
      finalScoreRank: rank
    })
  })

  return {
    event,
    entries: entriesWithFinalRanks,
    totalTeamCount
  }
}

async function listBlindLeaderboardEntries(database: AppDatabase, eventId: string) {
  const { event, entries } = await loadCompetitionEntries(database, eventId)

  return {
    event,
    entries: toBlindLeaderboardEntries(entries)
  }
}

export async function listBlindRankingEntries(database: AppDatabase, eventId: string) {
  return (await listBlindLeaderboardEntries(database, eventId)).entries.map(serializeLeaderboardEntry)
}

export async function listLeaderboardEntries(database: AppDatabase, eventId: string) {
  const { event, entries } = await loadCompetitionEntries(database, eventId)

  if (!event) {
    return []
  }

  return shouldUseFinalScoreLeaderboard(event)
    ? toFinalLeaderboardEntries(entries, event)
    : toBlindLeaderboardEntries(entries)
}

export async function listShortlistEntries(database: AppDatabase, eventId: string) {
  return (await getShortlistView(database, eventId)).entries
}

export async function getShortlistView(database: AppDatabase, eventId: string) {
  const { event, entries } = await listBlindLeaderboardEntries(database, eventId)

  if (!event) {
    return {
      entries: [],
      hasSavedShortlistSelection: false
    }
  }

  const rankedEntries = entries.filter(entry => entry.isRanked)
  const orderedRankedEntries = deriveShortlistOrdering(event, rankedEntries)
  const savedShortlistSelection = hasSavedShortlistSelection(event)
  const orderedFinalistSubmissionIds = savedShortlistSelection
    ? parseStoredPitchFinalistSubmissionIds(event)
    : orderedRankedEntries
        .slice(0, event.shortlistFinalistCount)
        .map(entry => entry.submission.id)

  if (savedShortlistSelection) {
    assertStoredPitchFinalistsMatchEntries(
      orderedFinalistSubmissionIds,
      orderedRankedEntries,
      event.id
    )
  }

  const pitchFinalistRanksBySubmissionId = new Map(
    orderedFinalistSubmissionIds.map((submissionId, index) => [submissionId, index + 1] as const)
  )

  return {
    entries: orderedRankedEntries.map(entry =>
      serializeShortlistEntry(
        entry,
        pitchFinalistRanksBySubmissionId.get(entry.submission.id) ?? null
      )
    ),
    hasSavedShortlistSelection: savedShortlistSelection
  }
}

export async function getFinalDeliberationView(
  database: AppDatabase,
  eventId: string
) {
  const { event, entries } = await loadCompetitionEntries(database, eventId)

  if (!event) {
    return {
      entries: [],
      finalRankingSubmissionIds: []
    }
  }

  const {
    finalRankingSubmissionIds,
    orderedRankedEntries,
    finalRanksBySubmissionId,
    unrankedEntries
  } = deriveFinalDeliberationOrdering(event, entries)

  return {
    entries: [
      ...orderedRankedEntries.map(entry =>
        serializeFinalDeliberationEntry(
          entry,
          event,
          finalRanksBySubmissionId.get(entry.submission.id) ?? null
        )
      ),
      ...unrankedEntries.map(entry =>
        serializeFinalDeliberationEntry(entry, event, null)
      )
    ],
    finalRankingSubmissionIds
  }
}

export async function getWinnersView(database: AppDatabase, eventId: string) {
  return (await loadCompletedOutcomeCollections(database, eventId)).winners
}

export async function getPublishedProjectsView(database: AppDatabase, eventId: string) {
  return (await loadCompletedOutcomeCollections(database, eventId)).publishedProjects
}

export async function getTeamCompetitionOutcome(
  database: AppDatabase,
  eventId: string,
  teamId: string
): Promise<TeamCompetitionOutcome | null> {
  const [{ event, entries, totalTeamCount }, prizeList] = await Promise.all([
    loadCompetitionEntries(database, eventId),
    database.query.prizes.findMany({
      where: eq(prizes.eventId, eventId),
      orderBy: [asc(prizes.displayOrder), asc(prizes.rankEnd), desc(prizes.rankStart), asc(prizes.createdAt)]
    })
  ])

  if (!event) {
    return null
  }

  const teamEntry = entries.find(entry => entry.team.id === teamId)

  if (!teamEntry) {
    return null
  }

  const shortlistVisible = ['pitch', 'pitch_review', 'final_deliberation', 'winners_announced', 'completed']
    .includes(event.state)
  const winnersVisible = event.state === 'completed'
  const shortlistedSubmissionIds = shortlistVisible
    ? parseStoredPitchFinalistSubmissionIds(event)
    : []
  const { orderedRankedEntries, finalRanksBySubmissionId } = deriveFinalDeliberationOrdering(event, entries)
  const blindRankedTeamCount = entries.filter(entry => entry.isBlindRanked).length
  const finalRank = winnersVisible
    ? finalRanksBySubmissionId.get(teamEntry.submission.id) ?? null
    : null
  const awardedPrizes = finalRank === null || !winnersVisible
    ? []
    : prizeList
        .filter(prize => finalRank >= prize.rankStart && finalRank <= prize.rankEnd)
        .map(serializePrize)
  const rankSummary = !winnersVisible
    ? null
    : finalRank !== null
      ? {
          basis: 'final' as const,
          rank: finalRank,
          rankedTeamCount: orderedRankedEntries.length,
          totalTeamCount
        }
      : teamEntry.blindRank !== null
        ? {
            basis: 'blind_review' as const,
            rank: teamEntry.blindRank,
            rankedTeamCount: blindRankedTeamCount,
            totalTeamCount
          }
        : null

  return {
    isShortlisted: shortlistedSubmissionIds.includes(teamEntry.submission.id),
    isWinner: awardedPrizes.length > 0,
    finalRank,
    rankedTeamCount: winnersVisible ? orderedRankedEntries.length : 0,
    prizes: awardedPrizes,
    rankSummary
  }
}

function assertStoredPitchFinalistsMatchEntries(
  orderedSubmissionIds: string[],
  rankedEntries: LeaderboardBaseEntry[],
  eventId: string
) {
  const rankedSubmissionIds = new Set(rankedEntries.map(entry => entry.submission.id))

  assertGuard(new Set(orderedSubmissionIds).size === orderedSubmissionIds.length, {
    statusCode: 500,
    code: 'pitch_finalists_invalid',
    message: 'The stored pitch finalists are invalid.',
    details: { eventId }
  })

  assertGuard(
    orderedSubmissionIds.every(submissionId => rankedSubmissionIds.has(submissionId)),
    {
      statusCode: 500,
      code: 'pitch_finalists_invalid',
      message: 'The stored pitch finalists are invalid.',
      details: { eventId }
    }
  )
}

function deriveShortlistOrdering(
  event: EventRecord,
  rankedEntries: LeaderboardBaseEntry[]
) {
  const storedRankingSubmissionIds = parseStoredFinalRankingSubmissionIds(event)

  if (storedRankingSubmissionIds.length === 0) {
    return rankedEntries
  }

  assertStoredShortlistRankingMatchesEntries(
    storedRankingSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id })),
    event.id
  )

  const rankedEntriesBySubmissionId = new Map(
    rankedEntries.map(entry => [entry.submission.id, entry] as const)
  )

  return storedRankingSubmissionIds.map(submissionId => rankedEntriesBySubmissionId.get(submissionId)!)
}

function deriveFinalDeliberationOrdering(
  event: EventRecord,
  entries: CompetitionEntry[]
) {
  const rankedEntries = entries.filter(entry => entry.isFinalRanked)
  const finalRankingSubmissionIds = parseStoredFinalRankingSubmissionIds(event)

  assertStoredFinalRankingMatchesEntries(
    finalRankingSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id })),
    entries.map(entry => ({ submissionId: entry.submission.id })),
    event.id
  )

  const rankedEntriesBySubmissionId = new Map(
    rankedEntries.map(entry => [entry.submission.id, entry] as const)
  )
  const filteredFinalRankingSubmissionIds = finalRankingSubmissionIds.length > 0
    ? finalRankingSubmissionIds.filter(submissionId => rankedEntriesBySubmissionId.has(submissionId))
    : []
  const orderedRankedEntries = filteredFinalRankingSubmissionIds.length > 0
    ? filteredFinalRankingSubmissionIds.map(submissionId => rankedEntriesBySubmissionId.get(submissionId)!)
    : rankedEntries
  const finalRanksBySubmissionId = new Map(
    orderedRankedEntries.map((entry, index) => [entry.submission.id, index + 1] as const)
  )
  const unrankedEntries = entries
    .filter(entry => !entry.isFinalRanked)
    .sort((left, right) => left.team.name.localeCompare(right.team.name))

  return {
    finalRankingSubmissionIds: filteredFinalRankingSubmissionIds,
    orderedRankedEntries,
    finalRanksBySubmissionId,
    unrankedEntries
  }
}

function assertStoredShortlistRankingMatchesEntries(
  orderedSubmissionIds: string[],
  rankedEntries: Array<{ submissionId: string }>,
  eventId: string
) {
  if (orderedSubmissionIds.length === 0) {
    return
  }

  const rankedSubmissionIds = rankedEntries.map(entry => entry.submissionId)
  const expectedIds = new Set(rankedSubmissionIds)
  const actualIds = new Set(orderedSubmissionIds)

  assertGuard(actualIds.size === orderedSubmissionIds.length, {
    statusCode: 500,
    code: 'final_ranking_invalid',
    message: 'The stored ranking order is invalid.',
    details: {
      eventId,
      rankedSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(expectedIds.size === actualIds.size, {
    statusCode: 500,
    code: 'final_ranking_invalid',
    message: 'The stored ranking order is invalid.',
    details: {
      eventId,
      rankedSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(
    orderedSubmissionIds.every(submissionId => expectedIds.has(submissionId)),
    {
      statusCode: 500,
      code: 'final_ranking_invalid',
      message: 'The stored ranking order is invalid.',
      details: {
        eventId,
        rankedSubmissionIds,
        orderedSubmissionIds
      }
    }
  )
}

function assertStoredFinalRankingMatchesEntries(
  orderedSubmissionIds: string[],
  rankedEntries: Array<{ submissionId: string }>,
  allEntries: Array<{ submissionId: string }>,
  eventId: string
) {
  if (orderedSubmissionIds.length === 0) {
    return
  }

  const rankedSubmissionIds = rankedEntries.map(entry => entry.submissionId)
  const knownSubmissionIds = new Set(allEntries.map(entry => entry.submissionId))
  const actualIds = new Set(orderedSubmissionIds)

  assertGuard(actualIds.size === orderedSubmissionIds.length, {
    statusCode: 500,
    code: 'final_ranking_invalid',
    message: 'The stored ranking order is invalid.',
    details: {
      eventId,
      rankedSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(
    orderedSubmissionIds.every(submissionId => knownSubmissionIds.has(submissionId)),
    {
      statusCode: 500,
      code: 'final_ranking_invalid',
      message: 'The stored ranking order is invalid.',
      details: {
        eventId,
        rankedSubmissionIds,
        orderedSubmissionIds
      }
    }
  )

  assertGuard(
    rankedSubmissionIds.every(submissionId => actualIds.has(submissionId)),
    {
      statusCode: 500,
      code: 'final_ranking_invalid',
      message: 'The stored ranking order is invalid.',
      details: {
        eventId,
        rankedSubmissionIds,
        orderedSubmissionIds
      }
    }
  )
}

export function assertStartShortlistAllowed(
  event: EventRecord,
  entries: LeaderboardBaseEntry[]
) {
  assertCompetitionEvent(event)

  assertGuard(event.blindReviewCount > 0, {
    code: 'blind_review_not_enabled',
    message: 'Shortlist can only start when blind review is enabled.',
    details: { eventId: event.id }
  })

  assertGuard(event.pitchReviewEnabled, {
    code: 'pitch_review_not_enabled',
    message: 'Shortlist can only start when pitch review is enabled.',
    details: { eventId: event.id }
  })

  assertAllowedState(event.state, ['blind_review'], {
    code: 'event_state_invalid',
    message: 'Shortlist can only start while the event is in blind_review.',
    details: { eventId: event.id }
  })

  const lockedEntries = entries.filter(entry => entry.submission.status === 'locked')

  assertGuard(lockedEntries.length > 0, {
    code: 'locked_submissions_required',
    message: 'Shortlist requires at least one locked submission.',
    details: { eventId: event.id }
  })

  assertGuard(
    lockedEntries.every(entry => entry.reviewStatus === 'judge_completed'),
    {
      code: 'completed_reviews_required',
      message: 'Shortlist requires every active locked submission to have a completed review outcome.',
      details: { eventId: event.id }
    }
  )
}

export function assertStartFinalDeliberationAllowed(
  event: EventRecord,
  entries: LeaderboardBaseEntry[],
  options?: {
    completedPitchReviewCount?: number
  }
) {
  assertCompetitionEvent(event)

  if (event.state === 'blind_review') {
    assertGuard(!event.pitchReviewEnabled, {
      code: 'pitch_review_enabled',
      message: 'Final deliberation can only start from blind_review when pitch review is disabled.',
      details: { eventId: event.id }
    })

    const lockedEntries = entries.filter(entry => entry.submission.status === 'locked')

    assertGuard(lockedEntries.length > 0, {
      code: 'locked_submissions_required',
      message: 'Final deliberation requires at least one locked submission.',
      details: { eventId: event.id }
    })

    assertGuard(
      lockedEntries.every(entry => entry.reviewStatus === 'judge_completed'),
      {
        code: 'completed_reviews_required',
        message: 'Final deliberation requires every active locked submission to have a completed review outcome.',
        details: { eventId: event.id }
      }
    )

    return
  }

  if (event.state === 'pitch_review') {
    assertGuard(event.pitchReviewEnabled, {
      code: 'pitch_review_not_enabled',
      message: 'Final deliberation can only start from pitch_review when pitch review is enabled.',
      details: { eventId: event.id }
    })

    assertGuard((options?.completedPitchReviewCount ?? 0) > 0, {
      code: 'completed_pitch_reviews_required',
      message: 'Final deliberation requires at least one submitted pitch review.',
      details: { eventId: event.id }
    })

    return
  }

  assertAllowedState(event.state, ['blind_review', 'pitch_review'], {
    code: 'event_state_invalid',
    message: 'Final deliberation can only start from blind_review or pitch_review.',
    details: { eventId: event.id }
  })
}

export function assertShortlistViewAllowed(event: EventRecord) {
  assertCompetitionEvent(event)

  assertAllowedState(event.state, ['shortlist'], {
    code: 'event_state_invalid',
    message: 'Shortlist data is only available while the event is in shortlist.',
    details: { eventId: event.id }
  })
}

export function assertFinalDeliberationViewAllowed(event: EventRecord) {
  assertCompetitionEvent(event)

  assertAllowedState(event.state, ['final_deliberation'], {
    code: 'event_state_invalid',
    message: 'Final deliberation data is only available while the event is in final_deliberation.',
    details: { eventId: event.id }
  })
}

export function assertSelectFinalistsAllowed(event: EventRecord) {
  assertCompetitionEvent(event)

  assertAllowedState(event.state, ['shortlist'], {
    code: 'event_state_invalid',
    message: 'Pitch finalists can only be selected while the event is in shortlist.',
    details: { eventId: event.id }
  })
}

export function assertFinalDeliberationReorderAllowed(event: EventRecord) {
  assertCompetitionEvent(event)

  assertAllowedState(event.state, ['final_deliberation'], {
    code: 'event_state_invalid',
    message: 'Final ranking can only be reordered while the event is in final_deliberation.',
    details: { eventId: event.id }
  })
}

export function assertWinnersAnnouncementAllowed(event: EventRecord) {
  assertCompetitionEvent(event)

  assertAllowedState(event.state, ['final_deliberation'], {
    code: 'event_state_invalid',
    message: 'Winners can only be announced from final_deliberation.',
    details: { eventId: event.id }
  })
}

export function assertWinnersVisible(event: EventRecord) {
  assertCompletedOutcomeVisible(event)
}

export function assertCompletedOutcomeVisible(event: EventRecord) {
  assertCompetitionEvent(event)

  assertAllowedState(event.state, ['completed'], {
    code: 'event_state_invalid',
    message: 'Completed event project showcases are only visible after the event is completed.',
    details: { eventId: event.id }
  })
}

export function assertEventCompletionAllowed(event: EventRecord) {
  assertCompetitionEvent(event)

  assertAllowedState(event.state, ['winners_announced'], {
    code: 'event_state_invalid',
    message: 'Events can only be completed after winners are announced.',
    details: { eventId: event.id }
  })
}

export function assertSelectedFinalistsMatchEntries(
  orderedSubmissionIds: string[],
  rankedEntries: Array<{ submissionId: string }>
) {
  const rankedSubmissionIds = rankedEntries.map(entry => entry.submissionId)
  const expectedIds = new Set(rankedSubmissionIds)
  const actualIds = new Set(orderedSubmissionIds)

  assertGuard(actualIds.size === orderedSubmissionIds.length, {
    statusCode: 400,
    code: 'shortlist_finalists_invalid',
    message: 'Finalist selection must not contain duplicate submissions.',
    details: {
      rankedSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(
    orderedSubmissionIds.every(submissionId => expectedIds.has(submissionId)),
    {
      statusCode: 400,
      code: 'shortlist_finalists_invalid',
      message: 'Finalist selection must reference only ranked shortlist submissions.',
      details: {
        rankedSubmissionIds,
        orderedSubmissionIds
      }
    }
  )
}

export function assertSelectedShortlistOrderMatchesEntries(
  orderedSubmissionIds: string[],
  rankedEntries: Array<{ submissionId: string }>
) {
  const rankedSubmissionIds = rankedEntries.map(entry => entry.submissionId)
  const expectedIds = new Set(rankedSubmissionIds)
  const actualIds = new Set(orderedSubmissionIds)

  assertGuard(actualIds.size === orderedSubmissionIds.length, {
    statusCode: 400,
    code: 'shortlist_order_invalid',
    message: 'Shortlist order must not contain duplicate submissions.',
    details: {
      rankedSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(expectedIds.size === actualIds.size, {
    statusCode: 400,
    code: 'shortlist_order_invalid',
    message: 'Shortlist order must include every ranked shortlist submission exactly once.',
    details: {
      rankedSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(
    orderedSubmissionIds.every(submissionId => expectedIds.has(submissionId)),
    {
      statusCode: 400,
      code: 'shortlist_order_invalid',
      message: 'Shortlist order must reference only ranked shortlist submissions.',
      details: {
        rankedSubmissionIds,
        orderedSubmissionIds
      }
    }
  )
}

export function assertSelectedFinalistsRespectOrder(
  finalistSubmissionIds: string[],
  orderedSubmissionIds: string[]
) {
  assertGuard(
    finalistSubmissionIds.every((submissionId, index) => orderedSubmissionIds[index] === submissionId),
    {
      statusCode: 400,
      code: 'shortlist_finalists_invalid',
      message: 'Finalists must appear first in the saved shortlist order.',
      details: {
        finalistSubmissionIds,
        orderedSubmissionIds
      }
    }
  )
}

export function assertFinalDeliberationReorderMatchesEntries(
  orderedSubmissionIds: string[],
  rankedEntries: Array<{ submissionId: string }>
) {
  const rankedSubmissionIds = rankedEntries.map(entry => entry.submissionId)
  const expectedIds = new Set(rankedSubmissionIds)
  const actualIds = new Set(orderedSubmissionIds)

  assertGuard(actualIds.size === orderedSubmissionIds.length, {
    statusCode: 400,
    code: 'final_ranking_invalid',
    message: 'Final ranking reorder must not contain duplicate submissions.',
    details: {
      rankedSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(expectedIds.size === actualIds.size, {
    statusCode: 400,
    code: 'final_ranking_invalid',
    message: 'Final ranking reorder must include every ranked submission exactly once.',
    details: {
      rankedSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(
    orderedSubmissionIds.every(submissionId => expectedIds.has(submissionId)),
    {
      statusCode: 400,
      code: 'final_ranking_invalid',
      message: 'Final ranking reorder must reference only ranked submissions.',
      details: {
        rankedSubmissionIds,
        orderedSubmissionIds
      }
    }
  )
}
