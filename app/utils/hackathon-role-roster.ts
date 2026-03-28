import type {
  AdminApplicationRecord,
  HackathonRoleAssignment
} from './admin-workspace'

export type HackathonRosterRole = HackathonRoleAssignment['role']

export interface HackathonRosterAssignableUser {
  id: string
  displayName: string
  email: string
}

export function listAssignableRosterUsers(
  applications: AdminApplicationRecord[],
  roleAssignments: HackathonRoleAssignment[]
) {
  const usersById = new Map<string, HackathonRosterAssignableUser>()

  for (const application of applications) {
    if (application.status !== 'approved' || !application.user) {
      continue
    }

    usersById.set(application.user.id, {
      id: application.user.id,
      displayName: application.user.displayName,
      email: application.user.email
    })
  }

  for (const assignment of roleAssignments) {
    if (!assignment.user) {
      continue
    }

    usersById.set(assignment.user.id, {
      id: assignment.user.id,
      displayName: assignment.user.displayName,
      email: assignment.user.email
    })
  }

  return [...usersById.values()].sort((left, right) => left.displayName.localeCompare(right.displayName))
}

export function filterAssignableRoleUsers(
  assignableUsers: HackathonRosterAssignableUser[],
  roleAssignments: HackathonRoleAssignment[],
  role: HackathonRosterRole,
  query: string
) {
  const assignedUserIds = new Set(
    roleAssignments
      .filter(assignment => assignment.role === role)
      .map(assignment => assignment.userId)
  )
  const normalizedQuery = query.trim().toLowerCase()

  return assignableUsers.filter((user) => {
    if (assignedUserIds.has(user.id)) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    const haystack = `${user.displayName} ${user.email} ${user.id}`.toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}
