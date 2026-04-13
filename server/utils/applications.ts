import type { H3Event } from 'h3'

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

import {
  isProofOfExecutionLinksValid,
  normalizeProofOfExecutionLinks
} from '#proof-of-execution-links'
import { requirePlatformActor } from '../auth/actor'
import {
  assertHackathonParticipantVisibilityAccess,
  resolveHackathonAuthorization
} from '../auth/authorization'
import { getDatabase, type AppDatabase } from '../database/client'
import {
  submissions,
  teamMembers,
  teams,
  userApplications,
  users
} from '../database/schema'
import type {
  hackathonTermsDocuments,
  hackathons
} from '../database/schema'
import { ApiError } from './api-error'
import {
  getCurrentHackathonTerms,
  getHackathonTermsDocumentOrThrow,
  getVisibleHackathonOrThrow,
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathonTermsDocument
} from './hackathon-management'
import { assertAllowedState, assertGuard } from './lifecycle-guard'

export const applicationParamsSchema = routeIdParamsSchema.extend({
  applicationId: z.string().trim().min(1)
})

export const registrationTeamIntentValues = ['solo', 'team', 'unknown'] as const

const registrationTeamMemberHintSchema = z.object({
  fullName: z.string().max(200).optional().nullable(),
  email: z.string().email().max(320).optional().nullable()
})

export const submitApplicationBodySchema = z.object({
  applicationTermsDocumentId: z.string().trim().min(1),
  registrationTeamIntent: z.enum(registrationTeamIntentValues).default('unknown'),
  registrationTeamMembers: z.array(registrationTeamMemberHintSchema).default([]),
  inPersonAttendanceCommitment: z.boolean().default(false),
  whyThisHackathon: z.string().trim().max(4000).default(''),
  proofOfExecutionUrl: z.string().trim().max(2048).default('')
})

type UserApplicationRecord = typeof userApplications.$inferSelect
type UserRecord = typeof users.$inferSelect
type HackathonRecord = typeof hackathons.$inferSelect
type HackathonTermsDocumentRecord = typeof hackathonTermsDocuments.$inferSelect
type TeamRecord = typeof teams.$inferSelect
type TeamMemberRecord = typeof teamMembers.$inferSelect
type SubmissionRecord = typeof submissions.$inferSelect
type SubmitApplicationBody = z.infer<typeof submitApplicationBodySchema>

export type AdminApplicationWithdrawalTeamAction = 'none' | 'remove_member' | 'dissolve_team'

export interface AdminApplicationWithdrawalAvailability {
  isAllowed: boolean
  reason: string | null
  warning: string | null
  activeTeamId: string | null
  teamAction: AdminApplicationWithdrawalTeamAction
}

interface AdminApplicationWithdrawalPlan extends AdminApplicationWithdrawalAvailability {
  activeTeam: TeamRecord | null
  targetMembership: TeamMemberRecord | null
  activeMembers: TeamMemberRecord[]
  activeSubmission: SubmissionRecord | null
}

