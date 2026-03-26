import { afterEach, describe, expect, test } from 'vitest'

import {
  parseCommandMode,
  parseScriptArgs
} from '../../../tools/platform-admin/bootstrap'

const originalDatabaseBinding = process.env.NUXT_DATABASE_BINDING

afterEach(() => {
  if (originalDatabaseBinding === undefined) {
    delete process.env.NUXT_DATABASE_BINDING
    return
  }

  process.env.NUXT_DATABASE_BINDING = originalDatabaseBinding
})

describe('platform-admin bootstrap script argument parsing', () => {
  test('parses apply mode with an email target', () => {
    expect(parseCommandMode('apply')).toBe('apply')
    expect(parseScriptArgs(['apply', '--email', 'operator@example.com'])).toEqual({
      mode: 'apply',
      email: 'operator@example.com',
      auth0Subject: null,
      bindingName: 'DB'
    })
  })

  test('parses check mode with an auth0 subject target and custom binding', () => {
    expect(parseCommandMode('check')).toBe('check')
    expect(parseScriptArgs([
      'check',
      '--subject',
      'google-oauth2|123456',
      '--binding',
      'CUSTOM_DB'
    ])).toEqual({
      mode: 'check',
      email: null,
      auth0Subject: 'google-oauth2|123456',
      bindingName: 'CUSTOM_DB'
    })
  })

  test('uses NUXT_DATABASE_BINDING as the default binding', () => {
    process.env.NUXT_DATABASE_BINDING = 'WORKER_DB'

    expect(parseScriptArgs(['check', '--email', 'operator@example.com'])).toEqual({
      mode: 'check',
      email: 'operator@example.com',
      auth0Subject: null,
      bindingName: 'WORKER_DB'
    })
  })

  test('rejects invalid argument combinations', () => {
    expect(() => parseScriptArgs(['apply'])).toThrow('Provide either --email or --subject.')
    expect(() => parseScriptArgs([
      'apply',
      '--email',
      'operator@example.com',
      '--subject',
      'auth0|123'
    ])).toThrow('Provide only one target identifier: --email or --subject.')
  })
})
