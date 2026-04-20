import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import {
  listHackathonPrizeRedemptions,
  listOperationalPrizeRedemptionTeamMembersByTeamId
} from '../../../../utils/prize-redemptions'
import {
  getFinalDeliberationView,
  getWinnersView,
  listBlindRankingEntries
} from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const [winners, redemptions, finalDeliberation, blindRankingEntries] = await Promise.all([
    getWinnersView(database, hackathonId),
    listHackathonPrizeRedemptions(database, hackathonId),
    getFinalDeliberationView(database, hackathonId),
    listBlindRankingEntries(database, hackathonId)
  ])
  const teamIds = [...new Set([
    ...winners.map(entry => entry.teamId),
    ...finalDeliberation.entries
      .filter((entry): entry is typeof finalDeliberation.entries[number] & { finalRank: number } =>
        entry.finalRank !== null
      )
      .map(entry => entry.teamId),
    ...blindRankingEntries
      .filter((entry): entry is typeof blindRankingEntries[number] & { rank: number } =>
        entry.rank !== null
      )
      .map(entry => entry.teamId)
  ])]
  const teamMembersByTeamId = await listOperationalPrizeRedemptionTeamMembersByTeamId(database, teamIds)

  return apiData({
    winners: winners.map(entry => ({
      ...entry,
      teamMembers: teamMembersByTeamId.get(entry.teamId) ?? []
    })),
    redemptions,
    finalRankingEntries: finalDeliberation.entries
      .filter((entry): entry is typeof finalDeliberation.entries[number] & { finalRank: number } =>
        entry.finalRank !== null
      )
      .map(entry => ({
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
    blindRankingEntries: blindRankingEntries
      .filter((entry): entry is typeof blindRankingEntries[number] & { rank: number } =>
        entry.rank !== null
      )
      .map(entry => ({
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
  })
})