function normalizeTeamMemberHintValue(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeTextValue(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function normalizeProofOfExecutionUrl(value: string | null | undefined) {
  const normalized = normalizeProofOfExecutionLinks(value)

  if (!normalized) {
    return ''
  }

  assertGuard(isProofOfExecutionLinksValid(normalized), {
    code: 'proof_of_execution_url_invalid',
    message: 'Proof of execution links must use the http or https scheme.'
  })

  return normalized
}

function getAdminApplicationWithdrawalAvailabilityFromPlan(
  application: UserApplicationRecord,
  plan: Pick<AdminApplicationWithdrawalPlan, 'activeTeam' | 'targetMembership' | 'activeMembers' | 'activeSubmission'>
): AdminApplicationWithdrawalAvailability {
  if (application.status === 'withdrawn') {
    return {
      isAllowed: false,
      reason: 'This application is already withdrawn.',
      warning: null,
      activeTeamId: null,
      teamAction: 'none'
    }
  }

  if (application.status === 'rejected') {
    return {
      isAllowed: false,
      reason: 'Rejected applications cannot be withdrawn.',
      warning: null,
      activeTeamId: null,
      teamAction: 'none'
    }
  }

  if (application.status !== 'submitted' && application.status !== 'approved') {
    return {
      isAllowed: false,
      reason: 'Only submitted or approved applications can be withdrawn.',
      warning: null,
      activeTeamId: null,
      teamAction: 'none'
    }
  }

  if (!plan.targetMembership || !plan.activeTeam) {
    return {
      isAllowed: true,
      reason: null,
      warning: null,
      activeTeamId: null,
      teamAction: 'none'
    }
  }

  const remainingActiveMembers = plan.activeMembers.filter(member =>
    member.id !== plan.targetMembership?.id
  )
  const teamName = plan.activeTeam.name || 'This team'

  if (remainingActiveMembers.length === 0) {
    return plan.activeSubmission
      ? {
          isAllowed: false,
          reason: `${teamName} cannot be dismantled because it still has an active submission.`,
          warning: null,
          activeTeamId: plan.activeTeam.id,
          teamAction: 'dissolve_team'
        }
      : {
          isAllowed: true,
          reason: null,
          warning: `This withdrawal will dismantle ${teamName} because this participant is the last active team member.`,
          activeTeamId: plan.activeTeam.id,
          teamAction: 'dissolve_team'
        }
  }

  if (plan.targetMembership.role === 'admin') {
    const otherActiveAdmins = remainingActiveMembers.filter(member => member.role === 'admin')

    if (otherActiveAdmins.length === 0) {
      return plan.activeSubmission
        ? {
            isAllowed: false,
            reason: `${teamName} cannot be dismantled because this participant is the last active admin and the team still has an active submission.`,
            warning: null,
            activeTeamId: plan.activeTeam.id,
            teamAction: 'dissolve_team'
          }
        : {
            isAllowed: true,
            reason: null,
            warning: `This withdrawal will dismantle ${teamName} and remove its remaining active members because this participant is the last active admin.`,
            activeTeamId: plan.activeTeam.id,
            teamAction: 'dissolve_team'
          }
    }
  }

  return {
    isAllowed: true,
    reason: null,
    warning: null,
    activeTeamId: plan.activeTeam.id,
    teamAction: 'remove_member'
  }
}

export async function getAdminApplicationWithdrawalPlan(
  database: AppDatabase,
  hackathonId: string,
  application: UserApplicationRecord
): Promise<AdminApplicationWithdrawalPlan> {
  const activeMemberships = await database.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.userId, application.userId),
      isNull(teamMembers.leftAt)
    )
  })

  const relatedTeams = activeMemberships.length > 0
    ? await database.query.teams.findMany({
        where: inArray(teams.id, activeMemberships.map(membership => membership.teamId))
      })
    : []
  const activeTeam = relatedTeams.find(team => team.hackathonId === hackathonId) ?? null
  const targetMembership = activeTeam
    ? activeMemberships.find(membership => membership.teamId === activeTeam.id) ?? null
    : null
  const activeMembers = activeTeam
    ? await database.query.teamMembers.findMany({
        where: and(
          eq(teamMembers.teamId, activeTeam.id),
          isNull(teamMembers.leftAt)
        ),
        orderBy: [asc(teamMembers.createdAt)]
      })
    : []
  const activeSubmission = activeTeam
    ? (await database.query.submissions.findFirst({
        where: and(
          eq(submissions.teamId, activeTeam.id),
          inArray(submissions.status, ['draft', 'submitted', 'locked'])
        )
      })) ?? null
    : null
  const availability = getAdminApplicationWithdrawalAvailabilityFromPlan(application, {
    activeTeam,
    targetMembership,
    activeMembers,
    activeSubmission
  })

  return {
    ...availability,
    activeTeam,
    targetMembership,
    activeMembers,
    activeSubmission
  }
}

