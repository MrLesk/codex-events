import type { PublicHackathonState } from '../composables/useHackathonPresentation'

export const accountHackathonWorkspaceTabs = [
  'overview',
  'credits',
  'prizes',
  'details',
  'gallery',
  'judges',
  'staff',
  'workspace',
  'teams',
  'participants',
  'submissions',
  'judging',
  'operations',
  'settings'
] as const

export type AccountHackathonWorkspaceTab = (typeof accountHackathonWorkspaceTabs)[number]

export interface AccountHackathonTabAccessOptions {
  hasApprovedParticipantAccess: boolean
  hasGallery: boolean
  hasPublishedPrizes: boolean
  hackathonState?: PublicHackathonState | null
  canJudge: boolean
  canManage: boolean
  canViewParticipantsAndTeams: boolean
}

export interface AccountHackathonTabAccess {
  availableTabs: AccountHackathonWorkspaceTab[]
  showPrizeConfiguration: boolean
  showAgendaConfigurationInDetails: boolean
}

export interface AccountHackathonWorkspaceBackLink {
  to: string
  label: string
}

const defaultAccountHackathonTabLabels: Record<AccountHackathonWorkspaceTab, string> = {
  overview: 'Overview',
  credits: 'Credits',
  workspace: 'Workspace',
  prizes: 'Prizes',
  details: 'Details',
  gallery: 'Gallery',
  judges: 'Judges',
  staff: 'Staff',
  judging: 'Judging',
  participants: 'Participants',
  teams: 'Teams',
  submissions: 'Submissions',
  operations: 'Operations',
  settings: 'Settings'
}

export function getAccountHackathonTabLabel(
  tab: AccountHackathonWorkspaceTab,
  options?: {
    hackathonState?: PublicHackathonState | null
  }
) {
  if (tab === 'prizes' && options?.hackathonState === 'completed') {
    return 'Winners'
  }

  return defaultAccountHackathonTabLabels[tab]
}

export function canAccessAccountHackathonWorkspace(options: {
  hasAccessRecord: boolean
  canJudge: boolean
  canManage: boolean
  canViewParticipantsAndTeams: boolean
}) {
  return options.hasAccessRecord
    || options.canJudge
    || options.canManage
    || options.canViewParticipantsAndTeams
}

export function resolveAccountHackathonScopedId(options: {
  accessRecordId?: string | null
  hackathonId: string
}) {
  const accessRecordId = options.accessRecordId?.trim() ?? ''
  return accessRecordId.length > 0 ? accessRecordId : options.hackathonId.trim()
}

export function getAccountHackathonWorkspaceBackLink(options: {
  canManage: boolean
  canViewParticipantsAndTeams: boolean
}): AccountHackathonWorkspaceBackLink {
  if (options.canManage) {
    return {
      to: '/account/admin',
      label: 'Back to Admin dashboard'
    }
  }

  if (options.canViewParticipantsAndTeams) {
    return {
      to: '/account/staff',
      label: 'Back to Staff dashboard'
    }
  }

  return {
    to: '/account',
    label: 'Back to my hackathons'
  }
}

export function getAccountHackathonTabAccess(
  options: AccountHackathonTabAccessOptions
): AccountHackathonTabAccess {
  const {
    hasApprovedParticipantAccess,
    hasGallery,
    hasPublishedPrizes,
    hackathonState,
    canJudge,
    canManage,
    canViewParticipantsAndTeams
  } = options
  const availableTabs: AccountHackathonWorkspaceTab[] = ['overview']

  if (hasApprovedParticipantAccess || canManage) {
    availableTabs.push('credits')
  }

  if (hasPublishedPrizes || canManage || hackathonState === 'completed') {
    availableTabs.push('prizes')
  }

  availableTabs.push('details')

  if (canJudge || canManage || canViewParticipantsAndTeams || (hasApprovedParticipantAccess && hasGallery)) {
    availableTabs.push('gallery')
  }

  availableTabs.push('judges', 'staff')

  if (hasApprovedParticipantAccess) {
    availableTabs.push('workspace', 'teams')
  }

  if (canManage || canViewParticipantsAndTeams) {
    availableTabs.push('participants')
  }

  if (canManage) {
    if (!hasApprovedParticipantAccess) {
      availableTabs.push('teams')
    }

    availableTabs.push('submissions')

    if (canJudge) {
      availableTabs.push('judging')
    }

    availableTabs.push('operations', 'settings')
  } else if (canViewParticipantsAndTeams) {
    if (canJudge) {
      availableTabs.push('judging')
    }

    if (!hasApprovedParticipantAccess) {
      availableTabs.push('teams')
    }
  } else if (canJudge) {
    availableTabs.push('judging')
  }

  return {
    availableTabs,
    showPrizeConfiguration: canManage && !['winners_announced', 'completed'].includes(hackathonState ?? ''),
    showAgendaConfigurationInDetails: canManage
  }
}
