import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import type { AppDatabase } from '../database/client'
import {
  auditLogs,
  evaluationCriteria,
  judgeAssignments,
  judgeCriterionScores,
  prizes,
  submissions,
  teams,
  type hackathons
} from '../database/schema'
import { serializePrize } from './hackathon-management'
import { ApiError } from './api-error'
import { assertAllowedState, assertGuard } from './lifecycle-guard'

type HackathonRecord = typeof hackathons.$inferSelect
type TeamRecord = typeof teams.$inferSelect
type SubmissionRecord = typeof submissions.$inferSelect
type JudgeAssignmentRecord = typeof judgeAssignments.$inferSelect
type PrizeRecord = typeof prizes.$inferSelect

type LeaderboardBaseEntry = {
  team: TeamRecord
  submission: SubmissionRecord
  assignment: JudgeAssignmentRecord | null
  weightedScore: number | null
  criterionScores: Array<{
    evaluationCriterionId: string
    criterionName: string | null
    criterionWeight: number | null
    score: number
    comment: string | null
  }>
  baseRank: number | null
  isRanked: boolean
}

type ShortlistOrderMetadata = {
  orderedSubmissionIds?: unknown
}

export const reorderShortlistBodySchema = z.object({
  orderedSubmissionIds: z.array(z.string().trim().min(1)).min(1)
})

export function serializeLeaderboardEntry(entry: LeaderboardBaseEntry) {
  return {
    teamId: entry.team.id,
    teamName: entry.team.name,
    submissionId: entry.submission.id,
    projectName: entry.submission.projectName,
    submissionStatus: entry.submission.status,
    reviewStatus: entry.assignment?.status ?? null,
    ineligibilityStatus: entry.assignment?.ineligibilityStatus ?? null,
    scoreTotal: entry.weightedScore,
    rank: entry.baseRank,
    criterionScores: entry.criterionScores
  }
}

export function serializeShortlistEntry(
  entry: LeaderboardBaseEntry,
  finalRank: number
) {
  return {
    ...serializeLeaderboardEntry(entry),
    finalRank
  }
}

export async function listLeaderboardEntries(database: AppDatabase, hackathonId: string) {
  const hackathonTeams = await database.query.teams.findMany({
    where: eq(teams.hackathonId, hackathonId),
    orderBy: [asc(teams.createdAt), asc(teams.name)]
  })

  if (hackathonTeams.length === 0) {
    return []
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
    return []
  }

  const assignmentRows = await database.query.judgeAssignments.findMany({
    where: inArray(
      judgeAssignments.submissionId,
      trackedSubmissions.map(entry => entry.submission.id)
    ),
    orderBy: [desc(judgeAssignments.createdAt)]
  })
  const latestNonSkippedAssignmentBySubmissionId = new Map<string, JudgeAssignmentRecord>()

  for (const assignment of assignmentRows) {
    if (assignment.status === 'skipped') {
      continue
    }

    if (!latestNonSkippedAssignmentBySubmissionId.has(assignment.submissionId)) {
      latestNonSkippedAssignmentBySubmissionId.set(assignment.submissionId, assignment)
    }
  }

  const criteria = await database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.hackathonId, hackathonId),
    orderBy: [asc(evaluationCriteria.displayOrder), asc(evaluationCriteria.createdAt)]
  })
  const criteriaById = new Map(criteria.map(criterion => [criterion.id, criterion]))
  const assignmentIds = [...latestNonSkippedAssignmentBySubmissionId.values()].map(assignment => assignment.id)
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
    const assignment = latestNonSkippedAssignmentBySubmissionId.get(submission.id) ?? null
    const criterionScores = assignment
      ? (scoresByAssignmentId.get(assignment.id) ?? []).map(scoreRow => ({
          evaluationCriterionId: scoreRow.evaluationCriterionId,
          criterionName: criteriaById.get(scoreRow.evaluationCriterionId)?.name ?? null,
          criterionWeight: criteriaById.get(scoreRow.evaluationCriterionId)?.weight ?? null,
          score: scoreRow.score,
          comment: scoreRow.comment
        }))
      : []

    const weightedScore = assignment?.status === 'judge_completed'
      ? criterionScores.reduce((total, scoreRow) => total + (scoreRow.score * (scoreRow.criterionWeight ?? 0)), 0)
      : null
    const isRanked = submission.status === 'locked'
      && assignment?.status === 'judge_completed'
      && assignment.ineligibilityStatus === 'eligible'

    return {
      team,
      submission,
      assignment,
      weightedScore,
      criterionScores,
      baseRank: null,
      isRanked
    } satisfies LeaderboardBaseEntry
  })

  const rankedEntries = [...entries]
    .filter(entry => entry.isRanked)
    .sort((left, right) => {
      if ((right.weightedScore ?? -1) !== (left.weightedScore ?? -1)) {
        return (right.weightedScore ?? -1) - (left.weightedScore ?? -1)
      }

      if ((left.submission.submittedAt ?? left.submission.createdAt) !== (right.submission.submittedAt ?? right.submission.createdAt)) {
        return (left.submission.submittedAt ?? left.submission.createdAt).localeCompare(
          right.submission.submittedAt ?? right.submission.createdAt
        )
      }

      return left.team.id.localeCompare(right.team.id)
    })
    .map((entry, index) => ({
      ...entry,
      baseRank: index + 1
    }))

  const rankedBySubmissionId = new Map(rankedEntries.map(entry => [entry.submission.id, entry]))
  const unrankedEntries = entries
    .filter(entry => !entry.isRanked)
    .sort((left, right) => left.team.name.localeCompare(right.team.name))

  return [
    ...rankedEntries,
    ...unrankedEntries
  ].map(entry => rankedBySubmissionId.get(entry.submission.id) ?? entry)
}

