import { asc, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import type { AppDatabase } from '../database/client'
import {
  evaluationCriteria,
  hackathons,
  judgeAssignments,
  judgeCriterionScores,
  prizes,
  submissions,
  teams
} from '../database/schema'
import { ApiError } from './api-error'
import { serializePrize } from './hackathon-management'
import {
  calculateAveragePitchScore,
  parseStoredPitchFinalistSubmissionIds
} from './judging'
import { assertAllowedState, assertGuard } from './lifecycle-guard'

type HackathonRecord = typeof hackathons.$inferSelect
type TeamRecord = typeof teams.$inferSelect
type SubmissionRecord = typeof submissions.$inferSelect
type JudgeAssignmentRecord = typeof judgeAssignments.$inferSelect
type JudgeCriterionScoreRecord = typeof judgeCriterionScores.$inferSelect
type PrizeRecord = typeof prizes.$inferSelect
type SerializedPrizeSummary = ReturnType<typeof serializePrize>

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

function parseStoredFinalRankingSubmissionIds(hackathon: HackathonRecord) {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(hackathon.finalRankingSubmissionIdsJson)
  } catch {
    throw new ApiError({
      statusCode: 500,
      code: 'final_ranking_invalid',
      message: 'The stored ranking order is invalid.',
      details: {
        hackathonId: hackathon.id
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
        hackathonId: hackathon.id
      }
    })
  }

  return result.data
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
  hackathon: Pick<
    HackathonRecord,
    'blindReviewCount' | 'pitchReviewEnabled' | 'blindScoreWeightPercent' | 'pitchScoreWeightPercent'
  >,
  scores: {
    blindScore: number | null
    pitchScore: number | null
  }
) {
  if (hackathon.blindReviewCount > 0 && !hackathon.pitchReviewEnabled) {
    return scores.blindScore
  }

  if (hackathon.blindReviewCount === 0 && hackathon.pitchReviewEnabled) {
    return scores.pitchScore
  }

  if (!hackathon.pitchReviewEnabled) {
    return null
  }

  if (scores.blindScore === null || scores.pitchScore === null) {
    return null
  }

  return (scores.blindScore * hackathon.blindScoreWeightPercent / 100)
    + (scores.pitchScore * hackathon.pitchScoreWeightPercent / 100)
}

function shouldUseFinalScoreLeaderboard(hackathon: HackathonRecord) {
  return hackathon.pitchReviewEnabled && [
    'pitch_review',
    'final_deliberation',
    'winners_announced',
    'completed'
  ].includes(hackathon.state)
}

