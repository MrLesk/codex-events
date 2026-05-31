import { describe, expect, test } from 'vitest'

import {
  reconcileDeployQueueConsumers,
  type CommandRunner,
  type ExistingQueueConsumer,
  type QueueConsumerApi
} from '../../../../tools/deploy/reconcile-queue-consumers'

function createEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    BASE_DOMAIN: 'test.example.com',
    CF_ZONE_NAME: 'example.com',
    RESOLVED_D1_DATABASE_ID: '11111111-1111-4111-8111-111111111111',
    AUTH0_CUSTOM_DOMAIN: 'auth.test.example.com',
    NUXT_OUTBOUND_EMAIL_FROM_EMAIL: 'notifications@example.com',
    NUXT_OUTBOUND_EMAIL_REPLY_TO: 'support@example.com',
    ...overrides
  }
}

function createRunner(results: Array<string | Error> = []) {
  const calls: Array<{ command: string, args: string[] }> = []
  const runner: CommandRunner = async (command, args) => {
    calls.push({ command, args })

    const result = results.shift()

    if (result instanceof Error) {
      throw result
    }

    return {
      stdout: result ?? '',
      stderr: ''
    }
  }

  return {
    calls,
    runner
  }
}

function createConsumerApi(options: {
  consumersByQueue?: Record<string, ExistingQueueConsumer[]>
  deleteError?: Error
} = {}) {
  const calls: Array<{
    action: 'list' | 'delete'
    queueName: string
    consumerId?: string
  }> = []
  const consumerApi: QueueConsumerApi = {
    async listConsumers(queueName) {
      calls.push({
        action: 'list',
        queueName
      })

      return options.consumersByQueue?.[queueName] ?? []
    },
    async deleteConsumer(queueName, consumerId) {
      calls.push({
        action: 'delete',
        queueName,
        consumerId
      })

      if (options.deleteError) {
        throw options.deleteError
      }
    }
  }

  return {
    calls,
    consumerApi
  }
}

describe('deploy Queue consumer reconciliation', () => {
  test('removes and recreates desired Worker consumers', async () => {
    const { calls, runner } = createRunner()
    const { calls: apiCalls, consumerApi } = createConsumerApi({
      consumersByQueue: {
        'codex-events-test-application-review-email-delivery': [
          {
            consumerId: 'stale-review-consumer',
            scriptName: 'codex-hackathons-test',
            type: 'worker'
          }
        ],
        'codex-events-test-application-luma-sync': [
          {
            consumerId: 'stale-luma-consumer'
          }
        ]
      }
    })

    await expect(reconcileDeployQueueConsumers({
      target: 'test',
      environment: createEnvironment({
        NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS: '60'
      }),
      runner,
      consumerApi
    })).resolves.toMatchObject({
      workerName: 'codex-events-test'
    })

    expect(apiCalls).toEqual([
      {
        action: 'list',
        queueName: 'codex-events-test-application-review-email-delivery'
      },
      {
        action: 'delete',
        queueName: 'codex-events-test-application-review-email-delivery',
        consumerId: 'stale-review-consumer'
      },
      {
        action: 'list',
        queueName: 'codex-events-test-event-outcome-email-delivery'
      },
      {
        action: 'list',
        queueName: 'codex-events-test-application-luma-sync'
      },
      {
        action: 'delete',
        queueName: 'codex-events-test-application-luma-sync',
        consumerId: 'stale-luma-consumer'
      }
    ])

    expect(calls).toEqual([
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'add',
          'codex-events-test-application-review-email-delivery',
          'codex-events-test',
          '--batch-size',
          '10',
          '--batch-timeout',
          '5',
          '--message-retries',
          '10',
          '--retry-delay-secs',
          '60',
          '--config',
          '.wrangler/generated/test.jsonc'
        ]
      },
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'add',
          'codex-events-test-event-outcome-email-delivery',
          'codex-events-test',
          '--batch-size',
          '10',
          '--batch-timeout',
          '5',
          '--message-retries',
          '10',
          '--retry-delay-secs',
          '120',
          '--config',
          '.wrangler/generated/test.jsonc'
        ]
      },
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'add',
          'codex-events-test-application-luma-sync',
          'codex-events-test',
          '--batch-size',
          '10',
          '--batch-timeout',
          '5',
          '--message-retries',
          '10',
          '--retry-delay-secs',
          '120',
          '--config',
          '.wrangler/generated/test.jsonc'
        ]
      }
    ])
  })

  test('continues when queues have no existing consumers', async () => {
    const { calls, runner } = createRunner()
    const { calls: apiCalls, consumerApi } = createConsumerApi()

    await expect(reconcileDeployQueueConsumers({
      target: 'test',
      environment: createEnvironment(),
      runner,
      consumerApi
    })).resolves.toMatchObject({
      workerName: 'codex-events-test'
    })

    expect(apiCalls).toEqual([
      {
        action: 'list',
        queueName: 'codex-events-test-application-review-email-delivery'
      },
      {
        action: 'list',
        queueName: 'codex-events-test-event-outcome-email-delivery'
      },
      {
        action: 'list',
        queueName: 'codex-events-test-application-luma-sync'
      }
    ])
    expect(calls).toHaveLength(3)
    expect(calls[0]?.args.slice(0, 5)).toEqual([
      'wrangler',
      'queues',
      'consumer',
      'add',
      'codex-events-test-application-review-email-delivery'
    ])
  })

  test('fails without adding when deleting an existing consumer fails unexpectedly', async () => {
    const { calls, runner } = createRunner()
    const { calls: apiCalls, consumerApi } = createConsumerApi({
      consumersByQueue: {
        'codex-events-test-application-review-email-delivery': [
          {
            consumerId: 'stale-review-consumer'
          }
        ]
      },
      deleteError: new Error('Cloudflare API token is missing Queues Edit permission')
    })

    await expect(reconcileDeployQueueConsumers({
      target: 'test',
      environment: createEnvironment(),
      runner,
      consumerApi
    })).rejects.toThrow('Queues Edit permission')

    expect(apiCalls).toEqual([
      {
        action: 'list',
        queueName: 'codex-events-test-application-review-email-delivery'
      },
      {
        action: 'delete',
        queueName: 'codex-events-test-application-review-email-delivery',
        consumerId: 'stale-review-consumer'
      }
    ])
    expect(calls).toEqual([])
  })
})
