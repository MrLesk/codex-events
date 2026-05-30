import { describe, expect, test, vi } from 'vitest'

import {
  classifyCloudflareQueueBatch,
  retryCloudflareQueueBatch
} from '../../../../server/utils/cloudflare-queue-routing'

function createQueueBatch(queue: string) {
  return {
    queue,
    messages: [
      {
        id: 'msg_1',
        retry: vi.fn()
      },
      {
        id: 'msg_2',
        retry: vi.fn()
      }
    ]
  }
}

describe('cloudflare queue routing helpers', () => {
  test('classifies known sibling queues as ignore', () => {
    expect(classifyCloudflareQueueBatch(
      'codex-events-dev-application-review-email-delivery',
      'codex-events-dev-application-luma-sync',
      ['codex-events-dev-application-review-email-delivery']
    )).toBe('ignore')
  })

  test('classifies unknown queues as retry', () => {
    expect(classifyCloudflareQueueBatch(
      'unexpected-queue',
      'codex-events-dev-application-luma-sync',
      ['codex-events-dev-application-review-email-delivery']
    )).toBe('retry')
  })

  test('retries every message in an unexpected batch', () => {
    const batch = createQueueBatch('unexpected-queue')

    retryCloudflareQueueBatch(batch, {
      delaySeconds: 120
    })

    expect(batch.messages[0].retry).toHaveBeenCalledWith({ delaySeconds: 120 })
    expect(batch.messages[1].retry).toHaveBeenCalledWith({ delaySeconds: 120 })
  })
})
