import { describe, expect, test } from 'vitest'

import { getPublishedHackathonRosterLinks } from '../../../../app/utils/hackathon-published-roster'

describe('published hackathon roster helpers', () => {
  test('returns public social links in the published card order', () => {
    expect(getPublishedHackathonRosterLinks({
      id: 'user_1',
      fullName: 'Judge User',
      company: 'Codex Labs',
      bio: 'Reviews submissions.',
      xProfileUrl: ' https://x.com/judge-user ',
      linkedinProfileUrl: 'https://linkedin.com/in/judge-user',
      githubProfileUrl: 'https://github.com/judge-user',
      profileIconUpdatedAt: null
    })).toEqual([
      {
        key: 'x',
        label: 'X',
        href: 'https://x.com/judge-user'
      },
      {
        key: 'linkedin',
        label: 'LinkedIn',
        href: 'https://linkedin.com/in/judge-user'
      },
      {
        key: 'github',
        label: 'GitHub',
        href: 'https://github.com/judge-user'
      }
    ])
  })

  test('omits empty public social links from published cards', () => {
    expect(getPublishedHackathonRosterLinks({
      id: 'user_1',
      fullName: 'Staff User',
      company: null,
      bio: null,
      xProfileUrl: '   ',
      linkedinProfileUrl: null,
      githubProfileUrl: null,
      profileIconUpdatedAt: null
    })).toEqual([])
  })
})
