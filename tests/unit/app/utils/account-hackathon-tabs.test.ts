import { describe, expect, test } from 'vitest'

import {
  canAccessAccountHackathonWorkspace,
  getAccountHackathonWorkspaceBackLink,
  getAccountHackathonTabAccess,
  getAccountHackathonTabLabel,
  resolveAccountHackathonScopedId
} from '../../../../app/utils/account-hackathon-tabs'

describe('getAccountHackathonTabAccess', () => {
  test('hides the prizes tab and admin prize configuration for non-admins when no prizes are published', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
      hasPhotos: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'details', 'judges', 'staff'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('shows the prizes tab to participants when published prizes exist, without admin prize configuration', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: true,
      hasPhotos: false,
      hasPublishedPrizes: true,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'judges', 'staff', 'workspace', 'teams'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('shows the photos tab to approved participants once gallery photos exist', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: true,
      hasPhotos: true,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'credits', 'details', 'photos', 'judges', 'staff', 'workspace', 'teams'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('keeps the prizes tab available to admins even before prizes are published', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
      hasPhotos: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'photos', 'judges', 'staff', 'participants', 'teams', 'submissions', 'operations', 'settings'],
      showPrizeConfiguration: true,
      showAgendaConfigurationInDetails: true
    })
  })

  test('shows participant and team visibility tabs to staff without admin operations', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: true,
      hasPhotos: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'details', 'photos', 'judges', 'staff', 'workspace', 'teams', 'participants'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('only actors who already qualify for the canonical participant team panel can access the teams tab', () => {
    const scenarios = [
      {
        hasApprovedParticipantAccess: true,
        hasPhotos: false,
        hasPublishedPrizes: false,
        canJudge: false,
        canManage: false,
        canViewParticipantsAndTeams: false
      },
      {
        hasApprovedParticipantAccess: false,
        hasPhotos: false,
        hasPublishedPrizes: false,
        canJudge: false,
        canManage: true,
        canViewParticipantsAndTeams: true
      },
      {
        hasApprovedParticipantAccess: false,
        hasPhotos: false,
        hasPublishedPrizes: false,
        canJudge: false,
        canManage: false,
        canViewParticipantsAndTeams: true
      },
      {
        hasApprovedParticipantAccess: false,
        hasPhotos: false,
        hasPublishedPrizes: false,
        canJudge: true,
        canManage: false,
        canViewParticipantsAndTeams: false
      }
    ] as const

    for (const scenario of scenarios) {
      const access = getAccountHackathonTabAccess(scenario)
      const canRenderCanonicalTeamsPanel = scenario.hasApprovedParticipantAccess
        || scenario.canManage
        || scenario.canViewParticipantsAndTeams

      expect(access.availableTabs.includes('teams')).toBe(canRenderCanonicalTeamsPanel)
    }
  })

  test('preserves judge and admin workspace sections alongside the admin prize configuration surface', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: true,
      hasPhotos: false,
      hasPublishedPrizes: true,
      canJudge: true,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'photos', 'judges', 'staff', 'workspace', 'teams', 'participants', 'submissions', 'judging', 'operations', 'settings'],
      showPrizeConfiguration: true,
      showAgendaConfigurationInDetails: true
    })
  })

  test('allows internal workspace access without an account-hackathons record when the actor can manage the draft', () => {
    expect(canAccessAccountHackathonWorkspace({
      hasAccessRecord: false,
      canJudge: false,
      canManage: true,
      canViewParticipantsAndTeams: false
    })).toBe(true)
  })

  test('falls back to the loaded hackathon id when the account access record is missing', () => {
    expect(resolveAccountHackathonScopedId({
      accessRecordId: '',
      hackathonId: 'hackathon_draft_internal'
    })).toBe('hackathon_draft_internal')
  })

  test('routes non-admin staff back to the staff dashboard from the hackathon workspace', () => {
    expect(getAccountHackathonWorkspaceBackLink({
      canManage: false,
      canViewParticipantsAndTeams: true
    })).toEqual({
      to: '/account/staff',
      label: 'Back to Staff dashboard'
    })
  })

  test('keeps the admin dashboard as the primary back-link when admin access is available', () => {
    expect(getAccountHackathonWorkspaceBackLink({
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      to: '/account/admin',
      label: 'Back to Admin dashboard'
    })
  })

  test('keeps participant workspace and teams tabs hidden when the actor has no participant access record', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
      hasPhotos: false,
      hasPublishedPrizes: true,
      canJudge: true,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'prizes', 'details', 'photos', 'judges', 'staff', 'judging'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('keeps participant workspace hidden when the actor is not approved even if a participant access record exists', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
      hasPhotos: false,
      hasPublishedPrizes: true,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'prizes', 'details', 'judges', 'staff'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('keeps the participant workspace hidden when the actor is not approved', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
      hasPhotos: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'details', 'photos', 'judges', 'staff', 'participants', 'teams'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('renames the prizes tab to winners after winners are published', () => {
    expect(getAccountHackathonTabLabel('prizes', {
      hackathonState: 'completed'
    })).toBe('Winners')
    expect(getAccountHackathonTabLabel('prizes', {
      hackathonState: 'winners_announced'
    })).toBe('Prizes')
    expect(getAccountHackathonTabLabel('prizes', {
      hackathonState: 'pitch_review'
    })).toBe('Prizes')
  })

  test('hides admin prize configuration once winners are announced while keeping the tab available', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: true,
      hasPhotos: false,
      hasPublishedPrizes: true,
      hackathonState: 'winners_announced',
      canJudge: true,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'photos', 'judges', 'staff', 'workspace', 'teams', 'participants', 'submissions', 'judging', 'operations', 'settings'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: true
    })
  })

  test('keeps the winners tab available after completion even when no prize definitions are published', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: true,
      hasPhotos: false,
      hasPublishedPrizes: false,
      hackathonState: 'completed',
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'judges', 'staff', 'workspace', 'teams'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })
})
