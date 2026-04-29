import { describe, expect, test } from 'vitest'

import { imprintContactFormSchema } from '../../../../../app/domains/platform/legal-contact'

describe('platform legal contact form schema', () => {
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
