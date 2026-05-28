import { describe, expect, test } from 'vitest'

import {
  reconcileDeployQueueConsumers,
  type CommandRunner
} from '../../../../tools/deploy/reconcile-queue-consumers'

function createEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    DEPLOY_BASE_DOMAIN: 'dev.example.com',
    DEPLOY_CF_ZONE_NAME: 'example.com',
    DEPLOY_RESOLVED_D1_DATABASE_ID: '11111111-1111-4111-8111-111111111111',
    DEPLOY_AUTH0_CUSTOM_DOMAIN: 'auth.dev.example.com',
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

describe('deploy Queue consumer reconciliation', () => {
  test('removes and recreates desired Worker consumers', async () => {
    const { calls, runner } = createRunner()

    await expect(reconcileDeployQueueConsumers({
      target: 'dev',
      environment: createEnvironment({
        NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS: '60'
      }),
      runner
    })).resolves.toMatchObject({
      workerName: 'dev-codex-events'
    })

    expect(calls).toEqual([
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'remove',
          'dev-codex-events-application-review-email-delivery',
          'dev-codex-events',
          '--config',
          '.wrangler/generated/dev.jsonc'
        ]
      },
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'add',
          'dev-codex-events-application-review-email-delivery',
          'dev-codex-events',
          '--batch-size',
          '10',
          '--batch-timeout',
          '5',
          '--message-retries',
          '10',
          '--retry-delay-secs',
          '60',
          '--config',
          '.wrangler/generated/dev.jsonc'
        ]
      },
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'remove',
          'dev-codex-events-event-outcome-email-delivery',
          'dev-codex-events',
          '--config',
          '.wrangler/generated/dev.jsonc'
        ]
      },
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'add',
          'dev-codex-events-event-outcome-email-delivery',
          'dev-codex-events',
          '--batch-size',
          '10',
          '--batch-timeout',
          '5',
          '--message-retries',
          '10',
          '--retry-delay-secs',
          '120',
          '--config',
          '.wrangler/generated/dev.jsonc'
        ]
      },
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'remove',
          'dev-codex-events-application-luma-sync',
          'dev-codex-events',
          '--config',
          '.wrangler/generated/dev.jsonc'
        ]
      },
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'add',
          'dev-codex-events-application-luma-sync',
          'dev-codex-events',
          '--batch-size',
          '10',
          '--batch-timeout',
          '5',
          '--message-retries',
          '10',
          '--retry-delay-secs',
          '120',
          '--config',
          '.wrangler/generated/dev.jsonc'
        ]
      }
    ])
  })

  test('continues when the Worker consumer is already missing', async () => {
    const { calls, runner } = createRunner([
      new Error('Consumer not found'),
      '',
      new Error('Queue does not have a consumer'),
      '',
      new Error('consumer does not exist'),
      ''
    ])

    await expect(reconcileDeployQueueConsumers({
      target: 'dev',
      environment: createEnvironment(),
      runner
    })).resolves.toMatchObject({
      workerName: 'dev-codex-events'
    })

    expect(calls).toHaveLength(6)
    expect(calls[1]?.args.slice(0, 5)).toEqual([
      'wrangler',
      'queues',
      'consumer',
      'add',
      'dev-codex-events-application-review-email-delivery'
    ])
  })

  test('fails without adding when removing an existing consumer fails unexpectedly', async () => {
    const { calls, runner } = createRunner([
      new Error('Cloudflare API token is missing Queues Edit permission')
    ])

    await expect(reconcileDeployQueueConsumers({
      target: 'dev',
      environment: createEnvironment(),
      runner
    })).rejects.toThrow('Queues Edit permission')

    expect(calls).toEqual([
      {
        command: 'bunx',
        args: [
          'wrangler',
          'queues',
          'consumer',
          'remove',
          'dev-codex-events-application-review-email-delivery',
          'dev-codex-events',
          '--config',
          '.wrangler/generated/dev.jsonc'
        ]
      }
    ])
  })
})