function toBlindLeaderboardEntries(entries: CompetitionEntry[]): LeaderboardBaseEntry[] {
  return entries.map(entry => ({
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
  hackathon: HackathonRecord
): LeaderboardBaseEntry[] {
  return entries.map(entry => ({
    team: entry.team,
    submission: entry.submission,
    reviewStatus: hackathon.pitchReviewEnabled
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
  hackathon: HackathonRecord,
  finalRank: number | null
) {
  return {
    teamId: entry.team.id,
    teamName: entry.team.name,
    submissionId: entry.submission.id,
    projectName: entry.submission.projectName,
    submissionStatus: entry.submission.status,
    reviewStatus: hackathon.pitchReviewEnabled
      ? entry.pitchReviewStatus
      : entry.blindReviewStatus,
    ineligibilityStatus: entry.ineligibilityStatus,
    scoreTotal: entry.scoreTotal,
    scoreRank: entry.finalScoreRank,
    finalRank,
    ...(hackathon.blindReviewCount > 0
      ? { blindScore: entry.blindScore }
      : {}),
    ...(hackathon.pitchReviewEnabled
      ? { pitchScore: entry.pitchScore }
      : {})
  }
}

function serializeWinnerEntry(
  entry: CompetitionEntry,
  hackathon: HackathonRecord,
  finalRank: number
) {
  return {
    teamId: entry.team.id,
    teamName: entry.team.name,
    submissionId: entry.submission.id,
    projectName: entry.submission.projectName,
    submissionStatus: entry.submission.status,
    reviewStatus: hackathon.pitchReviewEnabled
      ? entry.pitchReviewStatus
      : entry.blindReviewStatus,
    ineligibilityStatus: entry.ineligibilityStatus,
    scoreTotal: entry.scoreTotal,
    rank: finalRank,
    criterionScores: entry.criterionScores,
    finalRank
  }
}

async function loadCompetitionEntries(
  database: AppDatabase,
  hackathonId: string
): Promise<{
  hackathon: HackathonRecord | null
  entries: CompetitionEntry[]
}> {
  const hackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  if (!hackathon) {
    return {
      hackathon: null,
      entries: []
    }
  }

  const hackathonTeams = await database.query.teams.findMany({
    where: eq(teams.hackathonId, hackathonId),
    orderBy: [asc(teams.createdAt), asc(teams.name)]
  })

  if (hackathonTeams.length === 0) {
    return {
      hackathon,
      entries: []
    }
  }

  const teamIds = hackathonTeams.map(team => team.id)
  const submissionsForHackathon = await database.query.submissions.findMany({
    where: inArray(submissions.teamId, teamIds),
    orderBy: [desc(submissions.createdAt)]
  })
  const latestSubmissionByTeamId = new Map<string, SubmissionRecord>()

  for (const submission of submissionsForHackathon) {
    if (!latestSubmissionByTeamId.has(submission.teamId)) {
      latestSubmissionByTeamId.set(submission.teamId, submission)
    }
  }

  const trackedSubmissions = hackathonTeams
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
      hackathon,
      entries: []
    }
  }

  const assignmentRows = await database.query.judgeAssignments.findMany({
    where: inArray(
      judgeAssignments.submissionId,
      trackedSubmissions.map(entry => entry.submission.id)
    ),
    orderBy: [desc(judgeAssignments.createdAt)]
  })
  const assignmentsBySubmissionId = new Map<string, JudgeAssignmentRecord[]>()

  for (const assignment of assignmentRows) {
    const assignments = assignmentsBySubmissionId.get(assignment.submissionId) ?? []
    assignments.push(assignment)
    assignmentsBySubmissionId.set(assignment.submissionId, assignments)
  }

  const criteria = await database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.hackathonId, hackathonId),
    orderBy: [asc(evaluationCriteria.displayOrder), asc(evaluationCriteria.createdAt)]
  })
  const criteriaById = new Map(criteria.map(criterion => [criterion.id, criterion]))
  const assignmentIds = assignmentRows.map(assignment => assignment.id)
  const scoreRows = assignmentIds.length === 0
    ? []
    : await database.query.judgeCriterionScores.findMany({
        where: inArray(judgeCriterionScores.judgeAssignmentId, assignmentIds),
        orderBy: [asc(judgeCriterionScores.createdAt)]
      })
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
    const blindReviewComplete = hackathon.blindReviewCount > 0
      && completedBlindAssignments.length >= hackathon.blindReviewCount
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
    const scoreTotal = calculateFinalScore(hackathon, {
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
    hackathon,
    entries: entriesWithFinalRanks
  }
}

async function listBlindLeaderboardEntries(database: AppDatabase, hackathonId: string) {
  const { hackathon, entries } = await loadCompetitionEntries(database, hackathonId)

  return {
    hackathon,
    entries: toBlindLeaderboardEntries(entries)
  }
}

export async function listLeaderboardEntries(database: AppDatabase, hackathonId: string) {
  const { hackathon, entries } = await loadCompetitionEntries(database, hackathonId)

  if (!hackathon) {
    return []
  }

  return shouldUseFinalScoreLeaderboard(hackathon)
    ? toFinalLeaderboardEntries(entries, hackathon)
    : toBlindLeaderboardEntries(entries)
}

export async function listShortlistEntries(database: AppDatabase, hackathonId: string) {
  const { hackathon, entries } = await listBlindLeaderboardEntries(database, hackathonId)

  if (!hackathon) {
    return []
  }

  const rankedEntries = entries.filter(entry => entry.isRanked)
  const orderedRankedEntries = deriveShortlistOrdering(hackathon, rankedEntries)
  const orderedFinalistSubmissionIds = parseStoredPitchFinalistSubmissionIds(hackathon)

  assertStoredPitchFinalistsMatchEntries(
    orderedFinalistSubmissionIds,
    orderedRankedEntries,
    hackathon.id
  )

  const pitchFinalistRanksBySubmissionId = new Map(
    orderedFinalistSubmissionIds.map((submissionId, index) => [submissionId, index + 1] as const)
  )

  return orderedRankedEntries.map(entry =>
    serializeShortlistEntry(
      entry,
      pitchFinalistRanksBySubmissionId.get(entry.submission.id) ?? null
    )
  )
}

export async function getFinalDeliberationView(
  database: AppDatabase,
  hackathonId: string
) {
  const { hackathon, entries } = await loadCompetitionEntries(database, hackathonId)

  if (!hackathon) {
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
  } = deriveFinalDeliberationOrdering(hackathon, entries)

  return {
    entries: [
      ...orderedRankedEntries.map(entry =>
        serializeFinalDeliberationEntry(
          entry,
          hackathon,
          finalRanksBySubmissionId.get(entry.submission.id) ?? null
        )
      ),
      ...unrankedEntries.map(entry =>
        serializeFinalDeliberationEntry(entry, hackathon, null)
      )
    ],
    finalRankingSubmissionIds
  }
}

export async function getWinnersView(database: AppDatabase, hackathonId: string) {
  const [{ hackathon, entries }, prizeList] = await Promise.all([
    loadCompetitionEntries(database, hackathonId),
    database.query.prizes.findMany({
      where: eq(prizes.hackathonId, hackathonId),
      orderBy: [asc(prizes.displayOrder), asc(prizes.rankEnd), desc(prizes.rankStart), asc(prizes.createdAt)]
    })
  ])

  if (!hackathon) {
    return []
  }

  const { orderedRankedEntries, finalRanksBySubmissionId } = deriveFinalDeliberationOrdering(hackathon, entries)
  const winnerEntries = orderedRankedEntries.map(entry =>
    serializeWinnerEntry(
      entry,
      hackathon,
      finalRanksBySubmissionId.get(entry.submission.id)!
    )
  )

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

  return winnerEntries
    .filter(entry => (awardsBySubmissionId.get(entry.submissionId) ?? []).length > 0)
    .map(entry => ({
      ...entry,
      prizes: (awardsBySubmissionId.get(entry.submissionId) ?? []).map(serializePrize)
    }))
}

export async function getTeamCompetitionOutcome(
  database: AppDatabase,
  hackathonId: string,
  teamId: string
): Promise<TeamCompetitionOutcome | null> {
  const [{ hackathon, entries }, prizeList] = await Promise.all([
    loadCompetitionEntries(database, hackathonId),
    database.query.prizes.findMany({
      where: eq(prizes.hackathonId, hackathonId),
      orderBy: [asc(prizes.displayOrder), asc(prizes.rankEnd), desc(prizes.rankStart), asc(prizes.createdAt)]
    })
  ])

  if (!hackathon) {
    return null
  }

  const teamEntry = entries.find(entry => entry.team.id === teamId)

  if (!teamEntry) {
    return null
  }

  const shortlistVisible = ['pitch', 'pitch_review', 'final_deliberation', 'winners_announced', 'completed']
    .includes(hackathon.state)
  const winnersVisible = ['winners_announced', 'completed'].includes(hackathon.state)
  const shortlistedSubmissionIds = shortlistVisible
    ? parseStoredPitchFinalistSubmissionIds(hackathon)
    : []
  const { orderedRankedEntries, finalRanksBySubmissionId } = deriveFinalDeliberationOrdering(hackathon, entries)
  const finalRank = winnersVisible
    ? finalRanksBySubmissionId.get(teamEntry.submission.id) ?? null
    : null
  const awardedPrizes = finalRank === null || !winnersVisible
    ? []
    : prizeList
        .filter(prize => finalRank >= prize.rankStart && finalRank <= prize.rankEnd)
        .map(serializePrize)

  return {
    isShortlisted: shortlistedSubmissionIds.includes(teamEntry.submission.id),
    isWinner: awardedPrizes.length > 0,
    finalRank,
    rankedTeamCount: winnersVisible ? orderedRankedEntries.length : 0,
    prizes: awardedPrizes
  }
}

function assertStoredPitchFinalistsMatchEntries(
  orderedSubmissionIds: string[],
  rankedEntries: LeaderboardBaseEntry[],
  hackathonId: string
) {
  const rankedSubmissionIds = new Set(rankedEntries.map(entry => entry.submission.id))

  assertGuard(new Set(orderedSubmissionIds).size === orderedSubmissionIds.length, {
    statusCode: 500,
    code: 'pitch_finalists_invalid',
    message: 'The stored pitch finalists are invalid.',
    details: { hackathonId }
  })

  assertGuard(
    orderedSubmissionIds.every(submissionId => rankedSubmissionIds.has(submissionId)),
    {
      statusCode: 500,
      code: 'pitch_finalists_invalid',
      message: 'The stored pitch finalists are invalid.',
      details: { hackathonId }
    }
  )
}

function deriveShortlistOrdering(
  hackathon: HackathonRecord,
  rankedEntries: LeaderboardBaseEntry[]
) {
  const storedRankingSubmissionIds = parseStoredFinalRankingSubmissionIds(hackathon)

  if (storedRankingSubmissionIds.length === 0) {
    return rankedEntries
  }

  assertStoredShortlistRankingMatchesEntries(
    storedRankingSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id })),
    hackathon.id
  )

  const rankedEntriesBySubmissionId = new Map(
    rankedEntries.map(entry => [entry.submission.id, entry] as const)
  )

  return storedRankingSubmissionIds.map(submissionId => rankedEntriesBySubmissionId.get(submissionId)!)
}

