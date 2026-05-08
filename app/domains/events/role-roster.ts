import type {
  EventRoleAssignment,
  EventRoleUserSummary
} from '~/domains/events/access'
import {
  isEventRoleJudgingEnabled,
  isEventRoleStaffEnabled
} from '~/domains/events/access'

export type EventRosterRole = 'judge' | 'staff' | 'admin'

export interface EventRoleRosterRow extends EventRoleUserSummary {
  assignment: EventRoleAssignment | null
  isAssigned: boolean
  isEventAdmin: boolean
  isInJudgePool: boolean
  isStaff: boolean
}

export type EventRoleRosterBadge = 'admin' | 'staff' | 'judge' | 'platform_admin'

export function isAdminCapableEventUser(
  assignment: EventRoleAssignment | null | undefined,
  user?: EventRoleUserSummary | null
) {
  return assignment?.role === 'event_admin'
    || assignment?.user?.isPlatformAdmin === true
    || user?.isPlatformAdmin === true
}

export function deriveAdminCapableRoleFlags(
  assignment: EventRoleAssignment | null | undefined,
  overrides: Partial<Pick<EventRoleAssignment, 'isInJudgePool' | 'isStaff'>> = {}
) {
  const currentIsInJudgePool = assignment?.role === 'judge' || assignment?.isInJudgePool === true
  const currentIsStaff = assignment?.role === 'staff' || assignment?.isStaff === true

  return {
    isInJudgePool: overrides.isInJudgePool ?? currentIsInJudgePool,
    isStaff: overrides.isStaff ?? currentIsStaff
  }
}

export function listEventRoleRosterBadges(
  row: Pick<EventRoleRosterRow, 'isEventAdmin' | 'isStaff' | 'isInJudgePool' | 'isPlatformAdmin'>
) {
  const badges: EventRoleRosterBadge[] = []

  if (row.isEventAdmin) {
    badges.push('admin')
  }

  if (row.isStaff) {
    badges.push('staff')
  }

  if (row.isInJudgePool) {
    badges.push('judge')
  }

  if (row.isPlatformAdmin) {
    badges.push('platform_admin')
  }

  return badges
}

function compareRosterUsers(
  left: EventRoleUserSummary,
  right: EventRoleUserSummary,
  currentEventAdminIds: Set<string>
) {
  const leftPriority = left.isPlatformAdmin ? 0 : currentEventAdminIds.has(left.id) ? 1 : 2
  const rightPriority = right.isPlatformAdmin ? 0 : currentEventAdminIds.has(right.id) ? 1 : 2

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

function listCurrentEventAdminIds(roleAssignments: EventRoleAssignment[]) {
  return new Set(
    roleAssignments
      .filter(assignment => assignment.role === 'event_admin')
      .map(assignment => assignment.userId)
  )
}

function findRoleAssignment(
  roleAssignments: EventRoleAssignment[],
  userId: string
) {
  return roleAssignments.find(assignment => assignment.userId === userId) ?? null
}

function isAssignedToRoster(
  assignment: EventRoleAssignment | null,
  role: EventRosterRole
) {
  if (!assignment) {
    return false
  }

  if (role === 'admin') {
    return isAdminCapableEventUser(assignment)
  }

  if (role === 'staff') {
    return isEventRoleStaffEnabled(assignment)
  }

  return isEventRoleJudgingEnabled(assignment)
}

export function buildAssignedRoleRosterRows(
  roleAssignments: EventRoleAssignment[],
  role: EventRosterRole
) {
  const currentEventAdminIds = listCurrentEventAdminIds(roleAssignments)

  return roleAssignments
    .filter((assignment): assignment is EventRoleAssignment & { user: EventRoleUserSummary } =>
      isAssignedToRoster(assignment, role) && assignment.user !== undefined
    )
    .map((assignment): EventRoleRosterRow => ({
      ...assignment.user,
      assignment,
      isAssigned: true,
      isEventAdmin: isAdminCapableEventUser(assignment, assignment.user),
      isInJudgePool: assignment.isInJudgePool,
      isStaff: assignment.isStaff
    }))
    .sort((left, right) => compareRosterUsers(left, right, currentEventAdminIds))
}

export function buildRoleRosterRows(
  candidateUsers: EventRoleUserSummary[],
  roleAssignments: EventRoleAssignment[],
  role: EventRosterRole,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase()
  const currentEventAdminIds = listCurrentEventAdminIds(roleAssignments)

  return [...candidateUsers].filter((user) => {
    if (!normalizedQuery) {
      return true
    }

    const haystack = `${user.displayName} ${user.email} ${user.id}`.toLowerCase()
    return haystack.includes(normalizedQuery)
  })
    .sort((left, right) => compareRosterUsers(left, right, currentEventAdminIds))
    .map((user): EventRoleRosterRow => {
      const assignment = findRoleAssignment(roleAssignments, user.id)
      const isEventAdmin = isAdminCapableEventUser(assignment, user)

      return {
        ...user,
        assignment,
        isAssigned: role === 'admin'
          ? isEventAdmin
          : isAssignedToRoster(assignment, role),
        isEventAdmin,
        isInJudgePool: assignment?.isInJudgePool ?? false,
        isStaff: assignment?.isStaff ?? false
      }
    })
}
