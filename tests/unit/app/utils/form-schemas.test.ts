import { describe, expect, test } from 'vitest'

import { createEmptyHackathonFormState } from '../../../../app/utils/admin-workspace'
import {
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
    requireLumaProfile: false
  }
}

describe('form schemas', () => {
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
