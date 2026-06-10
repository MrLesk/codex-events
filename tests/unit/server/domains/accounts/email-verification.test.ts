import { describe, expect, test, vi } from 'vitest'

import {
  resolveAuth0EmailVerificationConfig,
  sendAuth0VerificationEmail
} from '../../../../../server/domains/accounts/email-verification'
import { ApiError } from '../../../../../server/http/api-error'

function createRuntimeConfig(overrides: Record<string, string | null | undefined> = {}) {
  return {
    auth0: {
      domain: 'codex-events-test.eu.auth0.com',
      clientId: 'application-client-id',
      managementClientId: 'management-client-id',
      managementClientSecret: 'management-client-secret',
      ...overrides
    }
  }
}

describe('Auth0 email verification utilities', () => {
  test('resolves the Auth0 Management API configuration from runtime config', () => {
    expect(resolveAuth0EmailVerificationConfig(createRuntimeConfig({
      domain: 'https://codex-events-test.eu.auth0.com'
    }), {})).toEqual({
      baseUrl: 'https://codex-events-test.eu.auth0.com',
      managementClientId: 'management-client-id',
      managementClientSecret: 'management-client-secret',
      applicationClientId: 'application-client-id'
    })
  })

  test('uses local Auth0 Management environment values when runtime config omits them', () => {
    expect(resolveAuth0EmailVerificationConfig(createRuntimeConfig({
      managementClientId: '',
      managementClientSecret: ''
    }), {
      AUTH0_MGMT_CLIENT_ID: 'local-management-client-id',
      AUTH0_MGMT_CLIENT_SECRET: 'local-management-client-secret'
    })).toMatchObject({
      managementClientId: 'local-management-client-id',
      managementClientSecret: 'local-management-client-secret'
    })
  })

  test('requires Auth0 Management API credentials', () => {
    expect(() => resolveAuth0EmailVerificationConfig(createRuntimeConfig({
      managementClientSecret: ''
    }), {})).toThrow(ApiError)

    try {
      resolveAuth0EmailVerificationConfig(createRuntimeConfig({
        managementClientSecret: ''
      }), {})
    } catch (error) {
      expect(error).toMatchObject({
        code: 'auth0_email_verification_unavailable',
        statusCode: 503
      })
    }
  })

  test('requests a Management API token and creates a verification email job', async () => {
    const requests: Array<{ url: string, init?: RequestInit }> = []
    const fetcher = vi.fn(async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = String(input)
      requests.push({
        url,
        init
      })

      if (url.endsWith('/oauth/token')) {
        return new Response(JSON.stringify({
          access_token: 'management-access-token',
          token_type: 'Bearer',
          expires_in: 86400
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      return new Response(JSON.stringify({
        id: 'job_email_verification',
        type: 'verification_email',
        status: 'pending'
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json'
        }
      })
    }) as unknown as typeof fetch

    await expect(sendAuth0VerificationEmail({
      runtimeConfig: createRuntimeConfig(),
      userId: 'auth0|user_1',
      fetcher
    })).resolves.toEqual({
      id: 'job_email_verification',
      status: 'pending'
    })

    expect(requests).toHaveLength(2)
    expect(requests[0]?.url).toBe('https://codex-events-test.eu.auth0.com/oauth/token')
    expect(String(requests[0]?.init?.body)).toContain('grant_type=client_credentials')
    expect(String(requests[0]?.init?.body)).toContain('audience=https%3A%2F%2Fcodex-events-test.eu.auth0.com%2Fapi%2Fv2%2F')
    expect(requests[1]?.url).toBe('https://codex-events-test.eu.auth0.com/api/v2/jobs/verification-email')
    expect(new Headers(requests[1]?.init?.headers).get('authorization')).toBe('Bearer management-access-token')
    expect(JSON.parse(String(requests[1]?.init?.body))).toEqual({
      user_id: 'auth0|user_1',
      client_id: 'application-client-id'
    })
  })

  test('maps Auth0 request failures to API errors', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: 'too_many_requests',
      errorCode: 'too_many_requests'
    }), {
      status: 429,
      headers: {
        'content-type': 'application/json'
      }
    })) as unknown as typeof fetch

    await expect(sendAuth0VerificationEmail({
      runtimeConfig: createRuntimeConfig(),
      userId: 'auth0|user_1',
      fetcher
    })).rejects.toMatchObject({
      code: 'auth0_email_verification_rate_limited',
      statusCode: 429
    })
  })
})
