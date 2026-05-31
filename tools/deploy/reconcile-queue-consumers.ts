import 'dotenv/config'

import {
  buildDeployQueueConsumerConfigs,
  getGeneratedWranglerConfigPath,
  parseDeployTarget,
  resolveDeployConfigInput,
  type DeployTarget,
  type EnvironmentValues,
  type QueueConsumerConfig
} from './generate-wrangler-config'
import { createWranglerCommandRunner, type CommandRunner } from './wrangler-command'

export type { CommandRunner } from './wrangler-command'

export interface ExistingQueueConsumer {
  consumerId: string
  scriptName?: string
  type?: string
}

export interface QueueConsumerApi {
  listConsumers: (queueName: string) => Promise<ExistingQueueConsumer[]>
  deleteConsumer: (queueName: string, consumerId: string) => Promise<void>
}

interface CloudflareApiEnvelope<T> {
  success?: boolean
  result?: T
  errors?: Array<{
    code?: number
    message?: string
  }>
}

interface CloudflareQueue {
  queue_id?: string
  queue_name?: string
}

interface CloudflareQueueConsumer {
  consumer_id?: string
  script_name?: string
  type?: string
}

function readRequiredEnvironmentValue(environment: EnvironmentValues, name: string) {
  const value = environment[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required to reconcile Queue consumers.`)
  }

  return value
}

function describeCloudflareApiErrors(errors: CloudflareApiEnvelope<unknown>['errors']) {
  return errors?.map(error => [
    error.message,
    error.code ? `code: ${error.code}` : ''
  ].filter(Boolean).join(' ')).filter(Boolean).join('; ') || 'Unknown Cloudflare API error.'
}

async function requestCloudflareApi<T>(
  environment: EnvironmentValues,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const accountId = readRequiredEnvironmentValue(environment, 'CF_ACCOUNT_ID')
  const apiToken = readRequiredEnvironmentValue(environment, 'CF_API_TOKEN')
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${apiToken}`)
  headers.set('Content-Type', 'application/json')
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
    ...init,
    headers
  })
  const payload = await response.json().catch(() => null) as CloudflareApiEnvelope<T> | null

  if (!response.ok || payload?.success === false) {
    throw new Error(describeCloudflareApiErrors(payload?.errors))
  }

  if (!payload || !('result' in payload)) {
    throw new Error('Cloudflare API response did not include a result.')
  }

  return payload.result as T
}

function createCloudflareQueueConsumerApi(environment: EnvironmentValues): QueueConsumerApi {
  const queueIdsByName = new Map<string, string>()

  async function resolveQueueId(queueName: string) {
    const cachedQueueId = queueIdsByName.get(queueName)

    if (cachedQueueId) {
      return cachedQueueId
    }

    const queues = await requestCloudflareApi<CloudflareQueue[]>(environment, '/queues?per_page=100')
    const queue = queues.find(candidate => candidate.queue_name === queueName)

    if (!queue?.queue_id) {
      throw new Error(`Cloudflare Queue "${queueName}" was not found.`)
    }

    queueIdsByName.set(queueName, queue.queue_id)

    return queue.queue_id
  }

  return {
    async listConsumers(queueName) {
      const queueId = await resolveQueueId(queueName)
      const consumers = await requestCloudflareApi<CloudflareQueueConsumer[]>(
        environment,
        `/queues/${queueId}/consumers`
      )

      return consumers.map((consumer) => {
        if (!consumer.consumer_id) {
          throw new Error(`Cloudflare Queue "${queueName}" returned a consumer without an ID.`)
        }

        return {
          consumerId: consumer.consumer_id,
          scriptName: consumer.script_name,
          type: consumer.type
        } satisfies ExistingQueueConsumer
      })
    },
    async deleteConsumer(queueName, consumerId) {
      const queueId = await resolveQueueId(queueName)
      await requestCloudflareApi(environment, `/queues/${queueId}/consumers/${consumerId}`, {
        method: 'DELETE'
      })
    }
  }
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
  consumerApi?: QueueConsumerApi
}) {
  const environment = options.environment ?? process.env
  const runner = options.runner ?? createWranglerCommandRunner(environment)
  const consumerApi = options.consumerApi ?? createCloudflareQueueConsumerApi(environment)
  const input = resolveDeployConfigInput(options.target, environment)
  const configPath = getGeneratedWranglerConfigPath(options.target)
  const consumers = buildDeployQueueConsumerConfigs(input)

  for (const consumer of consumers) {
    for (const existingConsumer of await consumerApi.listConsumers(consumer.queue)) {
      await consumerApi.deleteConsumer(consumer.queue, existingConsumer.consumerId)
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