async function listAdminApplicationWithdrawalAvailabilityByApplicationId(
  database: AppDatabase,
  hackathonId: string,
  applications: UserApplicationRecord[]
) {
  if (applications.length === 0) {
    return new Map<string, AdminApplicationWithdrawalAvailability>()
  }

  const userIds = [...new Set(applications.map(application => application.userId))]
  const activeMemberships = await database.query.teamMembers.findMany({
    where: and(
      inArray(teamMembers.userId, userIds),
      isNull(teamMembers.leftAt)
    ),
    orderBy: [asc(teamMembers.createdAt)]
  })
  const relatedTeams = activeMemberships.length > 0
    ? await database.query.teams.findMany({
        where: inArray(teams.id, activeMemberships.map(membership => membership.teamId))
      })
    : []
  const teamsById = new Map(
    relatedTeams
      .filter(team => team.hackathonId === hackathonId)
      .map(team => [team.id, team] as const)
  )
  const activeMembershipByUserId = new Map<string, TeamMemberRecord>()

  for (const membership of activeMemberships) {
    if (!teamsById.has(membership.teamId) || activeMembershipByUserId.has(membership.userId)) {
      continue
    }

    activeMembershipByUserId.set(membership.userId, membership)
  }

  const activeTeamIds = [...new Set([...activeMembershipByUserId.values()].map(membership => membership.teamId))]
  const [teamActiveMembers, activeSubmissions] = activeTeamIds.length > 0
    ? await Promise.all([
        database.query.teamMembers.findMany({
          where: and(
            inArray(teamMembers.teamId, activeTeamIds),
            isNull(teamMembers.leftAt)
          ),
          orderBy: [asc(teamMembers.createdAt)]
        }),
        database.query.submissions.findMany({
          where: and(
            inArray(submissions.teamId, activeTeamIds),
            inArray(submissions.status, ['draft', 'submitted', 'locked'])
          ),
          orderBy: [desc(submissions.createdAt)]
        })
      ])
    : [[], []]
  const activeMembersByTeamId = new Map<string, TeamMemberRecord[]>()
  const activeSubmissionByTeamId = new Map<string, SubmissionRecord>()

  for (const member of teamActiveMembers) {
    const members = activeMembersByTeamId.get(member.teamId) ?? []
    members.push(member)
    activeMembersByTeamId.set(member.teamId, members)
  }

  for (const submission of activeSubmissions) {
    if (!activeSubmissionByTeamId.has(submission.teamId)) {
      activeSubmissionByTeamId.set(submission.teamId, submission)
    }
  }

  return new Map(applications.map((application) => {
    const targetMembership = activeMembershipByUserId.get(application.userId) ?? null
    const activeTeam = targetMembership ? teamsById.get(targetMembership.teamId) ?? null : null
    const availability = getAdminApplicationWithdrawalAvailabilityFromPlan(application, {
      activeTeam,
      targetMembership,
      activeMembers: activeTeam ? activeMembersByTeamId.get(activeTeam.id) ?? [] : [],
      activeSubmission: activeTeam ? activeSubmissionByTeamId.get(activeTeam.id) ?? null : null
    })

    return [application.id, availability] as const
  }))
}

export function isHackathonLumaEmailRequired(
  hackathon: Pick<HackathonRecord, 'requireLumaEmail'>
) {
  return hackathon.requireLumaEmail
}

export function isHackathonLumaAttendanceSyncEnabled(
  hackathon: Pick<HackathonRecord, 'lumaEventApiId'>
) {
  return Boolean(hackathon.lumaEventApiId?.trim())
}

export function isHackathonLumaSyncEnabled(
  hackathon: Pick<HackathonRecord, 'requireLumaEmail' | 'lumaEventApiId'>
) {
  return isHackathonLumaEmailRequired(hackathon) && isHackathonLumaAttendanceSyncEnabled(hackathon)
}

export function getInitialApplicationLumaSyncStatus(
  hackathon: Pick<HackathonRecord, 'requireLumaEmail' | 'lumaEventApiId'>
) {
  return isHackathonLumaSyncEnabled(hackathon) ? 'not_synced' as const : null
}

