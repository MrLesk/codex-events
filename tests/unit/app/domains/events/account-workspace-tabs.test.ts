import { describe, expect, test } from 'vitest'

import {
  canAccessAccountEventWorkspace,
  getAccountEventWorkspaceBackLink,
  getAccountEventTabAccess,
  getAccountEventTabLabel,
  resolveAccountEventScopedId
} from '../../../../../app/domains/events/account-workspace-tabs'

const hackathonOptions = {
  eventType: 'hackathon' as const
}

describe('getAccountEventTabAccess', () => {
  test('hides the prizes tab and admin prize configuration for non-admins when no prizes are published', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
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
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: true,
      hasGallery: false,
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

  test('shows the gallery tab to approved participants once gallery photos exist', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: true,
      hasGallery: true,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'credits', 'details', 'gallery', 'judges', 'staff', 'workspace', 'teams'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('keeps the prizes tab available to admins even before prizes are published', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'gallery', 'judges', 'staff', 'feedback', 'participants', 'teams', 'submissions', 'operations', 'settings'],
      showPrizeConfiguration: true,
      showAgendaConfigurationInDetails: true
    })
  })

  test('shows participant and team visibility tabs to staff without admin operations', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: true,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'details', 'gallery', 'judges', 'staff', 'feedback', 'workspace', 'teams', 'participants'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('shows the feedback tab to judges, staff, and admins only', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: true,
      canManage: false,
      canViewParticipantsAndTeams: false
    }).availableTabs).toContain('feedback')

    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: true,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    }).availableTabs).not.toContain('feedback')
  })

  test('only actors who already qualify for the canonical participant team panel can access the teams tab', () => {
    const scenarios = [
      {
        ...hackathonOptions,
        hasApprovedParticipantAccess: true,
        hasGallery: false,
        hasPublishedPrizes: false,
        canJudge: false,
        canManage: false,
        canViewParticipantsAndTeams: false
      },
      {
        ...hackathonOptions,
        hasApprovedParticipantAccess: false,
        hasGallery: false,
        hasPublishedPrizes: false,
        canJudge: false,
        canManage: true,
        canViewParticipantsAndTeams: true
      },
      {
        ...hackathonOptions,
        hasApprovedParticipantAccess: false,
        hasGallery: false,
        hasPublishedPrizes: false,
        canJudge: false,
        canManage: false,
        canViewParticipantsAndTeams: true
      },
      {
        ...hackathonOptions,
        hasApprovedParticipantAccess: false,
        hasGallery: false,
        hasPublishedPrizes: false,
        canJudge: true,
        canManage: false,
        canViewParticipantsAndTeams: false
      }
    ] as const

    for (const scenario of scenarios) {
      const access = getAccountEventTabAccess(scenario)
      const canRenderCanonicalTeamsPanel = scenario.hasApprovedParticipantAccess
        || scenario.canManage
        || scenario.canViewParticipantsAndTeams

      expect(access.availableTabs.includes('teams')).toBe(canRenderCanonicalTeamsPanel)
    }
  })

  test('preserves judge and admin workspace sections alongside the admin prize configuration surface', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: true,
      hasGallery: false,
      hasPublishedPrizes: true,
      canJudge: true,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'gallery', 'judges', 'staff', 'feedback', 'workspace', 'teams', 'participants', 'submissions', 'judging', 'operations', 'settings'],
      showPrizeConfiguration: true,
      showAgendaConfigurationInDetails: true
    })
  })

  test('hides competition-only tabs for registration-only events', () => {
    expect(getAccountEventTabAccess({
      eventType: 'meetup',
      hasApprovedParticipantAccess: true,
      hasGallery: true,
      hasPublishedPrizes: true,
      eventState: 'completed',
      canJudge: true,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'details', 'gallery', 'staff', 'participants', 'operations', 'settings'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: true
    })
  })

  test('allows internal workspace access without an account-events record when the actor can manage the draft', () => {
    expect(canAccessAccountEventWorkspace({
      hasAccessRecord: false,
      canJudge: false,
      canManage: true,
      canViewParticipantsAndTeams: false
    })).toBe(true)
  })

  test('falls back to the loaded event id when the account access record is missing', () => {
    expect(resolveAccountEventScopedId({
      accessRecordId: '',
      eventId: 'event_draft_internal'
    })).toBe('event_draft_internal')
  })

  test('routes non-admin staff back to the staff dashboard from the event workspace', () => {
    expect(getAccountEventWorkspaceBackLink({
      canManage: false,
      canViewParticipantsAndTeams: true
    })).toEqual({
      to: '/account/staff',
      label: 'Back to Staff dashboard'
    })
  })

  test('keeps the admin dashboard as the primary back-link when admin access is available', () => {
    expect(getAccountEventWorkspaceBackLink({
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      to: '/account/admin',
      label: 'Back to Admin dashboard'
    })
  })

  test('keeps participant workspace and teams tabs hidden when the actor has no participant access record', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: true,
      canJudge: true,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'prizes', 'details', 'gallery', 'judges', 'staff', 'feedback', 'judging'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('keeps participant workspace hidden when the actor is not approved even if a participant access record exists', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
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
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'details', 'gallery', 'judges', 'staff', 'feedback', 'participants', 'teams'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
    })
  })

  test('renames the prizes tab to winners after winners are published', () => {
    expect(getAccountEventTabLabel('prizes', {
      eventState: 'completed'
    })).toBe('Winners')
    expect(getAccountEventTabLabel('prizes', {
      eventState: 'winners_announced'
    })).toBe('Prizes')
    expect(getAccountEventTabLabel('prizes', {
      eventState: 'pitch_review'
    })).toBe('Prizes')
  })

  test('hides admin prize configuration once winners are announced while keeping the tab available', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: true,
      hasGallery: false,
      hasPublishedPrizes: true,
      eventState: 'winners_announced',
      canJudge: true,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'gallery', 'judges', 'staff', 'feedback', 'workspace', 'teams', 'participants', 'submissions', 'judging', 'operations', 'settings'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: true
    })
  })

  test('keeps the winners tab available after completion even when no prize definitions are published', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasApprovedParticipantAccess: true,
      hasGallery: false,
      hasPublishedPrizes: false,
      eventState: 'completed',
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
