import { describe, expect, test } from 'vitest'

import { teamProfileFormSchema } from '../../../../../app/domains/teams/team-forms'

describe('team form schemas', () => {
  test('validates and trims team profile bio fields', () => {
    const result = teamProfileFormSchema.safeParse({
      name: '  North Star Team  ',
      bio: '  Building a focused collaboration workspace.\nAcross the full hackathon weekend.  '
    })

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.data).toEqual({
      name: 'North Star Team',
      bio: 'Building a focused collaboration workspace.\nAcross the full hackathon weekend.'
    })
  })
})
