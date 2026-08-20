import { assertCompetitionEvent, listEventTracks } from '#server/domains/events'
import { serializeUserApplication } from '#server/domains/applications'
import { getTeamCompetitionOutcome } from '#server/domains/outcomes'
import { getSubmissionDisqualificationReason, getSubmissionForTeam, serializeSubmission } from '#server/domains/submissions'
import {
  getTeamWithMembersOrThrow,
  listTeamJoinRequests,
  serializeTeamMember
} from '#server/domains/teams'
import type { AccountEventWorkspacePage } from '#shared/domains/events/account-event-workspace-page'
import { accountEventWorkspacePageSchema } from '#shared/domains/events/account-event-workspace-page'
import { defineAccountEventPageRoute } from './account-event-page-contract'
import { loadAccountEventPageAccess } from './account-event-page-context'

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
    const accessPromise = context.access
      ? Promise.resolve(context.access)
      : loadAccountEventPageAccess(context)
    const [access, tracks] = await Promise.all([
      accessPromise,
      listEventTracks(context.database, context.event.id)
    ])
    const application = access.application
    const membership = access.memberships.find(({ membership }) => membership.leftAt === null)?.membership ?? null
    const teamId = membership?.teamId ?? null
    const [team, joinRequests, submission, outcome] = await Promise.all([
      teamId
        ? getTeamWithMembersOrThrow(context.database, context.event.id, teamId, {
            includeSensitiveUserFields: true
          })
        : Promise.resolve(null),
      membership?.role === 'admin'
        ? listTeamJoinRequests(context.database, teamId!)
        : Promise.resolve([]),
      teamId
        ? getSubmissionForTeam(context.database, teamId)
        : Promise.resolve(null),
      teamId && outcomeVisibleStates.has(context.event.state)
        ? getTeamCompetitionOutcome(context.database, context.event.id, teamId)
        : Promise.resolve(null)
    ])
    const teamDetail = team ? serializeTeamDetail(team) : null
    const serializedSubmission = submission
      ? serializeSubmission(submission, {
          disqualificationReason: submission.status === 'disqualified'
            ? await getSubmissionDisqualificationReason(context.database, submission.id)
            : null
        })
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
