import { describe, expect, test } from 'vitest'

import {
  buildZoneCandidates,
  requiresDnsUpdate,
  resolveVerificationDnsRecord
} from '../../../tools/auth0/auth0-custom-domain'

describe('auth0 custom domain helpers', () => {
  test('builds Cloudflare zone candidates from the full hostname down to the apex', () => {
    expect(buildZoneCandidates('auth.dev.codex-events.com')).toEqual([
      'auth.dev.codex-events.com',
      'dev.codex-events.com',
      'codex-events.com'
    ])
  })

  test('extracts the Auth0-managed-cert verification CNAME record', () => {
    expect(resolveVerificationDnsRecord({
      custom_domain_id: 'cd_123',
      domain: 'auth.codex-events.com',
      primary: false,
      verification: {
        status: 'pending',
        methods: [
          {
            name: 'CNAME',
            domain: 'auth.codex-events.com',
            record: 'codex-events-cd-123.edge.tenants.eu.auth0.com'
          }
        ]
      }
    })).toEqual({
      name: 'auth.codex-events.com',
      content: 'codex-events-cd-123.edge.tenants.eu.auth0.com'
    })
  })

  test('requires a CNAME verification method when Auth0 has not provided one', () => {
    expect(() => resolveVerificationDnsRecord({
      custom_domain_id: 'cd_123',
      domain: 'auth.codex-events.com',
      primary: false,
      verification: {
        status: 'pending',
        methods: [
          {
            name: 'TXT',
            domain: 'auth.codex-events.com',
            record: 'not-supported-here'
          }
        ]
      }
    })).toThrow('missing a CNAME verification method')
  })

  test('only updates Cloudflare when the record does not already match Auth0 verification', () => {
    const desiredRecord = {
      name: 'auth.codex-events.com',
      content: 'codex-events-cd-123.edge.tenants.eu.auth0.com'
    }

    expect(requiresDnsUpdate({
      id: 'record-1',
      type: 'CNAME',
      name: 'auth.codex-events.com',
      content: 'codex-events-cd-123.edge.tenants.eu.auth0.com',
      proxied: false,
      ttl: 1
    }, desiredRecord)).toBe(false)

    expect(requiresDnsUpdate({
      id: 'record-1',
      type: 'CNAME',
      name: 'auth.codex-events.com',
      content: 'wrong.edge.tenants.eu.auth0.com',
      proxied: false,
      ttl: 1
    }, desiredRecord)).toBe(true)
  })
})