function deriveFinalDeliberationOrdering(
  hackathon: HackathonRecord,
  entries: CompetitionEntry[]
) {
  const rankedEntries = entries.filter(entry => entry.isFinalRanked)
  const finalRankingSubmissionIds = parseStoredFinalRankingSubmissionIds(hackathon)

  assertStoredFinalRankingMatchesEntries(
    finalRankingSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id })),
    entries.map(entry => ({ submissionId: entry.submission.id })),
    hackathon.id
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
  hackathonId: string
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
      hackathonId,
      rankedSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(expectedIds.size === actualIds.size, {
    statusCode: 500,
    code: 'final_ranking_invalid',
    message: 'The stored ranking order is invalid.',
    details: {
      hackathonId,
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
        hackathonId,
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
  hackathonId: string
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
      hackathonId,
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
        hackathonId,
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
        hackathonId,
        rankedSubmissionIds,
        orderedSubmissionIds
      }
    }
  )
}

export function assertStartShortlistAllowed(
  hackathon: HackathonRecord,
  entries: LeaderboardBaseEntry[]
) {
  assertGuard(hackathon.blindReviewCount > 0, {
    code: 'blind_review_not_enabled',
    message: 'Shortlist can only start when blind review is enabled.',
    details: { hackathonId: hackathon.id }
  })

  assertGuard(hackathon.pitchReviewEnabled, {
    code: 'pitch_review_not_enabled',
    message: 'Shortlist can only start when pitch review is enabled.',
    details: { hackathonId: hackathon.id }
  })

  assertAllowedState(hackathon.state, ['blind_review'], {
    code: 'hackathon_state_invalid',
    message: 'Shortlist can only start while the hackathon is in blind_review.',
    details: { hackathonId: hackathon.id }
  })

  const lockedEntries = entries.filter(entry => entry.submission.status === 'locked')

  assertGuard(lockedEntries.length > 0, {
    code: 'locked_submissions_required',
    message: 'Shortlist requires at least one locked submission.',
    details: { hackathonId: hackathon.id }
  })

  assertGuard(
    lockedEntries.every(entry => entry.reviewStatus === 'judge_completed'),
    {
      code: 'completed_reviews_required',
      message: 'Shortlist requires every active locked submission to have a completed review outcome.',
      details: { hackathonId: hackathon.id }
    }
  )
}

