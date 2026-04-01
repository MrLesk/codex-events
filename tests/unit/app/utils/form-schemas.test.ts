import { describe, expect, test } from 'vitest'

import { createEmptyHackathonFormState } from '../../../../app/utils/admin-workspace'
import {
  accountSettingsProfileFormSchema,
  buildParticipantRegistrationFormSchema,
  hackathonConfigFormSchema,
  imprintContactFormSchema
} from '../../../../app/utils/form-schemas'

function createValidHackathonFormState() {
  return {
    ...createEmptyHackathonFormState(),
    name: 'Codex Spring Builders 2026',
    slug: 'codex-spring-builders-2026',
    description: 'Canonical fixture hackathon.',
    city: 'Vienna',
    country: 'Austria',
    address: 'Operngasse 20, 1040 Vienna',
    registrationOpensAt: '2026-03-20T12:00',
    registrationClosesAt: '2026-03-22T12:00',
    submissionOpensAt: '2026-03-22T12:00',
    submissionClosesAt: '2026-03-24T12:00',
    requireChatgptEmail: false,
    requireOpenaiOrgId: false,
    requireLumaEmail: false
  }
}

describe('form schemas', () => {
  test('validates and trims account settings company and bio fields', () => {
    const result = accountSettingsProfileFormSchema.safeParse({
      firstName: '  Ada  ',
      familyName: '  Lovelace  ',
      company: '  Analytical Engines Ltd.  ',
      bio: '  Building thoughtful developer tools.  ',
      xProfileUrl: '',
      linkedinProfileUrl: '',
      githubProfileUrl: '',
      chatgptEmail: '',
      openaiOrgId: '',
      lumaEmail: ''
    })

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.data.company).toBe('Analytical Engines Ltd.')
    expect(result.data.bio).toBe('Building thoughtful developer tools.')
  })

  test('validates imprint contact submissions with trimmed values', () => {
    const result = imprintContactFormSchema.safeParse({
      name: '  Ada Lovelace  ',
      email: '  ada@example.com  ',
      message: '  Hello there.  ',
      website: ''
    })

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.data).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
      website: ''
    })
  })

  test('requires a valid email address for imprint contact submissions', () => {
    const result = imprintContactFormSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'not-an-email',
      message: 'Hello there.',
      website: ''
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.email).toEqual(['Enter a valid email address.'])
  })

  test('requires a non-empty message for imprint contact submissions', () => {
    const result = imprintContactFormSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: '   ',
      website: ''
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.message).toEqual(['Enter a message.'])
  })
})

describe('hackathon config form schema', () => {
  test('allows an empty luma event URL', () => {
    const result = hackathonConfigFormSchema.safeParse(createValidHackathonFormState())

    expect(result.success).toBe(true)
  })

  test('accepts markdown-formatted descriptions', () => {
    const result = hackathonConfigFormSchema.safeParse({
      ...createValidHackathonFormState(),
      description: '  ## Overview\n\n- Build\n- Demo  '
    })

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.data.description).toBe('## Overview\n\n- Build\n- Demo')
  })

  test('rejects non-http luma event URLs', () => {
    const result = hackathonConfigFormSchema.safeParse({
      ...createValidHackathonFormState(),
      lumaEventUrl: 'ftp://lu.ma/codex-builders'
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter a valid Luma event URL.')
  })
})

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
