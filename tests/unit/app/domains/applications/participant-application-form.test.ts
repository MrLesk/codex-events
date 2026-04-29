import { describe, expect, test } from 'vitest'

import { buildParticipantRegistrationFormSchema } from '../../../../../app/domains/applications/participant-application-form'

describe('participant registration form schema', () => {
  const registrationSchema = buildParticipantRegistrationFormSchema({
    profileFields: [],
    maxTeamMembers: 4,
    hasCurrentApplicationTerms: false,
    isInPersonEvent: false,
    requireWhyThisHackathon: false,
    requireProofOfExecution: false
  })

  function createValidRegistrationFormState() {
    return {
      termsAccepted: false,
      inPersonAttendanceCommitment: false,
      teamIntent: 'unknown' as const,
      teamMemberHints: [],
      whyThisHackathon: '',
      proofOfExecutionUrl: '',
      profileForm: {
        firstName: 'Ada',
        familyName: 'Lovelace',
        xProfileUrl: '',
        linkedinProfileUrl: '',
        githubProfileUrl: '',
        chatgptEmail: '',
        openaiOrgId: '',
        lumaEmail: ''
      }
    }
  }

  test('accepts comma-separated proof links', () => {
    const result = registrationSchema.safeParse({
      ...createValidRegistrationFormState(),
      proofOfExecutionUrl: 'https://github.com/example/project, https://demo.example.com/app'
    })

    expect(result.success).toBe(true)
  })

  test('rejects invalid proof links inside a comma-separated list', () => {
    const result = registrationSchema.safeParse({
      ...createValidRegistrationFormState(),
      proofOfExecutionUrl: 'https://github.com/example/project, ftp://example.com/file'
    })

    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.proofOfExecutionUrl).toEqual([
      'Enter valid proof links. Separate multiple links with commas.'
    ])
  })
})
