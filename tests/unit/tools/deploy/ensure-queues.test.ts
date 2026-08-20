import { describe, expect, test } from 'vitest'

import {
  ensureDeployQueues,
  type CommandRunner
} from '../../../../tools/deploy/ensure-queues'

function createEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    BASE_DOMAIN: 'test.example.com',
    CF_ZONE_NAME: 'example.com',
    CF_D1_JURISDICTION: 'eu',
    RESOLVED_D1_DATABASE_ID: '11111111-1111-4111-8111-111111111111',
    NUXT_OUTBOUND_EMAIL_FROM_EMAIL: 'notifications@example.com',
    ...overrides
  }
}

function createRunner(results: Array<string | Error>) {
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

  return { calls, runner }
}

describe('deploy Queue provisioning', () => {
  test('includes the managed-media DLQ in the checked-in queue resource set', async () => {
    const { calls, runner } = createRunner([
      '',
      '',
      '',
      '',
      '',
      ''
    ])

    await expect(ensureDeployQueues({
      target: 'test',
      environment: createEnvironment(),
      runner
    })).resolves.toEqual([
      { queueName: 'codex-events-test-application-review-email-delivery', created: false },
      { queueName: 'codex-events-test-talk-proposal-decision-email-delivery', created: false },
      { queueName: 'codex-events-test-event-outcome-email-delivery', created: false },
      { queueName: 'codex-events-test-application-luma-sync', created: false },
      { queueName: 'codex-events-test-media-cleanup', created: false },
      { queueName: 'codex-events-test-media-cleanup-dlq', created: false }
    ])

    expect(calls).toEqual([
      {
        command: 'bunx',
        args: ['wrangler', 'queues', 'info', 'codex-events-test-application-review-email-delivery', '--config', '.wrangler/generated/test.jsonc']
      },
      {
        command: 'bunx',
        args: ['wrangler', 'queues', 'info', 'codex-events-test-talk-proposal-decision-email-delivery', '--config', '.wrangler/generated/test.jsonc']
      },
      {
        command: 'bunx',
        args: ['wrangler', 'queues', 'info', 'codex-events-test-event-outcome-email-delivery', '--config', '.wrangler/generated/test.jsonc']
      },
      {
        command: 'bunx',
        args: ['wrangler', 'queues', 'info', 'codex-events-test-application-luma-sync', '--config', '.wrangler/generated/test.jsonc']
      },
      {
        command: 'bunx',
        args: ['wrangler', 'queues', 'info', 'codex-events-test-media-cleanup', '--config', '.wrangler/generated/test.jsonc']
      },
      {
        command: 'bunx',
        args: ['wrangler', 'queues', 'info', 'codex-events-test-media-cleanup-dlq', '--config', '.wrangler/generated/test.jsonc']
      }
    ])
  })

  test('creates a missing queue and tolerates a concurrent creator', async () => {
    const { calls, runner } = createRunner([
      new Error('queue not found'),
      '',
      '',
      '',
      '',
      '',
      new Error('queue not found'),
      new Error('queue already exists'),
      ''
    ])

    await expect(ensureDeployQueues({
      target: 'test',
      environment: createEnvironment(),
      runner
    })).resolves.toMatchObject([
      { queueName: 'codex-events-test-application-review-email-delivery', created: true },
      { queueName: 'codex-events-test-talk-proposal-decision-email-delivery', created: false },
      { queueName: 'codex-events-test-event-outcome-email-delivery', created: false },
      { queueName: 'codex-events-test-application-luma-sync', created: false },
      { queueName: 'codex-events-test-media-cleanup', created: false },
      { queueName: 'codex-events-test-media-cleanup-dlq', created: false }
    ])

    expect(calls).toContainEqual({
      command: 'bunx',
      args: ['wrangler', 'queues', 'create', 'codex-events-test-application-review-email-delivery', '--config', '.wrangler/generated/test.jsonc']
    })
    expect(calls).toContainEqual({
      command: 'bunx',
      args: ['wrangler', 'queues', 'create', 'codex-events-test-media-cleanup-dlq', '--config', '.wrangler/generated/test.jsonc']
    })
  })
})
