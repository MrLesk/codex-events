import { describe, expect, test } from 'vitest'

import {
  formatParticipantApplicationStatus,
  getHackathonApplicationAvailabilityMessage,
  getParticipantApplicationStatusColor,
  listMissingRequiredProfileFields,
  summarizeParticipantApplicationStatus
} from '../../../../app/utils/participant-application'

describe('participant application helpers', () => {
  test('lists only the required profile fields missing from the platform account', () => {
    expect(listMissingRequiredProfileFields({
      requireXProfile: true,
      requireLinkedinProfile: true,
      requireGithubProfile: true
    }, {
      xProfileUrl: null,
      linkedinProfileUrl: 'https://linkedin.com/in/member',
      githubProfileUrl: null
    })).toEqual([
      {
        key: 'xProfileUrl',
        label: 'X profile URL'
      },
      {
        key: 'githubProfileUrl',
        label: 'GitHub profile URL'
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
})