export function serializeRegistrationDetailsJson(
  hackathon: Pick<HackathonRecord, 'id' | 'maxTeamMembers' | 'inPersonEvent' | 'requireWhyThisHackathon' | 'requireProofOfExecution'>,
  payload: Pick<SubmitApplicationBody, 'registrationTeamIntent' | 'registrationTeamMembers' | 'inPersonAttendanceCommitment' | 'whyThisHackathon' | 'proofOfExecutionUrl'>
) {
  assertGuard(payload.registrationTeamMembers.length <= hackathon.maxTeamMembers, {
    code: 'registration_team_members_invalid',
    message: 'The provided team-member registration hints exceed the maximum team size for this hackathon.',
    details: {
      hackathonId: hackathon.id,
      maxTeamMembers: hackathon.maxTeamMembers
    }
  })

  const normalizedTeamMembers = payload.registrationTeamIntent === 'team'
    ? payload.registrationTeamMembers
        .slice(0, hackathon.maxTeamMembers)
        .map((member) => {
          const fullName = normalizeTeamMemberHintValue(member.fullName)
          const email = normalizeTeamMemberHintValue(member.email)

          if (!fullName && !email) {
            return null
          }

          return {
            ...(fullName ? { fullName } : {}),
            ...(email ? { email } : {})
          }
        })
        .filter((member): member is { fullName?: string, email?: string } => Boolean(member))
    : []

  const whyThisHackathon = normalizeTextValue(payload.whyThisHackathon)
  const proofOfExecutionUrl = normalizeProofOfExecutionUrl(payload.proofOfExecutionUrl)

  assertGuard(!hackathon.requireWhyThisHackathon || whyThisHackathon.length > 0, {
    code: 'why_this_hackathon_required',
    message: 'A why-this-hackathon response is required for this hackathon.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(!hackathon.requireProofOfExecution || proofOfExecutionUrl.length > 0, {
    code: 'proof_of_execution_required',
    message: 'At least one proof-of-execution link is required for this hackathon.',
    details: {
      hackathonId: hackathon.id
    }
  })

  return JSON.stringify({
    teamIntent: payload.registrationTeamIntent,
    teamMembers: normalizedTeamMembers,
    inPersonAttendanceCommitment: hackathon.inPersonEvent ? payload.inPersonAttendanceCommitment : false,
    whyThisHackathon,
    proofOfExecutionUrl
  })
}

export function assertInPersonAttendanceCommitment(
  hackathon: Pick<HackathonRecord, 'id' | 'inPersonEvent'>,
  payload: Pick<SubmitApplicationBody, 'inPersonAttendanceCommitment'>
) {
  if (!hackathon.inPersonEvent) {
    return
  }

  assertGuard(payload.inPersonAttendanceCommitment === true, {
    code: 'in_person_attendance_commitment_required',
    message: 'In-person hackathons require explicit in-person attendance commitment before application submission.',
    details: {
      hackathonId: hackathon.id
    }
  })
}

export function serializeUserApplication(
  application: UserApplicationRecord,
  options?: {
    user?: UserRecord | null
    applicationTermsDocument?: HackathonTermsDocumentRecord | null
    adminWithdrawal?: AdminApplicationWithdrawalAvailability
  }
) {
  return {
    id: application.id,
    hackathonId: application.hackathonId,
    userId: application.userId,
    status: application.status,
    preApprovalStatus: application.preApprovalStatus,
    lumaSyncStatus: application.lumaSyncStatus,
    submittedAt: application.submittedAt,
    withdrawnAt: application.withdrawnAt,
    checkedInAt: application.checkedInAt,
    reviewedAt: application.reviewedAt,
    reviewedByUserId: application.reviewedByUserId,
    applicationTermsDocumentId: application.applicationTermsDocumentId,
    applicationTermsAcceptedAt: application.applicationTermsAcceptedAt,
    registrationDetailsJson: application.registrationDetailsJson,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    ...(options?.user
      ? {
          user: {
            id: options.user.id,
            email: options.user.email,
            displayName: options.user.displayName,
            xProfileUrl: options.user.xProfileUrl,
            linkedinProfileUrl: options.user.linkedinProfileUrl,
            githubProfileUrl: options.user.githubProfileUrl,
            chatgptEmail: options.user.chatgptEmail,
            openaiOrgId: options.user.openaiOrgId,
            lumaEmail: options.user.lumaEmail,
            lumaUsername: options.user.lumaUsername,
            profileIconUpdatedAt: options.user.profileIconUpdatedAt
          }
        }
      : {}),
    ...(options?.applicationTermsDocument
      ? {
          applicationTermsDocument: serializeHackathonTermsDocument(options.applicationTermsDocument)
        }
      : {}),
    ...(options?.adminWithdrawal
      ? {
          adminWithdrawal: options.adminWithdrawal
        }
      : {})
  }
}

