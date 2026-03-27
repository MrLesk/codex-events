import { describe, expect, test } from 'vitest'
import { isProxy, reactive } from 'vue'

import { cloneFormValues } from '../../../../app/utils/form-values'

describe('form-values clone helper', () => {
  test('clones reactive registration models into detached plain values', () => {
    const source = reactive({
      teamIntent: 'team',
      teamMemberHints: reactive([
        { fullName: 'Ada Lovelace', email: 'ada@example.com' },
        { fullName: 'Grace Hopper', email: 'grace@example.com' }
      ]),
      profileForm: reactive({
        firstName: 'Ada',
        familyName: 'Lovelace',
        githubProfileUrl: 'https://github.com/ada'
      })
    })

    const cloned = cloneFormValues(source)

    expect(cloned).toEqual({
      teamIntent: 'team',
      teamMemberHints: [
        { fullName: 'Ada Lovelace', email: 'ada@example.com' },
        { fullName: 'Grace Hopper', email: 'grace@example.com' }
      ],
      profileForm: {
        firstName: 'Ada',
        familyName: 'Lovelace',
        githubProfileUrl: 'https://github.com/ada'
      }
    })
    expect(isProxy(cloned)).toBe(false)
    expect(isProxy(cloned.profileForm)).toBe(false)
    expect(isProxy(cloned.teamMemberHints)).toBe(false)

    cloned.profileForm.firstName = 'Changed'
    cloned.teamMemberHints[0].email = 'updated@example.com'

    expect(source.profileForm.firstName).toBe('Ada')
    expect(source.teamMemberHints[0]?.email).toBe('ada@example.com')
  })

  test('keeps primitive values unchanged', () => {
    expect(cloneFormValues('value')).toBe('value')
    expect(cloneFormValues(5)).toBe(5)
    expect(cloneFormValues(false)).toBe(false)
    expect(cloneFormValues(null)).toBeNull()
    expect(cloneFormValues(undefined)).toBeUndefined()
  })
})
