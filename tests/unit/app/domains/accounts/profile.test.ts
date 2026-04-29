import { describe, expect, test } from 'vitest'

import {
  isAccountProfileUrlValid,
  isAccountSocialProfileUrlValid,
  isOpenAiOrgIdFormatValid,
  normalizeAccountProfileUrl
} from '../../../../../app/domains/accounts/profile'

describe('account profile helpers', () => {
  test('validates OpenAI org ID format used by profile forms', () => {
    expect(isOpenAiOrgIdFormatValid('org_123abc')).toBe(true)
    expect(isOpenAiOrgIdFormatValid('org_regular_user')).toBe(true)
    expect(isOpenAiOrgIdFormatValid('org-123abc')).toBe(true)
    expect(isOpenAiOrgIdFormatValid('')).toBe(false)
  })

  test('normalizes profile URLs by prepending https when scheme is missing', () => {
    expect(normalizeAccountProfileUrl('github.com/codex')).toBe('https://github.com/codex')
    expect(normalizeAccountProfileUrl('https://x.com/codex')).toBe('https://x.com/codex')
    expect(normalizeAccountProfileUrl('')).toBe('')
  })

  test('accepts schema-less profile URLs as valid profile input', () => {
    expect(isAccountProfileUrlValid('github.com/codex')).toBe(true)
    expect(isAccountProfileUrlValid('https://github.com/codex')).toBe(true)
    expect(isAccountProfileUrlValid('nota url')).toBe(false)
  })

  test('validates social profile URL domains by field', () => {
    expect(isAccountSocialProfileUrlValid('githubProfileUrl', 'github.com/codex')).toBe(true)
    expect(isAccountSocialProfileUrlValid('githubProfileUrl', 'github.cox/codex')).toBe(false)
    expect(isAccountSocialProfileUrlValid('linkedinProfileUrl', 'linkedin.com/in/codex')).toBe(true)
    expect(isAccountSocialProfileUrlValid('linkedinProfileUrl', 'example.com/in/codex')).toBe(false)
    expect(isAccountSocialProfileUrlValid('xProfileUrl', 'x.com/codex')).toBe(true)
    expect(isAccountSocialProfileUrlValid('xProfileUrl', 'twitter.com/codex')).toBe(true)
    expect(isAccountSocialProfileUrlValid('xProfileUrl', 'social.example/codex')).toBe(false)
  })
})