export function assertHackathonAllowsApplications(hackathon: HackathonRecord, now = new Date()) {
  assertAllowedState(hackathon.state, ['registration_open'], {
    code: 'hackathon_state_invalid',
    message: 'Applications can only be submitted while registration is open.',
    details: { hackathonId: hackathon.id }
  })

  const nowTimestamp = now.getTime()
  const registrationOpensAt = Date.parse(hackathon.registrationOpensAt)
  const registrationClosesAt = Date.parse(hackathon.registrationClosesAt)

  assertGuard(nowTimestamp >= registrationOpensAt && nowTimestamp < registrationClosesAt, {
    code: 'hackathon_state_invalid',
    message: 'Applications can only be submitted while registration is open.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertUserMeetsHackathonProfileRequirements(user: UserRecord, hackathon: HackathonRecord) {
  const missingFields = []

  if (hackathon.requireXProfile && !user.xProfileUrl) {
    missingFields.push('xProfileUrl')
  }

  if (hackathon.requireLinkedinProfile && !user.linkedinProfileUrl) {
    missingFields.push('linkedinProfileUrl')
  }

  if (hackathon.requireGithubProfile && !user.githubProfileUrl) {
    missingFields.push('githubProfileUrl')
  }

  if (hackathon.requireChatgptEmail && !user.chatgptEmail) {
    missingFields.push('chatgptEmail')
  }

  if (hackathon.requireOpenaiOrgId && !user.openaiOrgId) {
    missingFields.push('openaiOrgId')
  }

  if (isHackathonLumaEmailRequired(hackathon) && !user.lumaEmail) {
    missingFields.push('lumaEmail')
  }

  assertGuard(missingFields.length === 0, {
    code: 'required_profile_fields_missing',
    message: 'The user profile does not satisfy the hackathon registration requirements.',
    details: {
      hackathonId: hackathon.id,
      missingFields
    }
  })
}

export async function getOwnUserApplication(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  return await database.query.userApplications.findFirst({
    where: and(
      eq(userApplications.hackathonId, hackathonId),
      eq(userApplications.userId, userId)
    )
  })
}

export async function assertNoExistingApplication(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  const existingApplication = await getOwnUserApplication(database, hackathonId, userId)

  assertGuard(!existingApplication, {
    code: 'user_application_exists',
    message: 'A user can submit at most one application per hackathon.',
    details: {
      hackathonId,
      userId
    }
  })
}

export async function getCurrentApplicationTermsDocumentOrThrow(
  database: AppDatabase,
  hackathon: HackathonRecord
) {
  const currentTerms = await getCurrentHackathonTerms(database, hackathon)
  const document = currentTerms.applicationTerms

  if (!document) {
    throw new ApiError({
      statusCode: 409,
      code: 'application_terms_unavailable',
      message: 'The hackathon does not currently expose application terms for acceptance.',
      details: {
        hackathonId: hackathon.id
      }
    })
  }

  return document
}

export async function assertCurrentApplicationTermsAcceptance(
  database: AppDatabase,
  hackathon: HackathonRecord,
  applicationTermsDocumentId: string
) {
  const document = await getHackathonTermsDocumentOrThrow(database, hackathon.id, applicationTermsDocumentId)

  assertGuard(document.documentType === 'application_terms', {
    code: 'hackathon_terms_document_type_mismatch',
    message: 'The selected hackathon terms document does not match the application_terms document type.',
    details: {
      hackathonId: hackathon.id,
      hackathonTermsDocumentId: document.id,
      documentType: document.documentType
    }
  })

  const currentDocument = await getCurrentApplicationTermsDocumentOrThrow(database, hackathon)

  assertGuard(currentDocument.id === document.id, {
    code: 'application_terms_document_outdated',
    message: 'Application submission requires acceptance of the current application terms document.',
    details: {
      hackathonId: hackathon.id,
      acceptedHackathonTermsDocumentId: document.id,
      currentHackathonTermsDocumentId: currentDocument.id,
      currentVersion: currentDocument.version
    }
  })

  return currentDocument
}

export async function getApplicationOrThrow(
  database: AppDatabase,
  hackathonId: string,
  applicationId: string
) {
  const application = await database.query.userApplications.findFirst({
    where: and(
      eq(userApplications.id, applicationId),
      eq(userApplications.hackathonId, hackathonId)
    )
  })

  if (!application) {
    throw new ApiError({
      statusCode: 404,
      code: 'user_application_not_found',
      message: 'The requested user application was not found.',
      details: {
        hackathonId,
        applicationId
      }
    })
  }

  return application
}

export function assertApplicationReviewable(application: UserApplicationRecord) {
  assertAllowedState(application.status, ['submitted'], {
    code: 'user_application_state_invalid',
    message: 'Only submitted applications can be reviewed.',
    details: {
      applicationId: application.id
    }
  })
}

export function assertApplicationWithdrawable(application: UserApplicationRecord) {
  assertAllowedState(application.status, ['submitted', 'approved'], {
    code: 'user_application_state_invalid',
    message: 'Only submitted or approved applications can be withdrawn.',
    details: {
      applicationId: application.id
    }
  })
}

export async function assertNoActiveTeamMembershipForApplicationWithdrawal(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  const activeMemberships = await database.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.userId, userId),
      isNull(teamMembers.leftAt)
    )
  })

  if (activeMemberships.length === 0) {
    return
  }

  const relatedTeams = await database.query.teams.findMany({
    where: inArray(teams.id, activeMemberships.map(membership => membership.teamId))
  })

  const hasActiveHackathonTeamMembership = relatedTeams.some(team => team.hackathonId === hackathonId)

  assertGuard(!hasActiveHackathonTeamMembership, {
    code: 'user_application_withdrawal_blocked',
    message: 'Leave your active team before withdrawing from this hackathon.',
    details: {
      hackathonId,
      userId
    }
  })
}

