import { describe, expect, test } from 'vitest'

import {
  canAccessAccountEventWorkspace,
  getAccountEventWorkspaceBackLink,
  getAccountEventTabAccess,
  getAccountEventTabLabel,
  resolveAccountEventScopedId
} from '../../../../../app/domains/events/account-workspace-tabs'

const hackathonOptions = {
  eventType: 'hackathon' as const,
  hasCreditInventory: true,
  hasPublishedStaff: true
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
      hasPublishedStaff: false,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'gallery', 'judges', 'staff', 'feedback', 'participants', 'certificates', 'teams', 'submissions', 'operations', 'settings'],
      showPrizeConfiguration: true,
      showAgendaConfigurationInDetails: true
    })
  })

  test('hides the staff tab from non-admins when no staff are published', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasPublishedStaff: false,
      hasApprovedParticipantAccess: true,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    })).toEqual({
      availableTabs: ['overview', 'credits', 'details', 'judges', 'workspace', 'teams'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: false
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

  test('shows credits to staff only when inventory exists', () => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasCreditInventory: true,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: true
    }).availableTabs).toContain('credits')

    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      hasCreditInventory: false,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: true
    }).availableTabs).not.toContain('credits')
  })

  test.each(['hackathon', 'meetup', 'build'] as const)('shows the feedback tab to judges, staff, and admins only for %s events', (eventType) => {
    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      eventType,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: true,
      canManage: false,
      canViewParticipantsAndTeams: false
    }).availableTabs).toContain('feedback')

    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      eventType,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: true
    }).availableTabs).toContain('feedback')

    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      eventType,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: true,
      canViewParticipantsAndTeams: false
    }).availableTabs).toContain('feedback')

    expect(getAccountEventTabAccess({
      ...hackathonOptions,
      eventType,
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
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'gallery', 'judges', 'staff', 'feedback', 'workspace', 'teams', 'participants', 'certificates', 'submissions', 'judging', 'operations', 'settings'],
      showPrizeConfiguration: true,
      showAgendaConfigurationInDetails: true
    })
  })

  test.each(['meetup', 'build'] as const)('hides competition-only tabs for %s events', (eventType) => {
    expect(getAccountEventTabAccess({
      eventType,
      hasCreditInventory: true,
      hasPublishedStaff: true,
      hasApprovedParticipantAccess: true,
      hasGallery: true,
      hasPublishedPrizes: true,
      eventState: 'completed',
      canJudge: true,
      canManage: true,
      canViewParticipantsAndTeams: true
    })).toEqual({
      availableTabs: ['overview', 'credits', 'details', 'gallery', 'staff', 'feedback', 'participants', 'certificates', 'operations', 'settings'],
      showPrizeConfiguration: false,
      showAgendaConfigurationInDetails: true
    })
  })

  test('shows credits to approved registration-only participants only when inventory exists', () => {
    expect(getAccountEventTabAccess({
      eventType: 'meetup',
      hasCreditInventory: true,
      hasPublishedStaff: true,
      hasApprovedParticipantAccess: true,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    }).availableTabs).toEqual(['overview', 'credits', 'details', 'staff'])

    expect(getAccountEventTabAccess({
      eventType: 'meetup',
      hasCreditInventory: false,
      hasPublishedStaff: true,
      hasApprovedParticipantAccess: true,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: false,
      canViewParticipantsAndTeams: false
    }).availableTabs).toEqual(['overview', 'details', 'staff'])
  })

  test.each(['meetup', 'build'] as const)('shows credits to %s event admins without participant inventory', (eventType) => {
    expect(getAccountEventTabAccess({
      eventType,
      hasCreditInventory: false,
      hasPublishedStaff: false,
      hasApprovedParticipantAccess: false,
      hasGallery: false,
      hasPublishedPrizes: false,
      canJudge: false,
      canManage: true,
      canViewParticipantsAndTeams: false
    }).availableTabs).toContain('credits')
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
      availableTabs: ['overview', 'credits', 'details', 'gallery', 'judges', 'staff', 'feedback', 'participants', 'teams'],
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
      availableTabs: ['overview', 'credits', 'prizes', 'details', 'gallery', 'judges', 'staff', 'feedback', 'workspace', 'teams', 'participants', 'certificates', 'submissions', 'judging', 'operations', 'settings'],
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
