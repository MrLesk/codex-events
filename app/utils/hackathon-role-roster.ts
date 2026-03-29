import type {
  HackathonRoleAssignment,
  HackathonRoleUserSummary
} from './admin-workspace'

export type HackathonRosterRole = HackathonRoleAssignment['role']

export interface HackathonRoleRosterRow extends HackathonRoleUserSummary {
  assignment: HackathonRoleAssignment | null
  isAssigned: boolean
}

function compareRosterUsers(
  left: HackathonRoleUserSummary,
  right: HackathonRoleUserSummary,
  currentHackathonAdminIds: Set<string>
) {
  const leftPriority = left.isPlatformAdmin ? 0 : currentHackathonAdminIds.has(left.id) ? 1 : 2
  const rightPriority = right.isPlatformAdmin ? 0 : currentHackathonAdminIds.has(right.id) ? 1 : 2

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority
  }

  const displayNameOrder = left.displayName.localeCompare(right.displayName)

  if (displayNameOrder !== 0) {
    return displayNameOrder
  }

  const emailOrder = left.email.localeCompare(right.email)

  if (emailOrder !== 0) {
    return emailOrder
  }

  return left.id.localeCompare(right.id)
}

function listCurrentHackathonAdminIds(roleAssignments: HackathonRoleAssignment[]) {
  return new Set(
    roleAssignments
      .filter(assignment => assignment.role === 'hackathon_admin')
      .map(assignment => assignment.userId)
  )
}

export function buildAssignedRoleRosterRows(
  roleAssignments: HackathonRoleAssignment[],
  role: HackathonRosterRole
) {
  const currentHackathonAdminIds = listCurrentHackathonAdminIds(roleAssignments)

  return roleAssignments
    .filter((assignment): assignment is HackathonRoleAssignment & { user: HackathonRoleUserSummary } =>
      assignment.role === role && assignment.user !== undefined
    )
    .map((assignment): HackathonRoleRosterRow => ({
      ...assignment.user,
      assignment,
      isAssigned: true
    }))
    .sort((left, right) => compareRosterUsers(left, right, currentHackathonAdminIds))
}

export function buildRoleRosterRows(
  candidateUsers: HackathonRoleUserSummary[],
  roleAssignments: HackathonRoleAssignment[],
  role: HackathonRosterRole,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase()
  const currentHackathonAdminIds = listCurrentHackathonAdminIds(roleAssignments)

  return [...candidateUsers].filter((user) => {
    if (!normalizedQuery) {
      return true
    }

    const haystack = `${user.displayName} ${user.email} ${user.id}`.toLowerCase()
    return haystack.includes(normalizedQuery)
  })
    .sort((left, right) => compareRosterUsers(left, right, currentHackathonAdminIds))
    .map((user): HackathonRoleRosterRow => {
      const assignment = roleAssignments.find(existingAssignment =>
        existingAssignment.role === role && existingAssignment.userId === user.id
      ) ?? null

      return {
        ...user,
        assignment,
        isAssigned: assignment !== null
      }
    })
}
