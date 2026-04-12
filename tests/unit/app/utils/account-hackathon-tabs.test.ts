import { describe, expect, test } from 'vitest'

import {
  canAccessAccountHackathonWorkspace,
  getAccountHackathonTabAccess,
  resolveAccountHackathonScopedId
} from '../../../../app/utils/account-hackathon-tabs'

describe('getAccountHackathonTabAccess', () => {
  test('hides the prizes tab and admin prize configuration for non-admins when no prizes are published', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
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
      hasPublishedPrizes: true,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'team', 'submission', 'prizes', 'details', 'judges', 'staff'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('keeps the prizes tab available to admins even before prizes are published', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'prizes', 'details', 'judges', 'staff', 'participants', 'submissions', 'operations', 'settings'],
      showPrizeConfiguration: true,
      showAgendaConfigurationInDetails: true
    })
  })

  test('shows participant and team visibility tabs to staff without admin operations', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: true,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'team', 'submission', 'details', 'judges', 'staff', 'participants', 'teams'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('preserves judge and admin workspace sections alongside the admin prize configuration surface', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: true,
      hasPublishedPrizes: true,
      canJudge: true,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'team', 'submission', 'prizes', 'details', 'judges', 'staff', 'participants', 'submissions', 'judging', 'operations', 'settings'],
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

  test('keeps participant team tab hidden when the actor has no participant access record', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
      hasPublishedPrizes: true,
      canJudge: true,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'prizes', 'details', 'judges', 'staff', 'judging'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('keeps the team tab hidden when the actor is not approved even if a participant access record exists', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
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

  test('keeps the participant submission tab hidden when the actor is not approved', () => {
    expect(getAccountHackathonTabAccess({
      hasApprovedParticipantAccess: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'details', 'judges', 'staff', 'participants', 'teams'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })
})
