import { assertCompetitionEvent, listEventTracks } from '#server/domains/events'
import { serializeUserApplication } from '#server/domains/applications'
import {
  getTeamWithMembersOrThrow,
  listTeamJoinRequests,
  listVisibleTeams,
  serializeTeamMember
} from '#server/domains/teams'
import type { AccountEventTeamsPage } from '#shared/domains/events/account-event-teams-page'
import type { AccountEventPageQuery } from '#shared/domains/events/account-event-page-registry'
import { accountEventTeamsPageSchema } from '#shared/domains/events/account-event-teams-page'
import { defineAccountEventPageRoute } from './account-event-page-contract'
import {
  assertAccountEventTeamAccess,
  getAccountEventPageAccess
} from './account-event-page-context'

const firstTeamPageSize = 6

function serializeTeamDetail(team: Awaited<ReturnType<typeof getTeamWithMembersOrThrow>>) {
  return {
    ...team.team,
    members: team.members
  }
}

export const accountEventTeamsPageRoute = defineAccountEventPageRoute({
  page: 'teams',
  schema: accountEventTeamsPageSchema,
  authorize: async (context) => {
    assertCompetitionEvent(context.event)
    assertAccountEventTeamAccess(context)
  },
  load: async (context, query: AccountEventPageQuery): Promise<AccountEventTeamsPage> => {
    const accessPromise = getAccountEventPageAccess(context)
    const [access, visibleTeams, selectedTeamSummary, tracks] = await Promise.all([
      accessPromise,
      listVisibleTeams(
        context.database,
        context.event,
        context.event.id,
        { page: 1, page_size: firstTeamPageSize },
        { includeInactiveTeams: context.authorization.canViewParticipantsAndTeams }
      ),
      query.selectedTeamSlug
        ? listVisibleTeams(
            context.database,
            context.event,
            context.event.id,
            { page: 1, page_size: 1, slug: query.selectedTeamSlug },
            { includeInactiveTeams: context.authorization.canViewParticipantsAndTeams }
          )
        : Promise.resolve(null),
      listEventTracks(context.database, context.event.id)
    ])
    const application = access.application
    const membership = access.memberships.find(({ membership }) => membership.leftAt === null)?.membership ?? null
    const ownTeamPromise = membership
      ? getTeamWithMembersOrThrow(context.database, context.event.id, membership.teamId, {
          includeSensitiveUserFields: true,
          allowInactiveTeam: context.authorization.canViewParticipantsAndTeams
        })
      : Promise.resolve(null)
    const selectedTeamPromise = selectedTeamSummary?.data[0]
      ? getTeamWithMembersOrThrow(context.database, context.event.id, selectedTeamSummary.data[0].id, {
          includeSensitiveUserFields: false,
          allowInactiveTeam: context.authorization.canViewParticipantsAndTeams
        })
      : Promise.resolve(null)
    const joinRequestsPromise = membership?.role === 'admin'
      ? listTeamJoinRequests(context.database, membership.teamId)
      : Promise.resolve([])
    const [ownTeam, selectedTeamRecord, joinRequests] = await Promise.all([
      ownTeamPromise,
      selectedTeamPromise,
      joinRequestsPromise
    ])
    const ownTeamDetail = ownTeam ? serializeTeamDetail(ownTeam) : null
    const selectedTeamDetail = selectedTeamRecord ? serializeTeamDetail(selectedTeamRecord) : null

    return {
      event: {
        id: context.event.id,
        slug: context.event.slug,
        state: context.event.state,
        maxTeamMembers: context.event.maxTeamMembers,
        submissionOpensAt: context.event.submissionOpensAt,
        requireSubmissionSummary: context.event.requireSubmissionSummary,
        requireSubmissionRepositoryUrl: context.event.requireSubmissionRepositoryUrl,
        requireSubmissionDemoUrl: context.event.requireSubmissionDemoUrl,
        tracks: tracks.map(track => ({
          id: track.id,
          name: track.name,
          shortDescription: track.shortDescription,
          displayOrder: track.displayOrder
        }))
      },
      application: application ? serializeUserApplication(application) : null,
      ownTeam: ownTeamDetail,
      ownMembership: membership ? serializeTeamMember(membership) : null,
      selectedTeam: selectedTeamDetail,
      joinRequests,
      visibleTeams: visibleTeams.data,
      visibleTeamsMeta: {
        page: 1,
        pageSize: firstTeamPageSize,
        total: visibleTeams.total,
        filterCounts: visibleTeams.filterCounts
      }
    }
  }
})