export async function listShortlistEntries(database: AppDatabase, hackathonId: string) {
  const rankedEntries = (await listLeaderboardEntries(database, hackathonId))
    .filter(entry => entry.isRanked)

  const overrideSubmissionIds = await getLatestShortlistOrderOverride(database, hackathonId)

  if (!overrideSubmissionIds) {
    return rankedEntries.map((entry, index) => serializeShortlistEntry(entry, index + 1))
  }

  const orderBySubmissionId = new Map(overrideSubmissionIds.map((submissionId, index) => [submissionId, index]))

  return [...rankedEntries]
    .sort((left, right) => {
      const leftOrder = orderBySubmissionId.get(left.submission.id)
      const rightOrder = orderBySubmissionId.get(right.submission.id)

      if (leftOrder !== undefined && rightOrder !== undefined) {
        return leftOrder - rightOrder
      }

      if (leftOrder !== undefined) {
        return -1
      }

      if (rightOrder !== undefined) {
        return 1
      }

      return (left.baseRank ?? Number.MAX_SAFE_INTEGER) - (right.baseRank ?? Number.MAX_SAFE_INTEGER)
    })
    .map((entry, index) => serializeShortlistEntry(entry, index + 1))
}

export async function getWinnersView(database: AppDatabase, hackathonId: string) {
  const [shortlistEntries, prizeList] = await Promise.all([
    listShortlistEntries(database, hackathonId),
    database.query.prizes.findMany({
      where: eq(prizes.hackathonId, hackathonId),
      orderBy: [asc(prizes.rankStart), asc(prizes.rankEnd), asc(prizes.createdAt)]
    })
  ])

  const awardsBySubmissionId = new Map<string, Array<PrizeRecord>>()

  for (const prize of prizeList) {
    for (const shortlistEntry of shortlistEntries) {
      if (shortlistEntry.finalRank >= prize.rankStart && shortlistEntry.finalRank <= prize.rankEnd) {
        const awardedPrizes = awardsBySubmissionId.get(shortlistEntry.submissionId) ?? []
        awardedPrizes.push(prize)
        awardsBySubmissionId.set(shortlistEntry.submissionId, awardedPrizes)
      }
    }
  }

  return shortlistEntries
    .filter(entry => (awardsBySubmissionId.get(entry.submissionId) ?? []).length > 0)
    .map(entry => ({
      ...entry,
      prizes: (awardsBySubmissionId.get(entry.submissionId) ?? []).map(serializePrize)
    }))
}

