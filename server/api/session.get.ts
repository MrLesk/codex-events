import { desc, eq } from 'drizzle-orm'

import { requireAuthenticatedActor } from '../auth/actor'
import { hackathonRoleAssignments } from '../database/schema'
import { getDatabase } from '../database/client'
import { defineApiHandler } from '../utils/api-handler'
import { apiData } from '../utils/api-response'

type HackathonRoleAssignmentRecord = typeof hackathonRoleAssignments.$inferSelect

export default defineApiHandler(async (event) => {
  const actor = await requireAuthenticatedActor(event)

  if (!actor.hasPlatformAccount) {
    return apiData({
      actor: {
        kind: actor.kind,
        isAuthenticated: actor.isAuthenticated,
        hasPlatformAccount: actor.hasPlatformAccount,
        hasAcceptedCurrentPlatformDocuments: actor.hasAcceptedCurrentPlatformDocuments,
        accountLink: actor.accountLink,
        sessionUser: actor.sessionUser,
        platformUser: null,
        isPlatformAdmin: false,
        hackathonRoles: []
      }
    })
  }

  const database = getDatabase(event)
  const roleAssignments = await database.query.hackathonRoleAssignments.findMany({
    where: eq(hackathonRoleAssignments.userId, actor.platformUser.id),
    orderBy: [desc(hackathonRoleAssignments.createdAt)]
  })

  return apiData({
    actor: {
      kind: actor.kind,
      isAuthenticated: actor.isAuthenticated,
      hasPlatformAccount: actor.hasPlatformAccount,
      hasAcceptedCurrentPlatformDocuments: actor.hasAcceptedCurrentPlatformDocuments,
      sessionUser: actor.sessionUser,
      platformUser: {
        id: actor.platformUser.id,
        email: actor.platformUser.email,
        displayName: actor.platformUser.displayName,
        firstName: actor.platformUser.firstName,
        familyName: actor.platformUser.familyName,
        company: actor.platformUser.company,
        bio: actor.platformUser.bio,
        isPlatformAdmin: actor.platformUser.isPlatformAdmin,
        xProfileUrl: actor.platformUser.xProfileUrl,
        linkedinProfileUrl: actor.platformUser.linkedinProfileUrl,
        githubProfileUrl: actor.platformUser.githubProfileUrl,
        chatgptEmail: actor.platformUser.chatgptEmail,
        openaiOrgId: actor.platformUser.openaiOrgId,
        lumaUsername: actor.platformUser.lumaUsername,
        profileIconUpdatedAt: actor.platformUser.profileIconUpdatedAt,
        createdAt: actor.platformUser.createdAt,
        updatedAt: actor.platformUser.updatedAt,
        deletedAt: actor.platformUser.deletedAt
      },
      isPlatformAdmin: actor.platformUser.isPlatformAdmin,
      hackathonRoles: roleAssignments.map((assignment: HackathonRoleAssignmentRecord) => ({
        hackathonId: assignment.hackathonId,
        role: assignment.role,
        isInJudgePool: assignment.isInJudgePool,
        isStaff: assignment.isStaff,
        createdAt: assignment.createdAt
      }))
    }
  })
})
