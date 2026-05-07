import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, describe, expect, test } from 'vitest'

import {
  parseCommandMode,
  parseScriptArgs,
  readPlatformLegalBootstrapConfig
} from '../../../tools/platform-legal/bootstrap'

const originalDatabaseBinding = process.env.NUXT_DATABASE_BINDING

afterEach(() => {
  if (originalDatabaseBinding === undefined) {
    delete process.env.NUXT_DATABASE_BINDING
    return
  }

  process.env.NUXT_DATABASE_BINDING = originalDatabaseBinding
})

describe('platform legal bootstrap script config', () => {
  test('parses apply mode with a config path', () => {
    expect(parseCommandMode('apply')).toBe('apply')
    expect(parseScriptArgs(['apply', '--config', './legal/platform-legal.json'])).toEqual({
      mode: 'apply',
      configPath: './legal/platform-legal.json',
      bindingName: 'DB'
    })
  })

  test('parses check mode with a custom binding', () => {
    expect(parseCommandMode('check')).toBe('check')
    expect(parseScriptArgs([
      'check',
      '--config',
      './legal/platform-legal.json',
      '--binding',
      'CUSTOM_DB'
    ])).toEqual({
      mode: 'check',
      configPath: './legal/platform-legal.json',
      bindingName: 'CUSTOM_DB'
    })
  })

  test('uses NUXT_DATABASE_BINDING as the default binding', () => {
    process.env.NUXT_DATABASE_BINDING = 'WORKER_DB'

    expect(parseScriptArgs(['check', '--config', './legal/platform-legal.json'])).toEqual({
      mode: 'check',
      configPath: './legal/platform-legal.json',
      bindingName: 'WORKER_DB'
    })
  })

  test('rejects missing config path', () => {
    expect(() => parseScriptArgs(['apply'])).toThrow('Provide --config with the platform legal bootstrap JSON file.')
    expect(() => parseScriptArgs(['apply', '--config'])).toThrow('Missing value for --config.')
  })

  test('reads required settings and document content from json', async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), 'platform-legal-bootstrap-'))
    const configPath = join(tempDirectory, 'platform-legal.json')

    try {
      await writeFile(configPath, JSON.stringify({
        operatorName: 'Example Operator',
        operatorAddress: '1 Example Street',
        supportEmail: 'support@example.com',
        privacyEmail: 'privacy@example.com',
        legalContactLanguages: 'English',
        businessPurpose: 'Running hackathons.',
        editorialLine: 'Hackathon information.',
        imprintContent: 'Example imprint.',
        documents: {
          privacy_policy: {
            title: 'Privacy Policy',
            content: 'Privacy content'
          },
          platform_terms: {
            title: 'Platform Terms',
            content: 'Terms content'
          }
        }
      }))

      expect(readPlatformLegalBootstrapConfig(configPath)).toMatchObject({
        operatorName: 'Example Operator',
        supportEmail: 'support@example.com',
        documents: {
          privacy_policy: {
            title: 'Privacy Policy',
            content: 'Privacy content'
          },
          platform_terms: {
            title: 'Platform Terms',
            content: 'Terms content'
          }
        }
      })
    } finally {
      await rm(tempDirectory, { recursive: true, force: true })
    }
  })
})
