interface QueueMessageLike {
  id: string
  retry: (options?: { delaySeconds?: number }) => void
}

interface QueueBatchLike {
  queue: string
  messages: readonly QueueMessageLike[]
}

export type CloudflareQueueBatchRoute = 'handle' | 'ignore' | 'retry'

export function classifyCloudflareQueueBatch(
  batchQueueName: string,
  expectedQueueName: string,
  ignoredQueueNames: readonly string[]
): CloudflareQueueBatchRoute {
  if (batchQueueName === expectedQueueName) {
    return 'handle'
  }

  if (ignoredQueueNames.includes(batchQueueName)) {
    return 'ignore'
  }

  return 'retry'
}

export function retryCloudflareQueueBatch(
  batch: QueueBatchLike,
  options?: {
    delaySeconds?: number
  }
) {
  for (const message of batch.messages) {
    message.retry({
      delaySeconds: options?.delaySeconds
    })
  }
}
