import { describe, expect, test } from 'vitest'

import { accountSettingsProfileFormSchema } from '../../../../../app/domains/accounts/profile-forms'

describe('account profile form schemas', () => {
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
})