export async function requireApprovedUserForHackathon(event: H3Event, hackathonId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const application = await getOwnUserApplication(database, hackathonId, actor.platformUser.id)

  assertGuard(application?.status === 'approved', {
    code: 'approved_user_required',
    message: 'This operation requires an approved application for the hackathon.',
    details: {
      hackathonId,
      userId: actor.platformUser.id
    },
    statusCode: 403
  })

  return {
    actor,
    hackathon,
    application
  }
}

export async function listHackathonApplications(database: AppDatabase, hackathonId: string) {
  const applications = await database.query.userApplications.findMany({
    where: eq(userApplications.hackathonId, hackathonId),
    orderBy: [desc(userApplications.submittedAt), asc(userApplications.createdAt)]
  })

  const usersById = new Map<string, UserRecord>()

  if (applications.length > 0) {
    const relatedUserIds = [...new Set(applications.map(application => application.userId))]
    const relatedUserLookupBatchSize = 75

    for (let index = 0; index < relatedUserIds.length; index += relatedUserLookupBatchSize) {
      const relatedUsers = await database.query.users.findMany({
        where: and(
          inArray(users.id, relatedUserIds.slice(index, index + relatedUserLookupBatchSize)),
          isNull(users.deletedAt)
        )
      })

      for (const user of relatedUsers) {
        usersById.set(user.id, user)
      }
    }
  }

  const adminWithdrawalByApplicationId = await listAdminApplicationWithdrawalAvailabilityByApplicationId(
    database,
    hackathonId,
    applications
  )

  return applications.map(application =>
    serializeUserApplication(application, {
      user: usersById.get(application.userId) ?? null,
      adminWithdrawal: adminWithdrawalByApplicationId.get(application.id)
    })
  )
}

export async function requireHackathonAdminApplicationContext(event: H3Event, hackathonId: string) {
  const { hackathon, authorization } = await requireHackathonAdmin(event, hackathonId)

  return {
    hackathon,
    authorization,
    database: getDatabase(event)
  }
}

export async function requireHackathonApplicationVisibilityContext(event: H3Event, hackathonId: string) {
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)

  assertHackathonParticipantVisibilityAccess(authorization)

  return {
    hackathon,
    authorization,
    database
  }
}

export async function getUserApplicationWithTermsOrThrow(
  database: AppDatabase,
  hackathonId: string,
  applicationId: string
) {
  const application = await getApplicationOrThrow(database, hackathonId, applicationId)
  const applicationTermsDocument = await getHackathonTermsDocumentOrThrow(
    database,
    hackathonId,
    application.applicationTermsDocumentId
  )

  return {
    application,
    applicationTermsDocument
  }
}
