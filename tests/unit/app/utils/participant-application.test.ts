import { describe, expect, test } from 'vitest'

import {
  createParticipantTeamMemberHintRows,
  formatParticipantApplicationStatus,
  getHackathonApplicationAvailabilityMessage,
  getParticipantApplicationSubmissionPolicy,
  getParticipantApplicationStatusColor,
  listMissingRequiredProfileFields,
  normalizeParticipantTeamMemberHintsForSubmission,
  parseParticipantRegistrationDetailsJson,
  summarizeParticipantApplicationStatus
} from '../../../../app/utils/participant-application'

describe('participant application helpers', () => {
  test('lists only the required profile fields missing from the platform account', () => {
    expect(listMissingRequiredProfileFields({
      requireXProfile: true,
      requireLinkedinProfile: true,
      requireGithubProfile: true,
      requireChatgptEmail: true,
      requireOpenaiOrgId: true,
      requireLumaProfile: true
    }, {
      xProfileUrl: null,
      linkedinProfileUrl: 'https://linkedin.com/in/member',
      githubProfileUrl: null,
      chatgptEmail: null,
      openaiOrgId: null,
      lumaUsername: null
    })).toEqual([
      {
        key: 'xProfileUrl',
        label: 'X profile URL'
      },
      {
        key: 'githubProfileUrl',
        label: 'GitHub profile URL'
      },
      {
        key: 'chatgptEmail',
        label: 'ChatGPT email'
      },
      {
        key: 'openaiOrgId',
        label: 'OpenAI org ID'
      },
      {
        key: 'lumaUsername',
        label: 'Luma username'
      }
    ])
  })

  test('formats participant application statuses and summaries for reviewed states', () => {
    expect(formatParticipantApplicationStatus('submitted')).toBe('Submitted')
    expect(formatParticipantApplicationStatus('approved')).toBe('Approved')
    expect(formatParticipantApplicationStatus('rejected')).toBe('Rejected')

    expect(getParticipantApplicationStatusColor('submitted')).toBe('warning')
    expect(getParticipantApplicationStatusColor('approved')).toBe('success')
    expect(getParticipantApplicationStatusColor('rejected')).toBe('error')

    expect(summarizeParticipantApplicationStatus('approved', 'registration_open')).toContain('approved to create a team')
    expect(summarizeParticipantApplicationStatus('rejected', 'registration_open')).toContain('cannot submit another application')
  })

  test('describes whether the hackathon currently allows new applications', () => {
    expect(getHackathonApplicationAvailabilityMessage('registration_open')).toBe('Applications are open for this hackathon.')
    expect(getHackathonApplicationAvailabilityMessage('draft')).toBe('Applications are not available until registration opens.')
    expect(getHackathonApplicationAvailabilityMessage('submission_open')).toBe('Applications are closed for this hackathon.')
  })

  test('returns registration submission policy based on lifecycle, profile, and terms acceptance', () => {
    expect(getParticipantApplicationSubmissionPolicy({
      hackathonState: 'registration_open',
      applicationStatus: null,
      missingRequiredProfileFieldCount: 0,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: true
    })).toEqual({
      isAllowed: true
    })

    expect(getParticipantApplicationSubmissionPolicy({
      hackathonState: 'submission_open',
      applicationStatus: null,
      missingRequiredProfileFieldCount: 0,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: true
    })).toEqual({
      isAllowed: false,
      reason: 'Applications are closed for this hackathon.'
    })

    expect(getParticipantApplicationSubmissionPolicy({
      hackathonState: 'registration_open',
      applicationStatus: null,
      missingRequiredProfileFieldCount: 2,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: true
    })).toEqual({
      isAllowed: false,
      reason: 'Complete the required profile fields before submitting this application.'
    })

    expect(getParticipantApplicationSubmissionPolicy({
      hackathonState: 'registration_open',
      applicationStatus: null,
      missingRequiredProfileFieldCount: 0,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: false
    })).toEqual({
      isAllowed: false,
      reason: 'Accept the current application terms before submitting.'
    })
  })

  test('creates and normalizes team-member hint rows for submission payloads', () => {
    expect(createParticipantTeamMemberHintRows(3)).toEqual([
      { fullName: '', email: '' },
      { fullName: '', email: '' },
      { fullName: '', email: '' }
    ])

    expect(normalizeParticipantTeamMemberHintsForSubmission([
      { fullName: ' Ada Lovelace ', email: 'ada@example.com' },
      { fullName: '', email: '  ' },
      { fullName: 'Grace Hopper', email: '' }
    ], 2)).toEqual([
      { fullName: 'Ada Lovelace', email: 'ada@example.com' },
      { fullName: null, email: null }
    ])
  })

  test('parses persisted registration details JSON with fallback behavior', () => {
    expect(parseParticipantRegistrationDetailsJson(JSON.stringify({
      teamIntent: 'team',
      teamMembers: [
        {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com'
        }
      ]
    }))).toEqual({
      teamIntent: 'team',
      teamMembers: [
        {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com'
        }
      ]
    })

    expect(parseParticipantRegistrationDetailsJson('{invalid-json')).toEqual({
      teamIntent: 'unknown',
      teamMembers: []
    })
  })
})
