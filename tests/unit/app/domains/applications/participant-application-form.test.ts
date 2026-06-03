import { describe, expect, test } from 'vitest'

import {
  buildParticipantRegistrationFormSchema,
  normalizeParticipantRegistrationProfileForm
} from '../../../../../app/domains/applications/participant-application-form'

describe('participant registration form schema', () => {
  const registrationSchema = buildParticipantRegistrationFormSchema({
    profileFields: [],
    maxTeamMembers: 4,
    hasCurrentApplicationTerms: false,
    isInPersonEvent: false,
    showWhyThisEvent: true,
    requireWhyThisEvent: false,
    showProofOfExecution: true,
    requireProofOfExecution: false,
    showTeamIntent: true,
    requireTeamIntent: false,
    showAiKnowledge: false,
    requireAiKnowledge: false
  })

  function createValidRegistrationFormState() {
    return {
      termsAccepted: false,
      inPersonAttendanceCommitment: false,
      teamIntent: 'unknown' as const,
      teamMemberHints: [],
      whyThisEvent: '',
      proofOfExecutionUrl: '',
      aiKnowledgeLevel: '',
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

  test('normalizes registration profile form values to strings', () => {
    expect(normalizeParticipantRegistrationProfileForm({
      firstName: 'Ada',
      familyName: null,
      githubProfileUrl: 'https://github.com/ada',
      chatgptEmail: 42
    })).toEqual({
      firstName: 'Ada',
      familyName: '',
      xProfileUrl: '',
      linkedinProfileUrl: '',
      githubProfileUrl: 'https://github.com/ada',
      chatgptEmail: '',
      openaiOrgId: '',
      lumaEmail: ''
    })
  })

  test('accepts comma-separated proof links', () => {
    const result = registrationSchema.safeParse({
      ...createValidRegistrationFormState(),
      proofOfExecutionUrl: 'https://github.com/example/project, https://demo.example.com/app'
    })

    expect(result.success).toBe(true)
  })

  test('requires terms acceptance only when event terms exist', () => {
    const withoutTermsResult = registrationSchema.safeParse(createValidRegistrationFormState())
    const withTermsSchema = buildParticipantRegistrationFormSchema({
      profileFields: [],
      maxTeamMembers: 4,
      hasCurrentApplicationTerms: true,
      isInPersonEvent: false,
      showWhyThisEvent: true,
      requireWhyThisEvent: false,
      showProofOfExecution: true,
      requireProofOfExecution: false,
      showTeamIntent: true,
      requireTeamIntent: false,
      showAiKnowledge: false,
      requireAiKnowledge: false
    })
    const withTermsResult = withTermsSchema.safeParse(createValidRegistrationFormState())

    expect(withoutTermsResult.success).toBe(true)
    expect(withTermsResult.success).toBe(false)
    expect(withTermsResult.error?.flatten().fieldErrors.termsAccepted).toEqual([
      'Accept Application Terms to submit.'
    ])
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

  test('ignores hidden proof links and hidden profile fields', () => {
    const schema = buildParticipantRegistrationFormSchema({
      profileFields: [
        {
          key: 'githubProfileUrl',
          label: 'GitHub profile URL',
          visible: false,
          required: false
        }
      ],
      maxTeamMembers: 4,
      hasCurrentApplicationTerms: false,
      isInPersonEvent: false,
      showWhyThisEvent: false,
      requireWhyThisEvent: false,
      showProofOfExecution: false,
      requireProofOfExecution: false,
      showTeamIntent: false,
      requireTeamIntent: false,
      showAiKnowledge: false,
      requireAiKnowledge: false
    })
    const result = schema.safeParse({
      ...createValidRegistrationFormState(),
      proofOfExecutionUrl: 'ftp://example.com/file',
      profileForm: {
        ...createValidRegistrationFormState().profileForm,
        githubProfileUrl: 'not-a-url'
      }
    })

    expect(result.success).toBe(true)
  })

  test('requires participation mode when visible and required', () => {
    const schema = buildParticipantRegistrationFormSchema({
      profileFields: [],
      maxTeamMembers: 4,
      hasCurrentApplicationTerms: false,
      isInPersonEvent: false,
      showWhyThisEvent: false,
      requireWhyThisEvent: false,
      showProofOfExecution: false,
      requireProofOfExecution: false,
      showTeamIntent: true,
      requireTeamIntent: true,
      showAiKnowledge: false,
      requireAiKnowledge: false
    })
    const result = schema.safeParse(createValidRegistrationFormState())

    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.teamIntent).toEqual([
      'Choose how you plan to participate.'
    ])
  })

  test('validates AI Knowledge only when visible', () => {
    const hiddenSchema = buildParticipantRegistrationFormSchema({
      profileFields: [],
      maxTeamMembers: 4,
      hasCurrentApplicationTerms: false,
      isInPersonEvent: false,
      showWhyThisEvent: false,
      requireWhyThisEvent: false,
      showProofOfExecution: false,
      requireProofOfExecution: false,
      showTeamIntent: false,
      requireTeamIntent: false,
      showAiKnowledge: false,
      requireAiKnowledge: false
    })
    const visibleSchema = buildParticipantRegistrationFormSchema({
      profileFields: [],
      maxTeamMembers: 4,
      hasCurrentApplicationTerms: false,
      isInPersonEvent: false,
      showWhyThisEvent: false,
      requireWhyThisEvent: false,
      showProofOfExecution: false,
      requireProofOfExecution: false,
      showTeamIntent: false,
      requireTeamIntent: false,
      showAiKnowledge: true,
      requireAiKnowledge: false
    })
    const requiredSchema = buildParticipantRegistrationFormSchema({
      profileFields: [],
      maxTeamMembers: 4,
      hasCurrentApplicationTerms: false,
      isInPersonEvent: false,
      showWhyThisEvent: false,
      requireWhyThisEvent: false,
      showProofOfExecution: false,
      requireProofOfExecution: false,
      showTeamIntent: false,
      requireTeamIntent: false,
      showAiKnowledge: true,
      requireAiKnowledge: true
    })

    expect(hiddenSchema.safeParse({
      ...createValidRegistrationFormState(),
      aiKnowledgeLevel: 'expert'
    }).success).toBe(true)
    expect(visibleSchema.safeParse({
      ...createValidRegistrationFormState(),
      aiKnowledgeLevel: ''
    }).success).toBe(true)
    expect(visibleSchema.safeParse({
      ...createValidRegistrationFormState(),
      aiKnowledgeLevel: 'advanced'
    }).success).toBe(true)
    expect(visibleSchema.safeParse({
      ...createValidRegistrationFormState(),
      aiKnowledgeLevel: 'expert'
    }).success).toBe(false)
    const requiredResult = requiredSchema.safeParse({
      ...createValidRegistrationFormState(),
      aiKnowledgeLevel: ''
    })

    expect(requiredResult.success).toBe(false)
    expect(requiredResult.error?.flatten().fieldErrors.aiKnowledgeLevel).toEqual([
      'Choose your AI Knowledge level.'
    ])
  })
})
