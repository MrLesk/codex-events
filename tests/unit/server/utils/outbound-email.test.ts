import { describe, expect, test } from 'vitest'

import {
  getOutboundEmailReplyTo,
  type OutboundEmailRuntimeConfig
} from '../../../../server/utils/outbound-email'

describe('outbound email runtime config', () => {
  test('uses the explicit reply-to address when configured', () => {
    expect(getOutboundEmailReplyTo({
      outboundEmail: {
        fromEmail: 'notifications@example.com',
        replyTo: 'support@example.com'
      }
    })).toBe('support@example.com')
  })

  test('falls back to the from address when reply-to is empty', () => {
    expect(getOutboundEmailReplyTo({
      outboundEmail: {
        fromEmail: 'notifications@example.com',
        replyTo: ''
      }
    })).toBe('notifications@example.com')
  })

  test('returns null when no outbound address is configured', () => {
    expect(getOutboundEmailReplyTo({} satisfies OutboundEmailRuntimeConfig)).toBeNull()
  })
})
