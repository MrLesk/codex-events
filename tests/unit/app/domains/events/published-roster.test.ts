import { describe, expect, test } from 'vitest'

import {
  createEmptyPublishedEventRosterLoadState,
  getPublishedEventRosterEndpoint,
  getPublishedEventRosterLinks,
  loadPublishedEventRoster
} from '../../../../../app/domains/events/published-roster'

describe('published event roster helpers', () => {
  test('returns public social links in the published card order', () => {
    expect(getPublishedEventRosterLinks({
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
    expect(getPublishedEventRosterLinks({
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

  test('derives the published roster endpoint from the requested role', () => {
    expect(getPublishedEventRosterEndpoint('judge')).toBe('judges')
    expect(getPublishedEventRosterEndpoint('staff')).toBe('staff')
  })

  test('loads the published roster members through the provided request function', async () => {
    const request = async (path: string) => {
      expect(path).toBe('/api/events/event_1/judges')

      return {
        data: [
          {
            id: 'user_1',
            fullName: 'Judge User',
            company: 'Codex Labs',
            bio: 'Reviews submissions.',
            xProfileUrl: null,
            linkedinProfileUrl: null,
            githubProfileUrl: null,
            profileIconUpdatedAt: null
          }
        ]
      }
    }

    await expect(loadPublishedEventRoster(request, {
      eventId: 'event_1',
      role: 'judge'
    })).resolves.toEqual({
      members: [
        {
          id: 'user_1',
          fullName: 'Judge User',
          company: 'Codex Labs',
          bio: 'Reviews submissions.',
          xProfileUrl: null,
          linkedinProfileUrl: null,
          githubProfileUrl: null,
          profileIconUpdatedAt: null
        }
      ],
      errorMessage: null
    })
  })

  test('returns an empty roster state when the published roster request fails', async () => {
    const request = async () => {
      throw {
        data: {
          error: {
            code: 'request_failed',
            message: 'Judge roster unavailable right now.'
          }
        }
      }
    }

    await expect(loadPublishedEventRoster(request, {
      eventId: 'event_1',
      role: 'judge'
    })).resolves.toEqual({
      members: [],
      errorMessage: 'Judge roster unavailable right now.'
    })
  })

  test('creates an empty roster state for tabs that do not need a published roster fetch', () => {
    expect(createEmptyPublishedEventRosterLoadState()).toEqual({
      members: [],
      errorMessage: null
    })
  })
})
