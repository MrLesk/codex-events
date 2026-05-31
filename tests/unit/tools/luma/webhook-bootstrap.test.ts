import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, test, vi } from 'vitest'

import {
  analyzeWebhookDrift,
  applyManagedWebhookState,
  checkManagedWebhookState,
  parseCommandMode,
  parseScriptArgs,
  resolveConfig
} from '../../../../tools/luma/webhook-bootstrap'

function createWebhookRecord(overrides: Partial<{
  id: string
  url: string
  event_types: string[]
  status: string
  secret: string
  created_at: string
}> = {}) {
  return {
    api_id: overrides.id ?? 'wh_1',
    id: overrides.id ?? 'wh_1',
    url: overrides.url ?? 'https://test.codex-events.com/api/public/luma/webhooks',
    event_types: overrides.event_types ?? ['guest.updated'],
    status: overrides.status ?? 'active',
    secret: overrides.secret ?? 'whsec_test_secret',
    created_at: overrides.created_at ?? '2026-04-13T19:00:00.000Z'
  }
}

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  })
}

describe('luma webhook bootstrap config', () => {
  test('parses apply mode and optional secret bulk path', () => {
    expect(parseCommandMode('apply')).toBe('apply')
    expect(parseScriptArgs(['apply', '--secret-bulk-path', '.tmp/luma-secret.json'])).toEqual({
      mode: 'apply',
      secretBulkPath: '.tmp/luma-secret.json'
    })
  })

  test('infers the webhook url from an https app base url', () => {
    expect(resolveConfig({
      NUXT_LUMA_API_KEY: 'luma_api_key',
      NUXT_AUTH0_APP_BASE_URL: 'https://test.codex-events.com',
      NUXT_LUMA_API_BASE_URL: 'https://public-api.luma.com'
    })).toEqual({
      apiKey: 'luma_api_key',
      apiBaseUrl: 'https://public-api.luma.com',
      webhookUrl: 'https://test.codex-events.com/api/public/luma/webhooks'
    })
  })

  test('rejects missing webhook url when the app base url is not https', () => {
    expect(() => resolveConfig({
      NUXT_LUMA_API_KEY: 'luma_api_key',
      NUXT_AUTH0_APP_BASE_URL: 'http://localhost:3000'
    })).toThrow('LUMA_WEBHOOK_URL is required')
  })
})

describe('luma webhook drift detection', () => {
  test('flags missing managed webhooks', () => {
    expect(analyzeWebhookDrift([], 'https://test.codex-events.com/api/public/luma/webhooks')).toEqual({
      compliant: false,
      status: 'missing',
      managedWebhookId: null,
      managedWebhookIds: [],
      duplicateWebhookIds: [],
      reasons: ['managed_webhook_missing']
    })
  })

  test('flags mismatched event types and duplicate exact-url hooks', () => {
    const targetUrl = 'https://test.codex-events.com/api/public/luma/webhooks'
    const drift = analyzeWebhookDrift([
      {
        id: 'wh_1',
        url: targetUrl,
        eventTypes: ['guest.registered'],
        status: 'paused',
        secret: 'whsec_primary',
        createdAt: '2026-04-13T19:00:00.000Z'
      },
      {
        id: 'wh_2',
        url: targetUrl,
        eventTypes: ['guest.updated'],
        status: 'active',
        secret: 'whsec_duplicate',
        createdAt: '2026-04-13T19:01:00.000Z'
      }
    ], targetUrl)

    expect(drift).toEqual({
      compliant: false,
      status: 'duplicate',
      managedWebhookId: 'wh_1',
      managedWebhookIds: ['wh_1', 'wh_2'],
      duplicateWebhookIds: ['wh_2'],
      reasons: [
        'managed_webhook_configuration_mismatch',
        'managed_webhook_duplicate_urls'
      ]
    })
  })
})

