import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import {
  buildLumaWebhookSignatureHeader,
  extractLumaAttendanceCheckInEvent,
  resolveLumaAttendanceGuestEmail,
  verifyLumaWebhookRequest
} from '../../../../../server/domains/applications/luma-webhooks'

function createEvent(options: {
  headers?: Record<string, string>
  runtimeConfig?: Record<string, unknown>
}) {
  return {
    node: {
      req: {
        headers: options.headers ?? {}
      }
    },
    context: {
      runtimeConfig: options.runtimeConfig ?? {}
    }
  } as H3Event
}

describe('luma webhook utilities', () => {
  test('verifies a valid signed webhook request', async () => {
    const rawBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-123',
        guest: {
          id: 'gst-123',
          user_email: 'guest@example.com',
          checked_in_at: '2026-04-13T17:30:00.000Z'
        }
      }
    })
    const timestamp = '1713030000'
    const signatureHeader = await buildLumaWebhookSignatureHeader('whsec_test', timestamp, rawBody)
    const event = createEvent({
      headers: {
        'webhook-signature': signatureHeader,
        'webhook-id': 'whmsg_123'
      }
    })

    await expect(verifyLumaWebhookRequest(event, rawBody, {
      webhookSecret: 'whsec_test',
      now: new Date(Number.parseInt(timestamp, 10) * 1000),
      maxAgeSeconds: 300
    })).resolves.toEqual({
      webhookId: 'whmsg_123',
      timestamp
    })
  })

  test('rejects an invalid webhook signature', async () => {
    const rawBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-123'
      }
    })
    const timestamp = '1713030000'
    const event = createEvent({
      headers: {
        'webhook-signature': `t=${timestamp},v1=deadbeef`
      }
    })

    await expect(verifyLumaWebhookRequest(event, rawBody, {
      webhookSecret: 'whsec_test',
      now: new Date(Number.parseInt(timestamp, 10) * 1000),
      maxAgeSeconds: 300
    })).rejects.toMatchObject({
      statusCode: 401,
      code: 'luma_webhook_signature_invalid'
    })
  })

  test('extracts a guest check-in from the webhook payload', () => {
    const rawBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event: {
          api_id: 'evt-123'
        },
        guest: {
          api_id: 'gst-123',
          email: 'guest@example.com',
          checked_in_at: '2026-04-13T17:30:00.000Z'
        }
      }
    })

    expect(extractLumaAttendanceCheckInEvent(rawBody)).toEqual({
      envelope: {
        type: 'guest.updated',
        data: {
          event: {
            api_id: 'evt-123'
          },
          guest: {
            api_id: 'gst-123',
            email: 'guest@example.com',
            checked_in_at: '2026-04-13T17:30:00.000Z'
          }
        }
      },
      attendanceEvent: {
        eventApiId: 'evt-123',
        guestId: 'gst-123',
        guestEmail: 'guest@example.com',
        checkedInAt: '2026-04-13T17:30:00.000Z'
      }
    })
  })

  test('falls back to the Luma guest lookup when the webhook payload omits the guest email', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      guest: {
        user_email: 'guest@example.com'
      }
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json'
      }
    }))
    const event = createEvent({
      runtimeConfig: {
        luma: {
          apiBaseUrl: 'https://public-api.luma.com'
        }
      }
    })

    await expect(resolveLumaAttendanceGuestEmail(event, {
      eventApiId: 'evt-123',
      guestId: 'gst-123',
      guestEmail: null
    }, {
      lumaApiKey: 'luma_test_key',
      fetchImpl
    })).resolves.toBe('guest@example.com')
  })
})
