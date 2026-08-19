import { assertCompetitionEvent, listEventTracks } from '#server/domains/events'
import { getOwnUserApplication, serializeUserApplication } from '#server/domains/applications'
import { getTeamCompetitionOutcome } from '#server/domains/outcomes'
import { getSubmissionDisqualificationReason, getSubmissionForTeam, serializeSubmission } from '#server/domains/submissions'
import {
  getOwnActiveTeamMembershipForEvent,
  getTeamWithMembersOrThrow,
  listTeamJoinRequests,
  serializeTeamMember
} from '#server/domains/teams'
import type { AccountEventWorkspacePage } from '#shared/domains/events/account-event-workspace-page'
import { accountEventWorkspacePageSchema } from '#shared/domains/events/account-event-workspace-page'
import { defineAccountEventPageRoute } from './account-event-page-contract'

const outcomeVisibleStates = new Set([
  'pitch',
  'pitch_review',
  'final_deliberation',
  'winners_announced',
  'completed'
])

function serializeTeamDetail(team: Awaited<ReturnType<typeof getTeamWithMembersOrThrow>>) {
  return {
    ...team.team,
    members: team.members
  }
}

export const accountEventWorkspacePageRoute = defineAccountEventPageRoute({
  page: 'workspace',
  schema: accountEventWorkspacePageSchema,
  authorize: async (context) => {
    assertCompetitionEvent(context.event)
  },
  load: async (context): Promise<AccountEventWorkspacePage> => {
    const userId = context.actor.platformUser.id
    const [application, tracks] = await Promise.all([
      getOwnUserApplication(context.database, context.event.id, userId),
      listEventTracks(context.database, context.event.id)
    ])
    const membership = await getOwnActiveTeamMembershipForEvent(context.database, context.event.id, userId)
    const team = membership
      ? await getTeamWithMembersOrThrow(context.database, context.event.id, membership.teamId, {
          includeSensitiveUserFields: true
        })
      : null
    const teamDetail = team ? serializeTeamDetail(team) : null
    const joinRequests = membership?.role === 'admin'
      ? await listTeamJoinRequests(context.database, membership.teamId)
      : []
    const submission = teamDetail
      ? await getSubmissionForTeam(context.database, teamDetail.id)
      : null
    const serializedSubmission = submission
      ? serializeSubmission(submission, {
          disqualificationReason: submission.status === 'disqualified'
            ? await getSubmissionDisqualificationReason(context.database, submission.id)
            : null
        })
      : null
    const outcome = teamDetail && outcomeVisibleStates.has(context.event.state)
      ? await getTeamCompetitionOutcome(context.database, context.event.id, teamDetail.id)
      : null
    const applicationStatus = application?.status ?? null
    const isApprovedParticipant = applicationStatus === 'approved'
    const isFormationOpen = context.event.state === 'registration_open'
      || context.event.state === 'submission_open'
    const canManageTeam = membership?.role === 'admin'
    const canViewSubmission = Boolean(teamDetail)
      && context.event.state !== 'draft'
      && context.event.state !== 'registration_open'

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
      ownTeam: teamDetail,
      ownMembership: membership ? serializeTeamMember(membership) : null,
      joinRequests,
      submission: serializedSubmission,
      outcome: outcome
        ? {
            isShortlisted: outcome.isShortlisted,
            isWinner: outcome.isWinner,
            finalRank: outcome.finalRank,
            rankedTeamCount: outcome.rankedTeamCount,
            prizes: outcome.prizes.map(prize => ({
              id: prize.id,
              name: prize.name
            }))
          }
        : null,
      rank: outcome?.rankSummary ?? null,
      workflow: {
        applicationStatus,
        isApprovedParticipant,
        canCreateTeam: isApprovedParticipant && isFormationOpen && !membership,
        canManageTeam,
        canViewSubmission,
        canManageSubmission: canManageTeam && canViewSubmission
      }
    }
  }
})