describe('luma webhook bootstrap execution', () => {
  test('checks paginated webhook lists', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({
        entries: [
          createWebhookRecord({
            id: 'wh_1',
            url: 'https://example.com/not-managed'
          })
        ],
        has_more: true,
        next_cursor: 'cursor_2'
      }))
      .mockResolvedValueOnce(createJsonResponse({
        entries: [
          createWebhookRecord({
            id: 'wh_2'
          })
        ],
        has_more: false
      }))

    const summary = await checkManagedWebhookState({
      apiKey: 'luma_api_key',
      apiBaseUrl: 'https://public-api.luma.com',
      webhookUrl: 'https://test.codex-events.com/api/public/luma/webhooks'
    }, {
      fetchImpl
    })

    expect(summary).toEqual({
      mode: 'check',
      compliant: true,
      webhookUrl: 'https://test.codex-events.com/api/public/luma/webhooks',
      managedWebhookId: 'wh_2',
      managedWebhookIds: ['wh_2'],
      duplicateWebhookIds: [],
      reasons: [],
      driftStatus: 'compliant'
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('https://public-api.luma.com/v1/webhooks/list')
    expect(String(fetchImpl.mock.calls[1]?.[0])).toBe('https://public-api.luma.com/v1/webhooks/list?cursor=cursor_2')
  })

  test('creates a missing managed webhook and writes the secret bulk file', async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), 'luma-webhook-bootstrap-'))
    const secretBulkPath = join(tempDirectory, 'secret.json')
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({
        entries: [],
        has_more: false
      }))
      .mockResolvedValueOnce(createJsonResponse({
        webhook: createWebhookRecord({
          id: 'wh_created',
          secret: 'whsec_created'
        })
      }))
      .mockResolvedValueOnce(createJsonResponse({
        webhook: createWebhookRecord({
          id: 'wh_created',
          secret: 'whsec_created'
        })
      }))

    try {
      const summary = await applyManagedWebhookState({
        apiKey: 'luma_api_key',
        apiBaseUrl: 'https://public-api.luma.com',
        webhookUrl: 'https://test.codex-events.com/api/public/luma/webhooks'
      }, {
        fetchImpl,
        secretBulkPath
      })

      expect(summary).toEqual({
        mode: 'apply',
        compliant: true,
        webhookUrl: 'https://test.codex-events.com/api/public/luma/webhooks',
        managedWebhookId: 'wh_created',
        actions: ['create'],
        secretBulkPathWritten: secretBulkPath
      })

      const createRequest = fetchImpl.mock.calls[1]?.[1]
      expect(String(fetchImpl.mock.calls[1]?.[0])).toBe('https://public-api.luma.com/v1/webhooks/create')
      expect(createRequest?.method).toBe('POST')
      expect(createRequest?.body).toBe(JSON.stringify({
        url: 'https://test.codex-events.com/api/public/luma/webhooks',
        event_types: ['guest.updated']
      }))
      expect(String(fetchImpl.mock.calls[2]?.[0])).toBe('https://public-api.luma.com/v1/webhooks/get?id=wh_created')
      expect(JSON.parse(await readFile(secretBulkPath, 'utf8'))).toEqual({
        NUXT_LUMA_WEBHOOK_SECRET: 'whsec_created'
      })
    } finally {
      await rm(tempDirectory, { recursive: true, force: true })
    }
  })

  test('updates the canonical webhook and deletes duplicate exact-url hooks', async () => {
    const targetUrl = 'https://test.codex-events.com/api/public/luma/webhooks'
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({
        entries: [
          createWebhookRecord({
            id: 'wh_primary',
            status: 'paused',
            event_types: ['guest.registered'],
            secret: 'whsec_primary',
            created_at: '2026-04-13T19:00:00.000Z'
          }),
          createWebhookRecord({
            id: 'wh_duplicate',
            secret: 'whsec_duplicate',
            created_at: '2026-04-13T19:01:00.000Z'
          }),
          createWebhookRecord({
            id: 'wh_other',
            url: 'https://example.com/not-managed'
          })
        ],
        has_more: false
      }))
      .mockResolvedValueOnce(createJsonResponse({
        webhook: createWebhookRecord({
          id: 'wh_primary',
          secret: 'whsec_primary_updated'
        })
      }))
      .mockResolvedValueOnce(createJsonResponse({}))
      .mockResolvedValueOnce(createJsonResponse({
        webhook: createWebhookRecord({
          id: 'wh_primary',
          secret: 'whsec_primary_updated'
        })
      }))

    const summary = await applyManagedWebhookState({
      apiKey: 'luma_api_key',
      apiBaseUrl: 'https://public-api.luma.com',
      webhookUrl: targetUrl
    }, {
      fetchImpl
    })

    expect(summary).toEqual({
      mode: 'apply',
      compliant: true,
      webhookUrl: targetUrl,
      managedWebhookId: 'wh_primary',
      actions: ['update', 'delete_duplicate:wh_duplicate'],
      secretBulkPathWritten: null
    })

    const updateRequest = fetchImpl.mock.calls[1]?.[1]
    const deleteRequest = fetchImpl.mock.calls[2]?.[1]

    expect(String(fetchImpl.mock.calls[1]?.[0])).toBe('https://public-api.luma.com/v1/webhooks/update')
    expect(updateRequest?.body).toBe(JSON.stringify({
      id: 'wh_primary',
      url: targetUrl,
      event_types: ['guest.updated'],
      status: 'active'
    }))
    expect(String(fetchImpl.mock.calls[2]?.[0])).toBe('https://public-api.luma.com/v1/webhooks/delete')
    expect(deleteRequest?.body).toBe(JSON.stringify({
      id: 'wh_duplicate'
    }))
    expect(String(fetchImpl.mock.calls[3]?.[0])).toBe('https://public-api.luma.com/v1/webhooks/get?id=wh_primary')
  })
})