export function assertStartFinalDeliberationAllowed(
  hackathon: HackathonRecord,
  entries: LeaderboardBaseEntry[]
) {
  if (hackathon.state === 'blind_review') {
    assertGuard(!hackathon.pitchReviewEnabled, {
      code: 'pitch_review_enabled',
      message: 'Final deliberation can only start from blind_review when pitch review is disabled.',
      details: { hackathonId: hackathon.id }
    })

    const lockedEntries = entries.filter(entry => entry.submission.status === 'locked')

    assertGuard(lockedEntries.length > 0, {
      code: 'locked_submissions_required',
      message: 'Final deliberation requires at least one locked submission.',
      details: { hackathonId: hackathon.id }
    })

    assertGuard(
      lockedEntries.every(entry => entry.reviewStatus === 'judge_completed'),
      {
        code: 'completed_reviews_required',
        message: 'Final deliberation requires every active locked submission to have a completed review outcome.',
        details: { hackathonId: hackathon.id }
      }
    )

    return
  }

  if (hackathon.state === 'pitch_review') {
    assertGuard(hackathon.pitchReviewEnabled, {
      code: 'pitch_review_not_enabled',
      message: 'Final deliberation can only start from pitch_review when pitch review is enabled.',
      details: { hackathonId: hackathon.id }
    })

    return
  }

  assertAllowedState(hackathon.state, ['blind_review', 'pitch_review'], {
    code: 'hackathon_state_invalid',
    message: 'Final deliberation can only start from blind_review or pitch_review.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertShortlistViewAllowed(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['shortlist'], {
    code: 'hackathon_state_invalid',
    message: 'Shortlist data is only available while the hackathon is in shortlist.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertFinalDeliberationViewAllowed(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['final_deliberation'], {
    code: 'hackathon_state_invalid',
    message: 'Final deliberation data is only available while the hackathon is in final_deliberation.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertSelectFinalistsAllowed(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['shortlist'], {
    code: 'hackathon_state_invalid',
    message: 'Pitch finalists can only be selected while the hackathon is in shortlist.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertFinalDeliberationReorderAllowed(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['final_deliberation'], {
    code: 'hackathon_state_invalid',
    message: 'Final ranking can only be reordered while the hackathon is in final_deliberation.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertWinnersAnnouncementAllowed(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['final_deliberation'], {
    code: 'hackathon_state_invalid',
    message: 'Winners can only be announced from final_deliberation.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertWinnersVisible(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['winners_announced', 'completed'], {
    code: 'hackathon_state_invalid',
    message: 'Winners are only visible after announcement.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertHackathonCompletionAllowed(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['winners_announced'], {
    code: 'hackathon_state_invalid',
    message: 'Hackathons can only be completed after winners are announced.',
    details: { hackathonId: hackathon.id }
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
