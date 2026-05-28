import 'dotenv/config'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import {
  buildDeployQueueConsumerConfigs,
  getGeneratedWranglerConfigPath,
  parseDeployTarget,
  resolveDeployConfigInput,
  type DeployTarget,
  type EnvironmentValues,
  type QueueConsumerConfig
} from './generate-wrangler-config'

const execFileAsync = promisify(execFile)

interface CommandResult {
  stdout: string
  stderr: string
}

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>

async function runCommand(command: string, args: string[]): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, args, {
      env: process.env,
      maxBuffer: 10 * 1024 * 1024
    })

    return {
      stdout: String(result.stdout),
      stderr: String(result.stderr)
    }
  } catch (error) {
    if (error && typeof error === 'object') {
      const output = [
        'stdout' in error ? String(error.stdout ?? '').trim() : '',
        'stderr' in error ? String(error.stderr ?? '').trim() : ''
      ].filter(Boolean).join('\n')

      if (output) {
        throw new Error(output)
      }
    }

    throw error
  }
}

function isMissingConsumerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /not found|does not exist|doesn't exist|does not have a consumer|no consumer/i.test(message)
}

function buildRemoveConsumerArgs(queue: string, workerName: string, configPath: string) {
  return [
    'wrangler',
    'queues',
    'consumer',
    'remove',
    queue,
    workerName,
    '--config',
    configPath
  ]
}

function buildAddConsumerArgs(consumer: QueueConsumerConfig, workerName: string, configPath: string) {
  return [
    'wrangler',
    'queues',
    'consumer',
    'add',
    consumer.queue,
    workerName,
    '--batch-size',
    String(consumer.max_batch_size),
    '--batch-timeout',
    String(consumer.max_batch_timeout),
    '--message-retries',
    String(consumer.max_retries),
    '--retry-delay-secs',
    String(consumer.retry_delay),
    '--config',
    configPath
  ]
}

export async function reconcileDeployQueueConsumers(options: {
  target: DeployTarget
  environment?: EnvironmentValues
  runner?: CommandRunner
}) {
  const environment = options.environment ?? process.env
  const runner = options.runner ?? runCommand
  const input = resolveDeployConfigInput(options.target, environment)
  const configPath = getGeneratedWranglerConfigPath(options.target)
  const consumers = buildDeployQueueConsumerConfigs(input)

  for (const consumer of consumers) {
    try {
      await runner('bunx', buildRemoveConsumerArgs(consumer.queue, input.workerName, configPath))
    } catch (error) {
      if (!isMissingConsumerError(error)) {
        throw error
      }
    }

    await runner('bunx', buildAddConsumerArgs(consumer, input.workerName, configPath))
  }

  return {
    workerName: input.workerName,
    consumers
  }
}

if (import.meta.main) {
  try {
    const target = parseDeployTarget(process.argv[2])
    const result = await reconcileDeployQueueConsumers({ target })
    process.stdout.write(`Reconciled ${result.consumers.length} Queue consumers for ${result.workerName}.\n`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reconcile Queue consumers.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
