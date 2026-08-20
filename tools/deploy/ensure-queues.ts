import 'dotenv/config'

import {
  buildDeployQueueResourceNames,
  getGeneratedWranglerConfigPath,
  parseDeployTarget,
  resolveDeployConfigInput,
  type DeployTarget,
  type EnvironmentValues
} from './generate-wrangler-config'
import { createWranglerCommandRunner, type CommandRunner } from './wrangler-command'

export type { CommandRunner } from './wrangler-command'

async function queueExists(runner: CommandRunner, queueName: string, configPath: string) {
  try {
    await runner('bunx', [
      'wrangler',
      'queues',
      'info',
      queueName,
      '--config',
      configPath
    ])
    return true
  } catch {
    return false
  }
}

async function ensureQueue(runner: CommandRunner, queueName: string, configPath: string) {
  if (await queueExists(runner, queueName, configPath)) {
    return false
  }

  try {
    await runner('bunx', [
      'wrangler',
      'queues',
      'create',
      queueName,
      '--config',
      configPath
    ])
  } catch (error) {
    if (await queueExists(runner, queueName, configPath)) {
      return false
    }

    throw error
  }

  return true
}

export async function ensureDeployQueues(options: {
  target: DeployTarget
  environment?: EnvironmentValues
  runner?: CommandRunner
}) {
  const environment = options.environment ?? process.env
  const runner = options.runner ?? createWranglerCommandRunner(environment)
  const input = resolveDeployConfigInput(options.target, environment)
  const configPath = getGeneratedWranglerConfigPath(options.target)
  const queues = buildDeployQueueResourceNames(input)
  const results = []

  for (const queueName of queues) {
    results.push({
      queueName,
      created: await ensureQueue(runner, queueName, configPath)
    })
  }

  return results
}

if (import.meta.main) {
  try {
    const target = parseDeployTarget(process.argv[2])
    const queues = await ensureDeployQueues({ target })

    for (const queue of queues) {
      process.stdout.write(`${queue.created ? 'Created' : 'Found'} Queue ${queue.queueName}.\n`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to ensure Cloudflare Queues.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
