import { assertCompetitionEvent, listEventTracks } from '#server/domains/events'
import { getOwnUserApplication, serializeUserApplication } from '#server/domains/applications'
import {
  getOwnActiveTeamMembershipForEvent,
  getTeamWithMembersOrThrow,
  listTeamJoinRequests,
  listVisibleTeams,
  serializeTeamMember
} from '#server/domains/teams'
import type { AccountEventTeamsPage } from '#shared/domains/events/account-event-teams-page'
import { accountEventTeamsPageSchema } from '#shared/domains/events/account-event-teams-page'
import { defineAccountEventPageRoute } from './account-event-page-contract'

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
  },
  load: async (context): Promise<AccountEventTeamsPage> => {
    const userId = context.actor.platformUser.id
    const [application, membership, visibleTeams, tracks] = await Promise.all([
      getOwnUserApplication(context.database, context.event.id, userId),
      getOwnActiveTeamMembershipForEvent(context.database, context.event.id, userId),
      listVisibleTeams(
        context.database,
        context.event,
        context.event.id,
        { page: 1, page_size: firstTeamPageSize },
        { includeInactiveTeams: context.authorization.canViewParticipantsAndTeams }
      ),
      listEventTracks(context.database, context.event.id)
    ])
    const ownTeam = membership
      ? await getTeamWithMembersOrThrow(context.database, context.event.id, membership.teamId, {
          includeSensitiveUserFields: true,
          allowInactiveTeam: context.authorization.canViewParticipantsAndTeams
        })
      : null
    const ownTeamDetail = ownTeam ? serializeTeamDetail(ownTeam) : null
    const joinRequests = membership?.role === 'admin'
      ? await listTeamJoinRequests(context.database, membership.teamId)
      : []

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
      selectedTeam: null,
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