export async function getLatestShortlistOrderOverride(database: AppDatabase, hackathonId: string) {
  const reorderAudit = await database.query.auditLogs.findFirst({
    where: and(
      eq(auditLogs.entityType, 'hackathon'),
      eq(auditLogs.entityId, hackathonId),
      eq(auditLogs.action, 'hackathon.shortlist_reordered')
    ),
    orderBy: [desc(auditLogs.createdAt)]
  })

  if (!reorderAudit) {
    return null
  }

  const orderedSubmissionIds = (reorderAudit.metadata as ShortlistOrderMetadata | null)?.orderedSubmissionIds

  if (!Array.isArray(orderedSubmissionIds) || !orderedSubmissionIds.every(value => typeof value === 'string')) {
    throw new ApiError({
      statusCode: 500,
      code: 'shortlist_order_invalid',
      message: 'The stored shortlist ordering is invalid.',
      details: { hackathonId }
    })
  }

  return orderedSubmissionIds
}

export function assertStartShortlistAllowed(
  hackathon: HackathonRecord,
  entries: LeaderboardBaseEntry[]
) {
  assertAllowedState(hackathon.state, ['judge_review'], {
    code: 'hackathon_state_invalid',
    message: 'Shortlist can only start while the hackathon is in judge_review.',
    details: { hackathonId: hackathon.id }
  })

  const lockedEntries = entries.filter(entry => entry.submission.status === 'locked')

  assertGuard(lockedEntries.length > 0, {
    code: 'locked_submissions_required',
    message: 'Shortlist requires at least one locked submission.',
    details: { hackathonId: hackathon.id }
  })

  assertGuard(
    lockedEntries.every(entry => entry.assignment?.status === 'judge_completed'),
    {
      code: 'completed_reviews_required',
      message: 'Shortlist requires every active locked submission to have a completed review outcome.',
      details: { hackathonId: hackathon.id }
    }
  )
}

export function assertShortlistViewAllowed(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['shortlist', 'winners_announced', 'completed'], {
    code: 'hackathon_state_invalid',
    message: 'Shortlist data is only available once the hackathon has entered shortlist mode.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertShortlistReorderAllowed(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['shortlist'], {
    code: 'hackathon_state_invalid',
    message: 'Shortlist ranking can only be reordered while the hackathon is in shortlist.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertWinnersAnnouncementAllowed(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['shortlist'], {
    code: 'hackathon_state_invalid',
    message: 'Winners can only be announced from shortlist.',
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

export function assertShortlistReorderMatchesEntries(
  orderedSubmissionIds: string[],
  shortlistEntries: Array<{ submissionId: string }>
) {
  const shortlistSubmissionIds = shortlistEntries.map(entry => entry.submissionId)
  const expectedIds = new Set(shortlistSubmissionIds)
  const actualIds = new Set(orderedSubmissionIds)

  assertGuard(expectedIds.size === actualIds.size, {
    statusCode: 400,
    code: 'shortlist_reorder_invalid',
    message: 'Shortlist reorder must include every ranked submission exactly once.',
    details: {
      expectedSubmissionIds: shortlistSubmissionIds,
      orderedSubmissionIds
    }
  })

  assertGuard(
    orderedSubmissionIds.every(submissionId => expectedIds.has(submissionId)),
    {
      statusCode: 400,
      code: 'shortlist_reorder_invalid',
      message: 'Shortlist reorder must reference only ranked submissions.',
      details: {
        expectedSubmissionIds: shortlistSubmissionIds,
        orderedSubmissionIds
      }
    }
  )
}
